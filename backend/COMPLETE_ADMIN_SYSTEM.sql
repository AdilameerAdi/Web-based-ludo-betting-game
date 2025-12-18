-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPLETE ADMIN SYSTEM DATABASE SCHEMA
-- Ludo Betting Game - Production Ready Admin System
-- ═══════════════════════════════════════════════════════════════════════════════

-- This script is safe to run multiple times - it drops and recreates everything

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: DROP ALL VIEWS FIRST (they depend on tables)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS today_stats CASCADE;
DROP VIEW IF EXISTS commission_summary CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: DROP ALL TABLES (in correct order due to foreign keys)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS game_commissions CASCADE;
DROP TABLE IF EXISTS game_results CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: CREATE ADMINS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admins_username ON admins(username);

-- Insert default admin (password: 123456)
INSERT INTO admins (username, password)
VALUES ('adil', '$2a$10$4IuKgTNe0il7myzWyN5jKuqysfe8wHybZwGJQK9zZRz0LP2GKwLT2');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: CREATE GAME COMMISSIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE game_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL,
  table_id VARCHAR(255),
  winner_id UUID,
  loser_id UUID,
  bet_amount DECIMAL(10, 2) NOT NULL,
  total_pot DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5, 4) DEFAULT 0.20,
  commission DECIMAL(10, 2) NOT NULL,
  winner_payout DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_commissions_status ON game_commissions(status);
CREATE INDEX idx_game_commissions_created_at ON game_commissions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: CREATE GAME RESULTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL,
  table_id VARCHAR(255),
  table_type VARCHAR(20) DEFAULT 'default',
  player1_id UUID,
  player2_id UUID,
  winner_id UUID,
  loser_id UUID,
  bet_amount DECIMAL(10, 2),
  winner_payout DECIMAL(10, 2),
  commission DECIMAL(10, 2),
  result_type VARCHAR(50),
  game_duration_seconds INTEGER,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_results_created_at ON game_results(created_at DESC);
CREATE INDEX idx_game_results_winner ON game_results(winner_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: CREATE PAYMENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  order_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'paytm',
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7: CREATE WITHDRAWALS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'paytm',
  account_details JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 8: CREATE WALLET TRANSACTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 9: CREATE ADMIN AUDIT LOGS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  admin_username VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(100),
  target_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 10: CREATE SYSTEM SETTINGS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('commission_rate', '0.20', 'Commission rate as decimal (0.20 = 20%)'),
  ('min_withdrawal', '100', 'Minimum withdrawal amount in INR'),
  ('max_withdrawal', '50000', 'Maximum withdrawal amount in INR'),
  ('min_bet', '10', 'Minimum bet amount in INR'),
  ('max_bet', '10000', 'Maximum bet amount in INR');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 11: CREATE DAILY REPORTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_stake_volume DECIMAL(12, 2) DEFAULT 0,
  total_commission DECIMAL(12, 2) DEFAULT 0,
  total_deposits DECIMAL(12, 2) DEFAULT 0,
  total_withdrawals_requested DECIMAL(12, 2) DEFAULT 0,
  total_withdrawals_completed DECIMAL(12, 2) DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 12: CREATE UPDATE TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 13: CREATE HELPER VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE VIEW today_stats AS
SELECT
  (SELECT COUNT(*) FROM game_results WHERE DATE(created_at) = CURRENT_DATE) as games_today,
  (SELECT COALESCE(SUM(commission), 0) FROM game_commissions WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') as commission_today,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(created_at) = CURRENT_DATE AND status IN ('TXN_SUCCESS', 'success', 'SUCCESS')) as deposits_today,
  (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals,
  (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'pending') as pending_withdrawal_amount;

CREATE VIEW commission_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as games,
  SUM(bet_amount) as total_stakes,
  SUM(commission) as total_commission,
  SUM(winner_payout) as total_payouts
FROM game_commissions
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Verify the setup
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'SUCCESS! Admin system tables created.' as result;
SELECT id, username, is_active FROM admins;
