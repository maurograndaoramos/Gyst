-- Add role column to user table
ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'admin' NOT NULL;

-- Set all existing users as admins since they're organization owners
UPDATE user SET role = 'admin' WHERE role IS NULL;
