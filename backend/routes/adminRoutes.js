import express from 'express';
import {
  adminLogin,
  getAllWithdrawals,
  updateWithdrawalStatus,
  getCommissionStats,
  getCommissionHistory,
  getAddFundsStats,
  getAddFundsHistory,
  getAllUsers,
  getUserDetails,
  getGameHistory,
  getDashboardStats,
  changePassword,
  verifyAdminToken
} from '../controllers/adminController.js';
import { getDailyGameReport, getAdminEarnings } from '../controllers/adminReportingController.js';

const router = express.Router();

// Public route
router.post('/login', adminLogin);

// All routes below require admin authentication
router.use(verifyAdminToken);

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// Withdrawals
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:withdrawalId/status', updateWithdrawalStatus);

// Stats
router.get('/stats/commission', getCommissionStats);
router.get('/stats/add-funds', getAddFundsStats);

// History
router.get('/commission', getCommissionHistory);
router.get('/add-funds-history', getAddFundsHistory);
router.get('/games', getGameHistory);

// Users
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);

// Password
router.put('/change-password', changePassword);

// Reporting
router.get('/reports/daily-games', getDailyGameReport);
router.get('/reports/earnings', getAdminEarnings);

export default router;

