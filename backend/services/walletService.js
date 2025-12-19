/**
 * Wallet Service
 * Handles all wallet operations with atomic transactions and audit logging
 */

import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * Transaction Types
 */
export const TRANSACTION_TYPES = {
  // Credits
  ADD_FUNDS: 'add_funds',
  GAME_WIN: 'game_win',
  WITHDRAWAL_REFUND: 'withdrawal_refund',
  
  // Debits
  GAME_BET: 'game_bet',
  WITHDRAWAL_REQUEST: 'withdrawal_request',
  
  // Admin
  ADMIN_ADJUSTMENT: 'admin_adjustment'
};

/**
 * Get user wallet balance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - {success: boolean, balance: number}
 */
export async function getWalletBalance(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Wallet] Error getting balance:', error);
      return { success: false, error, balance: 0 };
    }

    return { 
      success: true, 
      balance: parseFloat(data?.balance || 0) 
    };
  } catch (err) {
    console.error('[Wallet] Exception getting balance:', err);
    return { success: false, error: err, balance: 0 };
  }
}

/**
 * Credit wallet (atomic operation with transaction log)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to credit
 * @param {string} type - Transaction type
 * @param {string} referenceId - Reference ID (order_id, game_id, etc.)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - {success: boolean, newBalance: number, transactionId: string}
 */
export async function creditWallet(userId, amount, type, referenceId, metadata = {}) {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  try {
    // Get current balance (with lock)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Wallet] Error getting user for credit:', userError);
      return { success: false, error: userError };
    }

    const currentBalance = parseFloat(userData?.balance || 0);
    const newBalance = currentBalance + amount;

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('[Wallet] Error updating balance:', updateError);
      return { success: false, error: updateError };
    }

    // Log transaction
    const transactionId = await logWalletTransaction({
      user_id: userId,
      type: type,
      amount: amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: referenceId,
      metadata: metadata,
      created_at: new Date().toISOString()
    });

    console.log(`[Wallet] Credited ${amount} to user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      newBalance,
      transactionId,
      balanceBefore: currentBalance
    };
  } catch (err) {
    console.error('[Wallet] Exception crediting wallet:', err);
    return { success: false, error: err };
  }
}

/**
 * Debit wallet (atomic operation with transaction log)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to debit
 * @param {string} type - Transaction type
 * @param {string} referenceId - Reference ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - {success: boolean, newBalance: number, transactionId: string}
 */
export async function debitWallet(userId, amount, type, referenceId, metadata = {}) {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  try {
    // Get current balance (with lock)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Wallet] Error getting user for debit:', userError);
      return { success: false, error: userError };
    }

    const currentBalance = parseFloat(userData?.balance || 0);

    // Check if balance is sufficient
    if (currentBalance < amount) {
      return { 
        success: false, 
        error: 'Insufficient balance',
        currentBalance,
        requiredAmount: amount
      };
    }

    const newBalance = currentBalance - amount;

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('[Wallet] Error updating balance:', updateError);
      return { success: false, error: updateError };
    }

    // Log transaction
    const transactionId = await logWalletTransaction({
      user_id: userId,
      type: type,
      amount: -amount, // Negative for debit
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: referenceId,
      metadata: metadata,
      created_at: new Date().toISOString()
    });

    console.log(`[Wallet] Debited ${amount} from user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      newBalance,
      transactionId,
      balanceBefore: currentBalance
    };
  } catch (err) {
    console.error('[Wallet] Exception debiting wallet:', err);
    return { success: false, error: err };
  }
}

/**
 * Log wallet transaction
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<string>} - Transaction ID
 */
async function logWalletTransaction(transactionData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .insert(transactionData)
      .select('id')
      .single();

    if (error) {
      // If table doesn't exist, log to console and continue
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn('[Wallet] wallet_transactions table not found. Transaction not logged.');
        return 'no-log';
      }
      console.error('[Wallet] Error logging transaction:', error);
      return 'error';
    }

    return data?.id || 'unknown';
  } catch (err) {
    console.error('[Wallet] Exception logging transaction:', err);
    return 'error';
  }
}

/**
 * Get wallet transactions for a user
 * @param {string} userId - User ID
 * @param {number} limit - Limit results
 * @param {number} offset - Offset
 * @returns {Promise<Object>} - {success: boolean, data: Array}
 */
export async function getWalletTransactions(userId, limit = 50, offset = 0) {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: [] };
      }
      return { success: false, error };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('[Wallet] Exception getting transactions:', err);
    return { success: false, error: err, data: [] };
  }
}

/**
 * Check if transaction already processed (prevent duplicates)
 * @param {string} referenceId - Reference ID
 * @param {string} type - Transaction type
 * @returns {Promise<boolean>} - True if already processed
 */
export async function isTransactionProcessed(referenceId, type) {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference_id', referenceId)
      .eq('type', type)
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // Table doesn't exist, assume not processed
      }
      console.error('[Wallet] Error checking transaction:', error);
      return false;
    }

    return (data && data.length > 0);
  } catch (err) {
    console.error('[Wallet] Exception checking transaction:', err);
    return false;
  }
}

export default {
  getWalletBalance,
  creditWallet,
  debitWallet,
  getWalletTransactions,
  isTransactionProcessed,
  TRANSACTION_TYPES
};

