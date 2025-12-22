import express from 'express';
import { 
  createWithdrawal, 
  getUserWithdrawals, 
  getAllWithdrawals, 
  updateWithdrawalStatus 
} from '../controllers/withdrawalController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// All withdrawal routes require authentication
router.use(verifyToken);

// POST /api/withdrawals - Create withdrawal request
router.post('/', createWithdrawal);

// GET /api/withdrawals - Get user's withdrawal requests
router.get('/', getUserWithdrawals);

// GET /api/withdrawals/all - Get all withdrawals (admin only)
router.get('/all', getAllWithdrawals);

// PUT /api/withdrawals/:withdrawalId/status - Update withdrawal status (admin only)
router.put('/:withdrawalId/status', updateWithdrawalStatus);

export default router;

