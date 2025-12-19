import { Admin } from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { creditWallet, TRANSACTION_TYPES } from '../services/walletService.js';

// Admin login
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find admin
    const result = await Admin.findByUsername(username);
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Verify password
    const isPasswordValid = await Admin.verifyPassword(password, result.data.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Admin] JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
    
    const token = jwt.sign(
      { adminId: result.data.id, username: result.data.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...adminData } = result.data;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminData,
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify admin token middleware
export const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Admin] JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    
    // Check if it's an admin token (has adminId)
    if (!decoded.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin token'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Get all withdrawals (admin)
export const getAllWithdrawals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    // Handle table not existing or relationship errors gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relationship')) {
        return res.json({
          success: true,
          data: [],
          message: 'Withdrawals table not yet created'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: data || []
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

// Update withdrawal status (admin)
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.admin.adminId;

    // Validation
    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (pending, approved, rejected, completed)'
      });
    }

    // Get withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (withdrawalError || !withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    // If rejecting, refund the balance using wallet service
    if (status === 'rejected' && withdrawal.status === 'pending') {
      const refundResult = await creditWallet(
        withdrawal.user_id,
        withdrawal.amount,
        TRANSACTION_TYPES.WITHDRAWAL_REFUND,
        withdrawalId,
        {
          withdrawal_id: withdrawalId,
          reason: 'admin_rejection',
          admin_id: adminId,
          admin_notes: adminNotes
        }
      );

      if (refundResult.success) {
        console.log(`[Admin] Refunded ${withdrawal.amount} to user ${withdrawal.user_id} for rejected withdrawal`);
        
        // Emit real-time wallet update
        if (global.io) {
          global.io.to(`user_${withdrawal.user_id}`).emit('wallet_updated', {
            balance: refundResult.newBalance,
            amount: withdrawal.amount,
            type: 'credit',
            reason: 'withdrawal_refund',
            withdrawalId: withdrawalId
          });
          
          // Also emit withdrawal status update
          global.io.to(`user_${withdrawal.user_id}`).emit('withdrawal_status_updated', {
            withdrawalId: withdrawalId,
            status: 'rejected',
            message: 'Withdrawal request rejected. Amount refunded to wallet.'
          });
        }
      } else {
        console.error('[Admin] Failed to refund withdrawal:', refundResult.error);
      }
    }

    // If approving, notify user
    if (status === 'approved' && withdrawal.status === 'pending') {
      if (global.io) {
        global.io.to(`user_${withdrawal.user_id}`).emit('withdrawal_status_updated', {
          withdrawalId: withdrawalId,
          status: 'approved',
          message: 'Withdrawal accepted. Amount will be credited within 10-20 minutes.'
        });
      }
    }

    // Update withdrawal status
    const updateData = {
      status: status,
      updated_at: new Date().toISOString(),
      processed_by: adminId
    };

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .update(updateData)
      .eq('id', withdrawalId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Withdrawal status updated successfully',
      data: data
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

// Get commission stats
export const getCommissionStats = async (req, res) => {
  try {
    // Calculate total commission from game_commissions table
    const { data, error } = await supabase
      .from('game_commissions')
      .select('commission')
      .eq('status', 'completed');

    // Handle table not existing gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          data: { total: 0 },
          message: 'Commission table not yet created'
        });
      }
      throw error;
    }

    const total = (data || []).reduce((sum, item) => sum + (parseFloat(item.commission) || 0), 0);

    res.json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('Get commission stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get commission history
export const getCommissionHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('game_commissions')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Handle table not existing gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          data: [],
          message: 'Commission table not yet created'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get commission history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get add funds stats
export const getAddFundsStats = async (req, res) => {
  try {
    // Get total from payments table where status is success
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .in('status', ['TXN_SUCCESS', 'success', 'SUCCESS']);

    // Handle table not existing gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          data: { total: 0 },
          message: 'Payments table not yet created'
        });
      }
      throw error;
    }

    const total = (data || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    res.json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('Get add funds stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get add funds history
export const getAddFundsHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('status', ['TXN_SUCCESS', 'success', 'SUCCESS'])
      .order('created_at', { ascending: false });

    // Handle table not existing or relationship errors gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relationship')) {
        return res.json({
          success: true,
          data: [],
          message: 'Payments table not yet created'
        });
      }
      throw error;
    }

    // Format the data
    const formattedData = (data || []).map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      order_id: payment.order_id,
      user_id: payment.user_id,
      created_at: payment.created_at
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Get add funds history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all users (admin)
export const getAllUsers = async (req, res) => {
  try {
    console.log('[Admin] getAllUsers called');
    console.log('[Admin] Using supabaseAdmin client:', !!supabaseAdmin);
    console.log('[Admin] Service role key loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Use admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, mobile, balance, is_admin, created_at, updated_at')
      .order('created_at', { ascending: false });

    console.log('[Admin] Query result:', { 
      dataLength: data?.length, 
      error: error?.message, 
      errorCode: error?.code
    });

    if (error) {
      console.error('[Admin] Get all users database error:', error);
      console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
      console.error('[Admin] Error code:', error.code);
      console.error('[Admin] Error message:', error.message);
      console.error('[Admin] Error hint:', error.hint);
      
      // Return the actual error
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message,
        errorCode: error.code,
        hint: error.hint
      });
    }

    console.log(`[Admin] Successfully retrieved ${data?.length || 0} users from database`);
    if (data && data.length > 0) {
      console.log('[Admin] First user sample:', {
        id: data[0].id,
        mobile: data[0].mobile,
        balance: data[0].balance
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[Admin] Get all users exception:', error);
    console.error('[Admin] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user details (admin)
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, mobile, balance, is_admin, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's game stats
    let gameStats = { games_played: 0, games_won: 0, total_wagered: 0 };
    try {
      const { data: games } = await supabaseAdmin
        .from('game_results')
        .select('winner_id, bet_amount')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

      if (games) {
        gameStats.games_played = games.length;
        gameStats.games_won = games.filter(g => g.winner_id === userId).length;
        gameStats.total_wagered = games.reduce((sum, g) => sum + (parseFloat(g.bet_amount) || 0), 0);
      }
    } catch (e) {
      // Game stats not available
    }

    // Get withdrawal history
    let withdrawals = [];
    try {
      const { data } = await supabaseAdmin
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      withdrawals = data || [];
    } catch (e) {
      // Withdrawals not available
    }

    res.json({
      success: true,
      data: {
        user,
        gameStats,
        recentWithdrawals: withdrawals
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get game history (admin)
export const getGameHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          data: [],
          message: 'Game results table not yet created'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get dashboard overview stats (admin)
export const getDashboardStats = async (req, res) => {
  try {
    const stats = {
      totalCommission: 0,
      totalAddFunds: 0,
      pendingWithdrawals: 0,
      pendingWithdrawalAmount: 0,
      totalUsers: 0,
      totalGames: 0,
      todayCommission: 0,
      todayGames: 0
    };

    // Get commission stats
    try {
      const { data } = await supabase
        .from('game_commissions')
        .select('commission, created_at')
        .eq('status', 'completed');

      if (data) {
        const today = new Date().toISOString().split('T')[0];
        stats.totalCommission = data.reduce((sum, item) => sum + (parseFloat(item.commission) || 0), 0);
        stats.todayCommission = data
          .filter(item => item.created_at?.startsWith(today))
          .reduce((sum, item) => sum + (parseFloat(item.commission) || 0), 0);
      }
    } catch (e) {
      // Commission table may not exist
    }

    // Get add funds stats
    try {
      const { data } = await supabase
        .from('payments')
        .select('amount')
        .in('status', ['TXN_SUCCESS', 'success', 'SUCCESS']);

      if (data) {
        stats.totalAddFunds = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      }
    } catch (e) {
      // Payments table may not exist
    }

    // Get withdrawal stats
    try {
      const { data } = await supabase
        .from('withdrawals')
        .select('amount, status')
        .eq('status', 'pending');

      if (data) {
        stats.pendingWithdrawals = data.length;
        stats.pendingWithdrawalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      }
    } catch (e) {
      // Withdrawals table may not exist
    }

    // Get user count
    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      stats.totalUsers = count || 0;
    } catch (e) {
      // Users table may not exist
    }

    // Get game count
    try {
      const { data } = await supabase
        .from('game_results')
        .select('created_at');

      if (data) {
        const today = new Date().toISOString().split('T')[0];
        stats.totalGames = data.length;
        stats.todayGames = data.filter(item => item.created_at?.startsWith(today)).length;
      }
    } catch (e) {
      // Game results table may not exist
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Change admin password
export const changePassword = async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get admin
    const adminResult = await Admin.findById(adminId);
    if (!adminResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isPasswordValid = await Admin.verifyPassword(currentPassword, adminResult.data.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await Admin.hashPassword(newPassword);

    // Update password
    const updateResult = await Admin.updatePassword(adminId, hashedPassword);
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password',
        error: updateResult.error
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

