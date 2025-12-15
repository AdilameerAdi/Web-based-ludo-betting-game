-- Create admins table for admin authentication
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- Create game_commissions table to track commission from games
CREATE TABLE IF NOT EXISTS game_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bet_amount DECIMAL(10, 2) NOT NULL,
  commission DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_game_commissions_status ON game_commissions(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_game_commissions_created_at ON game_commissions(created_at DESC);

-- Insert default admin account
-- Username: adil, Password: 123456 (will be hashed)
-- Note: You need to hash the password using bcrypt before inserting
-- For now, we'll create a function to insert with hashed password
-- The password hash for "123456" using bcrypt with salt rounds 10 is approximately:
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Insert admin with hashed password (password: 123456)
-- Hash generated using: node generateAdminPassword.js
INSERT INTO admins (username, password) 
VALUES ('adil', '$2a$10$XDnjaU0cOQooJUcbOq6Wh.Pzo4PQVnGy.VenIeXlPZzE8yqJ1jS2C')
ON CONFLICT (username) DO NOTHING;

-- Create function to automatically update updated_at timestamp for admins
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for admins
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_admins_updated_at();

-- Note: If you need to reset the admin password, generate a new hash using:
-- node generateAdminPassword.js
-- Then run: UPDATE admins SET password = 'NEW_HASH_HERE' WHERE username = 'adil';

