-- Drop the foreign key constraint on sessions.user_id so guest sessions
-- (which use random UUIDs not present in the users table) can be created.
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
