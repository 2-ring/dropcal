-- Add icon column to sessions table for content-based icon selection
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS icon TEXT;
