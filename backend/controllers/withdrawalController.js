import { Withdrawal } from '../models/Withdrawal.js';
import { User } from '../models/User.js';
import { supabase } from '../config/supabase.js';

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

    // Check user balance
    const userResult = await User.findById(userId);
    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userBalance = userResult.data.balance || 0;
    if (userBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create withdrawal request
    const result = await Withdrawal.create({
      userId,
      amount,
      paymentMethod,
      accountDetails
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create withdrawal request',
        error: result.error
      });
    }

    // Deduct balance immediately (will be refunded if rejected)
    const newBalance = userBalance - amount;
    await User.update(userId, { balance: newBalance });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Create withdrawal error:', error);
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

