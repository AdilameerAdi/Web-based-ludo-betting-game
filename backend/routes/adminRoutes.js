import express from 'express';
import { 
  adminLogin,
  getAllWithdrawals,
  updateWithdrawalStatus,
  getCommissionStats,
  getCommissionHistory,
  getAddFundsStats,
  getAddFundsHistory,
  changePassword,
  verifyAdminToken
} from '../controllers/adminController.js';

const router = express.Router();

// Public route
router.post('/login', adminLogin);

// All routes below require admin authentication
router.use(verifyAdminToken);

// Withdrawals
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:withdrawalId/status', updateWithdrawalStatus);

// Stats
router.get('/stats/commission', getCommissionStats);
router.get('/stats/add-funds', getAddFundsStats);

// History
router.get('/commission', getCommissionHistory);
router.get('/add-funds-history', getAddFundsHistory);

// Password
router.put('/change-password', changePassword);

export default router;

