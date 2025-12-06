-- Migration: Add Realtime Broadcast for matchmaking
-- This improves reliability and reduces latency compared to Postgres Changes

BEGIN;

-- Update try_match_players function to send Broadcast messages when match is found
CREATE OR REPLACE FUNCTION try_match_players()
RETURNS TRIGGER AS $$
DECLARE
  opponent RECORD;
  new_game_id UUID;
  session_data JSONB;
BEGIN
  IF NEW.status <> 'waiting' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO opponent
  FROM matchmaking_queue
  WHERE status = 'waiting'
    AND bet_amount = NEW.bet_amount
    AND user_id <> NEW.user_id  -- Prevent self-matching
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF opponent.id IS NULL THEN
    RETURN NEW;
  END IF;

  new_game_id := gen_random_uuid();

  INSERT INTO game_sessions (
    id,
    player1_id,
    player2_id,
    player1_fid,
    player2_fid,
    bet_amount,
    status,
    expires_at
  ) VALUES (
    new_game_id,
    opponent.user_id,  -- Now stores fid
    NEW.user_id,       -- Now stores fid
    opponent.fid,
    NEW.fid,
    NEW.bet_amount,
    'pending_moves',
    timezone('utc', now()) + interval '7 minutes'
  );

  UPDATE matchmaking_queue
  SET status = 'matched',
      session_id = new_game_id,
      updated_at = timezone('utc', now())
  WHERE id IN (NEW.id, opponent.id);

  -- Prepare session data for Broadcast
  SELECT jsonb_build_object(
    'session_id', new_game_id,
    'status', 'matched',
    'bet_amount', NEW.bet_amount,
    'player1_id', opponent.user_id,
    'player2_id', NEW.user_id
  ) INTO session_data;

  -- Send Broadcast to both players using their unique queue IDs
  -- Each player only listens to their own queue ID topic
  PERFORM realtime.send(
    session_data,                    -- Payload
    'match_found',                   -- Event name
    'queue:' || NEW.id::text,        -- Topic for NEW player (their queue ID)
    true                             -- Private channel (requires auth)
  );

  PERFORM realtime.send(
    session_data,                    -- Payload
    'match_found',                   -- Event name
    'queue:' || opponent.id::text,   -- Topic for opponent (their queue ID)
    true                             -- Private channel (requires auth)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION try_match_players IS 'Matches players and sends Realtime Broadcast messages to both players using their unique queue IDs. Each player only receives messages for their own queue ID.';

COMMIT;

