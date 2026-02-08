-- Add versioning and multi-provider sync tracking to events table.
-- `version` increments on every edit. `provider_syncs` tracks per-provider sync state.

ALTER TABLE events ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS provider_syncs JSONB DEFAULT '[]'::jsonb;
