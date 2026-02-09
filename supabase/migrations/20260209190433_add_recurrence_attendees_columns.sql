-- Add top-level recurrence and attendees columns to events table.
-- Previously these lived inside the system_suggestion JSONB blob, which made
-- them impossible to edit without mutating the original pipeline output.

ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT NULL;
