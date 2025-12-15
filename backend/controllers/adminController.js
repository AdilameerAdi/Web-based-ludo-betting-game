import { Admin } from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

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
    const token = jwt.sign(
      { adminId: result.data.id, username: result.data.username },
      process.env.JWT_SECRET || 'your-secret-key',
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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
      .select(`
        *,
        users:user_id (
          id,
          mobile
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
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

    // If rejecting, refund the balance
    if (status === 'rejected' && withdrawal.status === 'pending') {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', withdrawal.user_id)
        .single();

      if (!userError && userData) {
        const currentBalance = userData.balance || 0;
        const newBalance = currentBalance + withdrawal.amount;
        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', withdrawal.user_id);
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

    if (error) {
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

    if (error) {
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

    if (error) {
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
      .select(`
        *,
        users:user_id (
          id,
          mobile
        )
      `)
      .in('status', ['TXN_SUCCESS', 'success', 'SUCCESS'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format the data
    const formattedData = (data || []).map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      order_id: payment.order_id,
      user_id: payment.user_id,
      user_mobile: payment.users?.mobile || null,
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

