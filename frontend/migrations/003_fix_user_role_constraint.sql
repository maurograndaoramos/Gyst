-- Fix user role NOT NULL constraint issue for OAuth users
-- Remove NOT NULL constraint and set proper default value

-- First, create a temporary table with the new schema
CREATE TABLE user_new (
  id TEXT PRIMARY KEY,
  name TEXT,
  username TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER,
  image TEXT,
  password TEXT,
  organizationId TEXT REFERENCES organization(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at INTEGER,
  updated_at INTEGER
);

-- Copy existing data to the new table, ensuring all users have a role
INSERT INTO user_new (
  id, name, username, email, emailVerified, image, password, 
  organizationId, role, created_at, updated_at
)
SELECT 
  id, name, username, email, emailVerified, image, password,
  organizationId, 
  COALESCE(role, 'admin') as role,  -- Ensure all users get admin role
  created_at, updated_at
FROM user;

-- Drop the old table
DROP TABLE user;

-- Rename the new table
ALTER TABLE user_new RENAME TO user;

-- Recreate indexes if any existed (they should be automatically handled by FK constraints)
-- Note: The foreign key constraints will be handled by Drizzle when the app restarts

-- Update any users that might still have NULL roles (safety measure)
UPDATE user SET role = 'admin' WHERE role IS NULL;
