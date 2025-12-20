import { Withdrawal } from '../models/Withdrawal.js';
import { User } from '../models/User.js';
import { supabase } from '../config/supabase.js';
import { debitWallet, creditWallet, getWalletBalance, TRANSACTION_TYPES } from '../services/walletService.js';

// Helper function to check if user is admin
const isAdmin = async (userId) => {
  try {
    const result = await User.findById(userId);
    if (!result.success) return false;
    
    // Check if user has is_admin field set to true
    // You can also check by mobile number or other criteria
    return result.data.is_admin === true || result.data.is_admin === 'true';
  } catch (error) {
    return false;
  }
};

// Create withdrawal request
export const createWithdrawal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, paymentMethod, accountDetails } = req.body;

    // Validation
    if (!amount || !paymentMethod || !accountDetails) {
      return res.status(400).json({
        success: false,
        message: 'Amount, payment method, and account details are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Check for existing pending withdrawal
    const { data: pendingWithdrawals, error: pendingError } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (!pendingError && pendingWithdrawals && pendingWithdrawals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending withdrawal request. Please wait for it to be processed.'
      });
    }

    // Check user balance using wallet service
    const balanceResult = await getWalletBalance(userId);
    if (!balanceResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check balance'
      });
    }

    if (balanceResult.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create withdrawal request first
    const result = await Withdrawal.create({
      userId,
      amount,
      paymentMethod: paymentMethod.toLowerCase(), // Use selected payment method
      accountDetails
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create withdrawal request',
        error: result.error
      });
    }

    const withdrawalId = result.data.id;

    // IMMEDIATELY deduct balance and lock funds (will be refunded if rejected)
    const debitResult = await debitWallet(
      userId,
      amount,
      TRANSACTION_TYPES.WITHDRAWAL_REQUEST,
      withdrawalId,
      {
        withdrawal_id: withdrawalId,
        payment_method: paymentMethod.toLowerCase(),
        account_details: accountDetails,
        status: 'pending'
      }
    );

    if (!debitResult.success) {
      // Rollback withdrawal creation
      await supabase.from('withdrawals').delete().eq('id', withdrawalId);
      return res.status(500).json({
        success: false,
        message: 'Failed to process withdrawal. Please try again.',
        error: debitResult.error
      });
    }

    // Emit real-time wallet update
    if (global.io) {
      global.io.to(`user_${userId}`).emit('wallet_updated', {
        balance: debitResult.newBalance,
        amount: -amount,
        type: 'debit',
        reason: 'withdrawal_request',
        withdrawalId: withdrawalId
      });
    }

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully. Amount has been locked.',
      data: {
        ...result.data,
        newBalance: debitResult.newBalance
      }
    });
  } catch (error) {
    console.error('[Withdrawal] Create withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's withdrawal requests
export const getUserWithdrawals = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Withdrawal.findByUserId(userId);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawals',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all withdrawals (admin only)
export const getAllWithdrawals = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user is admin
    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const result = await Withdrawal.findAll();
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawals',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update withdrawal status (admin only)
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { withdrawalId } = req.params;
    const { status, adminNotes } = req.body;

    // Check if user is admin
    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Validation
    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (pending, approved, rejected, completed)'
      });
    }

    // Get withdrawal details
    const withdrawalResult = await Withdrawal.findById(withdrawalId);
    if (!withdrawalResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    const withdrawal = withdrawalResult.data;

    // If rejecting, refund the balance
    if (status === 'rejected' && withdrawal.status === 'pending') {
      const userResult = await User.findById(withdrawal.user_id);
      if (userResult.success) {
        const currentBalance = userResult.data.balance || 0;
        const newBalance = currentBalance + withdrawal.amount;
        await User.update(withdrawal.user_id, { balance: newBalance });
      }
    }

    // Update withdrawal status
    const result = await Withdrawal.updateStatus(withdrawalId, status, userId, adminNotes);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update withdrawal status',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal status updated successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

