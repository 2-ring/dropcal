-- Migration: Add extensible provider support for auth and calendar connections
-- Run this in Supabase SQL Editor

-- Add auth_providers column (replaces google_id)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_providers JSONB DEFAULT '[]'::jsonb;

-- Add calendar_connections column (separates calendar from auth)
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_connections JSONB DEFAULT '[]'::jsonb;

-- Create index for faster provider lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_providers ON users USING gin(auth_providers);
CREATE INDEX IF NOT EXISTS idx_users_calendar_connections ON users USING gin(calendar_connections);

-- Comment for documentation
COMMENT ON COLUMN users.auth_providers IS 'Array of authentication providers: [{provider: "google", provider_id: "xxx", email: "...", linked_at: "..."}]';
COMMENT ON COLUMN users.calendar_connections IS 'Array of calendar integrations: [{provider: "google_calendar", calendar_id: "primary", tokens_encrypted: true, linked_at: "..."}]';

-- Note: Keep google_id, google_access_token, google_refresh_token for backward compatibility
-- These can be migrated to the new structure and deprecated later
