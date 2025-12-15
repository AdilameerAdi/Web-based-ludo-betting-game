import express from 'express';
import { initiatePayment, paymentCallback, getPaymentStatus } from '../controllers/paymentController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Payment callback doesn't require authentication (Paytm will call it)
router.post('/callback', paymentCallback);

// All other payment routes require authentication
router.use(verifyToken);

// POST /api/payments/initiate
router.post('/initiate', initiatePayment);

// GET /api/payments/status/:orderId
router.get('/status/:orderId', getPaymentStatus);

export default router;

