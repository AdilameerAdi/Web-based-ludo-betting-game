/**
 * Admin Reporting Controller
 * Provides comprehensive reporting for games, earnings, and transactions
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Get daily game report
 * @param {Date} date - Date to get report for (defaults to today)
 */
export const getDailyGameReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(reportDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(reportDate.setHours(23, 59, 59, 999)).toISOString();

    // Get all games played today
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('game_results')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (gamesError && gamesError.code !== 'PGRST116') {
      throw gamesError;
    }

    // Get commission data
    const { data: commissions, error: commissionsError } = await supabaseAdmin
      .from('game_commissions')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .eq('status', 'completed');

    if (commissionsError && commissionsError.code !== 'PGRST116') {
      throw commissionsError;
    }

    // Calculate totals
    const totalGames = games?.length || 0;
    const totalCommission = (commissions || []).reduce((sum, c) => sum + (parseFloat(c.commission) || 0), 0);
    const totalStake = (games || []).reduce((sum, g) => sum + (parseFloat(g.bet_amount) || 0) * 2, 0);
    const totalPayout = (games || []).reduce((sum, g) => sum + (parseFloat(g.winner_payout) || 0), 0);

    // Get winners and losers
    const winners = {};
    const losers = {};
    
    (games || []).forEach(game => {
      if (game.winner_id) {
        winners[game.winner_id] = (winners[game.winner_id] || 0) + 1;
      }
      if (game.loser_id) {
        losers[game.loser_id] = (losers[game.loser_id] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        totalGames,
        totalCommission,
        totalStake,
        totalPayout,
        games: games || [],
        commissions: commissions || [],
        winnersCount: Object.keys(winners).length,
        losersCount: Object.keys(losers).length,
        topWinners: Object.entries(winners)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([userId, wins]) => ({ userId, wins }))
      }
    });
  } catch (error) {
    console.error('[Admin] Get daily game report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

/**
 * Get admin earnings summary
 */
export const getAdminEarnings = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = supabaseAdmin
      .from('game_commissions')
      .select('*')
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    const { data: commissions, error } = await query.order('created_at', { ascending: false });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const totalEarnings = (commissions || []).reduce((sum, c) => sum + (parseFloat(c.commission) || 0), 0);
    const totalGames = (commissions || []).length;

    // Daily breakdown
    const dailyBreakdown = {};
    (commissions || []).forEach(commission => {
      const date = commission.created_at.split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { games: 0, earnings: 0 };
      }
      dailyBreakdown[date].games += 1;
      dailyBreakdown[date].earnings += parseFloat(commission.commission) || 0;
    });

    res.json({
      success: true,
      data: {
        totalEarnings,
        totalGames,
        dailyBreakdown: Object.entries(dailyBreakdown)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => b.date.localeCompare(a.date)),
        commissions: commissions || []
      }
    });
  } catch (error) {
    console.error('[Admin] Get admin earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get earnings',
      error: error.message
    });
  }
};

