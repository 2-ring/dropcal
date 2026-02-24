-- Atomic version increment for events to avoid read-modify-write races.
-- Used by Event.increment_version() in the backend.

CREATE OR REPLACE FUNCTION increment_event_version(p_event_id uuid)
RETURNS SETOF events
LANGUAGE sql
AS $$
  UPDATE events
  SET version = COALESCE(version, 1) + 1
  WHERE id = p_event_id
  RETURNING *;
$$;
