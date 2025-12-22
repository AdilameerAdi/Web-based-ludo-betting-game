-- Migration: Add winning_balance column to users table
-- Run this in your Supabase SQL editor

-- Add winning_balance column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS winning_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN users.winning_balance IS 'Balance that can be withdrawn. Only game winnings are added here.';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_winning_balance ON users(winning_balance);

