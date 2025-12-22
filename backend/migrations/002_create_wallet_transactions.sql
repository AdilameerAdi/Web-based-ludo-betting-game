-- Create wallet_transactions table for audit logging
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  reference_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_id ON wallet_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Create composite index for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_ref 
  ON wallet_transactions(reference_id, type) 
  WHERE reference_id IS NOT NULL;

COMMENT ON TABLE wallet_transactions IS 'Audit log for all wallet transactions';
COMMENT ON COLUMN wallet_transactions.type IS 'Transaction type: add_funds, game_win, game_bet, withdrawal_request, withdrawal_refund';
COMMENT ON COLUMN wallet_transactions.amount IS 'Positive for credit, negative for debit';
COMMENT ON COLUMN wallet_transactions.reference_id IS 'Reference to order_id, game_id, withdrawal_id, etc.';

