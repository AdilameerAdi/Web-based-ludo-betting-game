import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Register/Sign Up
export const signUp = async (req, res) => {
  try {
    const { mobile, password, confirmPassword } = req.body;

    // Validation
    if (!mobile || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByMobile(mobile);
    if (existingUser.success) {
      return res.status(400).json({
        success: false,
        message: 'User with this mobile number already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await User.create({
      mobile,
      password: hashedPassword
    });

    if (!result.success) {
      console.error('❌ User creation failed:', result.error);
      console.error('Error details:', result.errorDetails);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: result.error,
        details: process.env.NODE_ENV === 'development' ? result.errorDetails : undefined
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.data.id, mobile: result.data.mobile },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: result.data.id,
          mobile: result.data.mobile,
          created_at: result.data.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Validation
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and password are required'
      });
    }

    // Find user
    const result = await User.findByMobile(mobile);
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, result.data.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.data.id, mobile: result.data.mobile },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.data.id,
          mobile: result.data.mobile,
          created_at: result.data.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify token middleware (for protected routes)
export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

