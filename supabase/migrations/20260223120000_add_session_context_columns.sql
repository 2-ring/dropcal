-- Add columns for modification agent context-fetch mechanism.
-- processed_text: preprocessed text fed to EXTRACT (transcription, PDF text, etc.)
-- input_summary: 1-2 sentence description of the original input from EXTRACT
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS processed_text TEXT,
  ADD COLUMN IF NOT EXISTS input_summary TEXT;
