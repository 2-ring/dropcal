-- Remove guest mode entirely.
-- Deletes any existing guest sessions, drops guest_mode + access_token columns,
-- and rewrites RLS policies that referenced them.

-- ============================================================================
-- 1. Drop existing RLS policies that reference guest_mode / access_token
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;

-- ============================================================================
-- 2. Delete all guest sessions and their orphaned events
-- ============================================================================

-- Events linked to guest sessions (events table has no session_id FK; rows are
-- linked via sessions.event_ids array, and guest events also share the
-- per-session random user_id that isn't in the users table).
DELETE FROM public.events
WHERE id IN (
  SELECT unnest(event_ids)
  FROM public.sessions
  WHERE guest_mode = TRUE
    AND event_ids IS NOT NULL
);

-- Catch any remaining events whose user_id matches a guest session's user_id
DELETE FROM public.events
WHERE user_id IN (
  SELECT user_id FROM public.sessions WHERE guest_mode = TRUE
);

-- The guest sessions themselves
DELETE FROM public.sessions WHERE guest_mode = TRUE;

-- ============================================================================
-- 3. Drop the columns + indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_sessions_guest_mode;
DROP INDEX IF EXISTS idx_sessions_access_token;

ALTER TABLE public.sessions DROP COLUMN IF EXISTS guest_mode;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS access_token;

-- ============================================================================
-- 4. Recreate RLS policies (auth-only, no guest paths)
-- ============================================================================

CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);
