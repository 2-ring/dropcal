-- Drop the foreign key constraint on events.user_id so guest sessions
-- (which use random UUIDs not present in the users table) can create events.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
