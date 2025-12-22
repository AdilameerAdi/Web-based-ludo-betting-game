import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// GET /api/users/profile
router.get('/profile', getProfile);

// PUT /api/users/profile
router.put('/profile', updateProfile);

export default router;

