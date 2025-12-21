import { User } from '../models/User.js';
import { verifyToken } from './authController.js';

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await User.findById(userId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password, ...userData } = result.data;

    // Ensure winning_balance is included (default to 0 if not present)
    if (userData.winning_balance === undefined && userData.winningBalance === undefined) {
      userData.winning_balance = 0;
    }

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    // Don't allow password update through this endpoint
    if (updateData.password) {
      delete updateData.password;
    }

    const result = await User.update(userId, updateData);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update profile',
        error: result.error
      });
    }

    // Remove password from response
    const { password, ...userData } = result.data;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userData
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

