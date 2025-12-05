BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'matchmaking_status') THEN
    CREATE TYPE matchmaking_status AS ENUM ('waiting', 'matched', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
    CREATE TYPE game_status AS ENUM ('pending_moves', 'pending_tx', 'finished', 'timeout', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'move_choice') THEN
    CREATE TYPE move_choice AS ENUM ('rock', 'paper', 'scissors');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_fid BIGINT NOT NULL CHECK (player1_fid > 0),
  player2_fid BIGINT NOT NULL CHECK (player2_fid > 0),
  bet_amount NUMERIC(12,2) NOT NULL CHECK (bet_amount IN (5,10,25,50,100,250,500,1000)),
  chain_game_id TEXT UNIQUE,
  status game_status NOT NULL DEFAULT 'pending_moves',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_move move_choice,
  player2_move move_choice,
  player1_signature BYTEA,
  player2_signature BYTEA,
  fee_snapshot NUMERIC(12,2),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fid BIGINT NOT NULL CHECK (fid > 0),
  bet_amount NUMERIC(12,2) NOT NULL CHECK (bet_amount IN (5,10,25,50,100,250,500,1000)),
  status matchmaking_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()) + interval '5 minutes',
  session_id UUID REFERENCES game_sessions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS matchmaking_queue_single_waiting
  ON matchmaking_queue(user_id)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS matchmaking_queue_bet_status_created_idx
  ON matchmaking_queue(bet_amount, status, created_at);

CREATE INDEX IF NOT EXISTS game_sessions_status_idx
  ON game_sessions(status);

CREATE INDEX IF NOT EXISTS game_sessions_chain_game_idx
  ON game_sessions(chain_game_id);

CREATE OR REPLACE FUNCTION set_timestamp_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS matchmaking_queue_set_updated ON matchmaking_queue;
CREATE TRIGGER matchmaking_queue_set_updated
BEFORE UPDATE ON matchmaking_queue
FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated();

DROP TRIGGER IF EXISTS game_sessions_set_updated ON game_sessions;
CREATE TRIGGER game_sessions_set_updated
BEFORE UPDATE ON game_sessions
FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated();

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
    AND user_id <> NEW.user_id
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
    opponent.user_id,
    NEW.user_id,
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

DROP TRIGGER IF EXISTS matchmaking_queue_try_match ON matchmaking_queue;
CREATE TRIGGER matchmaking_queue_try_match
AFTER INSERT ON matchmaking_queue
FOR EACH ROW EXECUTE FUNCTION try_match_players();

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY queue_self_insert
ON matchmaking_queue FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY queue_self_select
ON matchmaking_queue FOR SELECT
USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY queue_self_update
ON matchmaking_queue FOR UPDATE
USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
)
WITH CHECK (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY queue_self_delete
ON matchmaking_queue FOR DELETE
USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);

CREATE POLICY sessions_participant_select
ON game_sessions FOR SELECT
USING (
  auth.role() = 'service_role' OR auth.uid() IN (player1_id, player2_id)
);

CREATE POLICY sessions_participant_update
ON game_sessions FOR UPDATE
USING (
  auth.role() = 'service_role' OR auth.uid() IN (player1_id, player2_id)
)
WITH CHECK (
  auth.role() = 'service_role' OR auth.uid() IN (player1_id, player2_id)
);

CREATE POLICY sessions_participant_delete
ON game_sessions FOR DELETE
USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION rpc_submit_move(
  p_session_id UUID,
  p_move move_choice,
  p_signature BYTEA DEFAULT NULL
) RETURNS game_sessions AS $$
DECLARE
  session_record game_sessions%ROWTYPE;
  viewer UUID := auth.uid();
BEGIN
  IF viewer IS NULL THEN
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

  IF viewer = session_record.player1_id THEN
    IF session_record.player1_move IS NOT NULL THEN
      RAISE EXCEPTION 'move already submitted';
    END IF;
    UPDATE game_sessions
    SET player1_move = p_move,
        player1_signature = p_signature
    WHERE id = p_session_id;
  ELSIF viewer = session_record.player2_id THEN
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

COMMENT ON FUNCTION rpc_submit_move IS 'Stores a player move and advances status when both have acted.';

COMMIT;

