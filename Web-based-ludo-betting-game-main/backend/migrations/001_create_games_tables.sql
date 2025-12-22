-- Migration: Create games and game_actions tables for Ludo game persistence
-- Run this in your Supabase SQL editor

-- Games table - stores game state
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id VARCHAR(255) REFERENCES tables(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    state JSONB NOT NULL,
    bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    prize_pool DECIMAL(10, 2) NOT NULL DEFAULT 0,
    commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
    player1_id UUID REFERENCES users(id) ON DELETE SET NULL,
    player2_id UUID REFERENCES users(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_table ON games(table_id);
CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at DESC);

-- Game actions table - audit log for all game actions
CREATE TABLE IF NOT EXISTS game_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_index INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_actions_game ON game_actions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_type ON game_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_game_actions_created ON game_actions(created_at);

-- Game commissions table - tracks commission from games
CREATE TABLE IF NOT EXISTS game_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    table_id VARCHAR(255),
    total_pool DECIMAL(10, 2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for commission tracking
CREATE INDEX IF NOT EXISTS idx_game_commissions_game ON game_commissions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_commissions_created ON game_commissions(created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on games table
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_commissions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own games
CREATE POLICY "Users can view their own games"
    ON games FOR SELECT
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Allow service role full access
CREATE POLICY "Service role has full access to games"
    ON games FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to game_actions"
    ON game_actions FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to game_commissions"
    ON game_commissions FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON games TO service_role;
GRANT ALL ON game_actions TO service_role;
GRANT ALL ON game_commissions TO service_role;
GRANT SELECT ON games TO authenticated;
GRANT SELECT ON game_actions TO authenticated;

-- View for game statistics
CREATE OR REPLACE VIEW user_game_stats AS
SELECT
    u.id as user_id,
    COUNT(g.id) as total_games,
    COUNT(CASE WHEN g.winner_id = u.id THEN 1 END) as wins,
    COUNT(CASE WHEN g.winner_id IS NOT NULL AND g.winner_id != u.id THEN 1 END) as losses,
    COALESCE(SUM(CASE WHEN g.winner_id = u.id THEN g.prize_pool ELSE 0 END), 0) as total_winnings,
    COALESCE(SUM(CASE WHEN g.winner_id != u.id OR g.winner_id IS NULL THEN g.bet_amount ELSE 0 END), 0) as total_losses
FROM users u
LEFT JOIN games g ON (g.player1_id = u.id OR g.player2_id = u.id) AND g.status = 'finished'
GROUP BY u.id;

COMMENT ON TABLE games IS 'Stores Ludo game state for persistence and recovery';
COMMENT ON TABLE game_actions IS 'Audit log for all game actions - useful for replay and dispute resolution';
COMMENT ON TABLE game_commissions IS 'Tracks commission earned from each game';
