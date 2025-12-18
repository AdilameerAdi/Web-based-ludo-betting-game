/**
 * Game Service
 * Handles database operations for game state persistence
 */

import { supabase } from '../../config/supabase.js';
import { COMMISSION_RATE } from '../utils/constants.js';

/**
 * Save game state to database
 * @param {Object} state - Game state to save
 * @returns {Promise<Object>} - Save result
 */
export async function saveGameState(state) {
  try {
    const { data, error } = await supabase
      .from('games')
      .upsert({
        id: state.gameId,
        table_id: state.tableId,
        status: state.status,
        state: state,
        bet_amount: state.betAmount,
        prize_pool: state.prizePool,
        commission: state.commission,
        player1_id: state.players[0]?.odId,
        player2_id: state.players[1]?.odId,
        winner_id: state.winner?.odId || null,
        created_at: new Date(state.createdAt).toISOString(),
        updated_at: new Date().toISOString(),
        finished_at: state.endedAt ? new Date(state.endedAt).toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving game state:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception saving game state:', err);
    return { success: false, error: err };
  }
}

/**
 * Load game state from database
 * @param {string} gameId - Game ID
 * @returns {Promise<Object>} - Game state or null
 */
export async function loadGameState(gameId) {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('state')
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Error loading game state:', error);
      return null;
    }

    return data?.state || null;
  } catch (err) {
    console.error('Exception loading game state:', err);
    return null;
  }
}

/**
 * Get active game for a user
 * @param {string} odId - User ID
 * @returns {Promise<Object>} - Active game state or null
 */
export async function getActiveGameForUser(odId) {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('state')
      .or(`player1_id.eq.${odId},player2_id.eq.${odId}`)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding active game:', error);
      return null;
    }

    return data?.state || null;
  } catch (err) {
    console.error('Exception finding active game:', err);
    return null;
  }
}

/**
 * Save game action to audit log
 * @param {string} gameId - Game ID
 * @param {Object} action - Action data
 * @returns {Promise<Object>} - Save result
 */
export async function logGameAction(gameId, action) {
  try {
    const { data, error } = await supabase
      .from('game_actions')
      .insert({
        game_id: gameId,
        player_index: action.playerIndex,
        action_type: action.type,
        action_data: action,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging game action:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception logging game action:', err);
    return { success: false, error: err };
  }
}

/**
 * Save game result to game_results table
 * @param {Object} state - Final game state with winner
 * @returns {Promise<Object>} - Save result
 */
export async function saveGameResult(state) {
  if (!state.winner) {
    return { success: false, error: 'No winner to save game result' };
  }

  try {
    const winnerId = state.winner.odId;
    const loser = state.players.find(p => p.odId !== winnerId);
    const loserId = loser?.odId || null;
    const player1Id = state.players[0]?.odId || null;
    const player2Id = state.players[1]?.odId || null;

    // Calculate game duration
    const gameDurationSeconds = state.endedAt && state.startedAt
      ? Math.floor((state.endedAt - state.startedAt) / 1000)
      : null;

    // Determine result type
    let resultType = 'normal_win';
    if (state.winner.reason === 'forfeit') {
      resultType = 'forfeit';
    } else if (state.winner.reason === 'opponent_disconnect') {
      resultType = 'timeout';
    }

    const { error } = await supabase
      .from('game_results')
      .insert({
        game_id: state.gameId,
        table_id: state.tableId,
        table_type: 'default',
        player1_id: player1Id,
        player2_id: player2Id,
        winner_id: winnerId,
        loser_id: loserId,
        bet_amount: state.betAmount,
        winner_payout: state.prizePool,
        commission: state.commission,
        result_type: resultType,
        game_duration_seconds: gameDurationSeconds,
        status: 'completed',
        created_at: new Date(state.createdAt).toISOString(),
        completed_at: state.endedAt ? new Date(state.endedAt).toISOString() : new Date().toISOString()
      });

    if (error) {
      console.error('Error saving game result:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception saving game result:', err);
    return { success: false, error: err };
  }
}

/**
 * Process winner payout
 * @param {Object} state - Final game state with winner
 * @returns {Promise<Object>} - Payout result
 */
export async function processWinnerPayout(state) {
  if (!state.winner) {
    return { success: false, error: 'No winner to pay' };
  }

  try {
    const winnerId = state.winner.odId;
    const prizeAmount = state.prizePool;

    // Get current balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', winnerId)
      .single();

    if (userError) {
      console.error('Error getting winner balance:', userError);
      return { success: false, error: userError };
    }

    // Update balance
    const newBalance = (userData.balance || 0) + prizeAmount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', winnerId);

    if (updateError) {
      console.error('Error updating winner balance:', updateError);
      return { success: false, error: updateError };
    }

    // Save game result
    await saveGameResult(state);

    // Record commission
    await recordCommission(state);

    // Save final game state
    await saveGameState(state);

    console.log(`Paid ${prizeAmount} to winner ${winnerId}`);
    return { success: true, prizeAmount, newBalance };
  } catch (err) {
    console.error('Exception processing payout:', err);
    return { success: false, error: err };
  }
}

/**
 * Record game commission
 * @param {Object} state - Game state
 * @returns {Promise<Object>} - Record result
 */
export async function recordCommission(state) {
  if (!state.winner) {
    return { success: false, error: 'No winner to record commission' };
  }

  try {
    const winnerId = state.winner.odId;
    const loser = state.players.find(p => p.odId !== winnerId);
    const loserId = loser?.odId || null;

    const { error } = await supabase
      .from('game_commissions')
      .insert({
        game_id: state.gameId,
        table_id: state.tableId,
        winner_id: winnerId,
        loser_id: loserId,
        bet_amount: state.betAmount,
        total_pot: state.totalPool,
        commission_rate: COMMISSION_RATE,
        commission: state.commission,
        winner_payout: state.prizePool,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording commission:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception recording commission:', err);
    return { success: false, error: err };
  }
}

/**
 * Get game history for replay
 * @param {string} gameId - Game ID
 * @returns {Promise<Array>} - Array of actions
 */
export async function getGameHistory(gameId) {
  try {
    const { data, error } = await supabase
      .from('game_actions')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting game history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception getting game history:', err);
    return [];
  }
}

/**
 * Get user's game statistics
 * @param {string} odId - User ID
 * @returns {Promise<Object>} - User statistics
 */
export async function getUserGameStats(odId) {
  try {
    // Get total games
    const { count: totalGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .or(`player1_id.eq.${odId},player2_id.eq.${odId}`)
      .eq('status', 'finished');

    // Get wins
    const { count: wins } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('winner_id', odId)
      .eq('status', 'finished');

    // Get total winnings
    const { data: winningsData } = await supabase
      .from('games')
      .select('prize_pool')
      .eq('winner_id', odId)
      .eq('status', 'finished');

    const totalWinnings = winningsData?.reduce((sum, game) => sum + (game.prize_pool || 0), 0) || 0;

    return {
      totalGames: totalGames || 0,
      wins: wins || 0,
      losses: (totalGames || 0) - (wins || 0),
      winRate: totalGames ? ((wins / totalGames) * 100).toFixed(1) : 0,
      totalWinnings
    };
  } catch (err) {
    console.error('Exception getting user stats:', err);
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalWinnings: 0
    };
  }
}

export default {
  saveGameState,
  loadGameState,
  getActiveGameForUser,
  logGameAction,
  processWinnerPayout,
  recordCommission,
  saveGameResult,
  getGameHistory,
  getUserGameStats
};
