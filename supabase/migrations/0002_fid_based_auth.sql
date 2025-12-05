BEGIN;

-- Step 1: Drop existing constraints, triggers, and policies that depend on user_id
DROP TRIGGER IF EXISTS matchmaking_queue_try_match ON matchmaking_queue;
DROP INDEX IF EXISTS matchmaking_queue_single_waiting;

-- Drop all RLS policies first (they depend on user_id column)
DROP POLICY IF EXISTS queue_self_insert ON matchmaking_queue;
DROP POLICY IF EXISTS queue_self_select ON matchmaking_queue;
DROP POLICY IF EXISTS queue_self_update ON matchmaking_queue;
DROP POLICY IF EXISTS queue_self_delete ON matchmaking_queue;
DROP POLICY IF EXISTS sessions_participant_select ON game_sessions;
DROP POLICY IF EXISTS sessions_participant_update ON game_sessions;
DROP POLICY IF EXISTS sessions_participant_delete ON game_sessions;

-- Step 2: Update matchmaking_queue table
-- Remove foreign key to auth.users
ALTER TABLE matchmaking_queue DROP CONSTRAINT IF EXISTS matchmaking_queue_user_id_fkey;
-- Change user_id from UUID to BIGINT (fid)
ALTER TABLE matchmaking_queue ALTER COLUMN user_id TYPE BIGINT USING fid;
-- Rename user_id to fid_user_id for clarity (or keep as user_id but it's now fid)
-- Actually, let's keep it as user_id but it will store fid values
-- Add unique constraint on (user_id, status='waiting') using fid
CREATE UNIQUE INDEX IF NOT EXISTS matchmaking_queue_single_waiting_fid
  ON matchmaking_queue(user_id)
  WHERE status = 'waiting';

-- Step 3: Update game_sessions table
-- Remove foreign keys to auth.users
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_player1_id_fkey;
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_player2_id_fkey;
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_winner_id_fkey;
-- Change player IDs from UUID to BIGINT (fid)
ALTER TABLE game_sessions ALTER COLUMN player1_id TYPE BIGINT USING player1_fid;
ALTER TABLE game_sessions ALTER COLUMN player2_id TYPE BIGINT USING player2_fid;
-- For winner_id, we need to map UUID to fid. Since there are no sessions with winners yet, we can set to NULL
-- If there were winners, we'd need: CASE WHEN winner_id = player1_id THEN player1_fid WHEN winner_id = player2_id THEN player2_fid ELSE NULL END
ALTER TABLE game_sessions ALTER COLUMN winner_id TYPE BIGINT USING NULL;

-- Step 4: Create new RLS policies based on fid
-- For matchmaking_queue: Allow service_role or if fid matches
-- Note: We'll use a custom function to get fid from JWT claims
CREATE POLICY queue_self_insert
ON matchmaking_queue FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR 
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint = user_id
);

CREATE POLICY queue_self_select
ON matchmaking_queue FOR SELECT
USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'anon' OR
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint = user_id
);

CREATE POLICY queue_self_update
ON matchmaking_queue FOR UPDATE
USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'anon' OR
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint = user_id
)
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.role() = 'anon' OR
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint = user_id
);

CREATE POLICY queue_self_delete
ON matchmaking_queue FOR DELETE
USING (
  auth.role() = 'service_role' OR 
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint = user_id
);

-- For game_sessions: Allow service_role or if fid matches player1_id or player2_id
CREATE POLICY sessions_participant_select
ON game_sessions FOR SELECT
USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'anon' OR
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint IN (player1_id, player2_id)
);

CREATE POLICY sessions_participant_update
ON game_sessions FOR UPDATE
USING (
  auth.role() = 'service_role' OR 
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint IN (player1_id, player2_id)
)
WITH CHECK (
  auth.role() = 'service_role' OR 
  (current_setting('request.jwt.claims', true)::json->>'fid')::bigint IN (player1_id, player2_id)
);

CREATE POLICY sessions_participant_delete
ON game_sessions FOR DELETE
USING (auth.role() = 'service_role');

-- Step 6: Update try_match_players function to work with fid
CREATE OR REPLACE FUNCTION try_match_players()
RETURNS TRIGGER AS $$
DECLARE
  opponent RECORD;
  new_game_id UUID;
BEGIN
  IF NEW.status <> 'waiting' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO opponent
  FROM matchmaking_queue
  WHERE status = 'waiting'
    AND bet_amount = NEW.bet_amount
    AND user_id <> NEW.user_id  -- Now comparing fid values
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER matchmaking_queue_try_match
AFTER INSERT ON matchmaking_queue
FOR EACH ROW EXECUTE FUNCTION try_match_players();

-- Step 7: Update rpc_submit_move to use fid instead of auth.uid()
CREATE OR REPLACE FUNCTION rpc_submit_move(
  p_session_id UUID,
  p_move move_choice,
  p_signature BYTEA DEFAULT NULL
) RETURNS game_sessions AS $$
DECLARE
  session_record game_sessions%ROWTYPE;
  viewer_fid BIGINT;
BEGIN
  -- Get fid from JWT claims
  viewer_fid := (current_setting('request.jwt.claims', true)::json->>'fid')::bigint;
  
  IF viewer_fid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO session_record
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game session not found';
  END IF;

  IF session_record.status <> 'pending_moves' THEN
    RAISE EXCEPTION 'game not accepting moves';
  END IF;

  IF session_record.expires_at <= timezone('utc', now()) THEN
    UPDATE game_sessions
    SET status = 'timeout'
    WHERE id = p_session_id;
    RETURN (SELECT * FROM game_sessions WHERE id = p_session_id);
  END IF;

  -- Check if viewer is player1 or player2 using fid
  IF viewer_fid = session_record.player1_id THEN
    IF session_record.player1_move IS NOT NULL THEN
      RAISE EXCEPTION 'move already submitted';
    END IF;
    UPDATE game_sessions
    SET player1_move = p_move,
        player1_signature = p_signature
    WHERE id = p_session_id;
  ELSIF viewer_fid = session_record.player2_id THEN
    IF session_record.player2_move IS NOT NULL THEN
      RAISE EXCEPTION 'move already submitted';
    END IF;
    UPDATE game_sessions
    SET player2_move = p_move,
        player2_signature = p_signature
    WHERE id = p_session_id;
  ELSE
    RAISE EXCEPTION 'not a participant';
  END IF;

  IF (SELECT player1_move FROM game_sessions WHERE id = p_session_id) IS NOT NULL
     AND (SELECT player2_move FROM game_sessions WHERE id = p_session_id) IS NOT NULL THEN
    UPDATE game_sessions
    SET status = 'pending_tx'
    WHERE id = p_session_id;
  END IF;

  RETURN (SELECT * FROM game_sessions WHERE id = p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rpc_submit_move IS 'Stores a player move and advances status when both have acted. Uses fid from JWT claims for authentication.';

COMMIT;

