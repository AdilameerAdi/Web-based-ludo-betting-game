import express from 'express';
import { initiatePayment, paymentCallback, getPaymentStatus } from '../controllers/paymentController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Payment callback doesn't require authentication (Paytm will call it)
router.post('/callback', paymentCallback);

// Diagnostic endpoint (no auth required for debugging)
router.get('/config-check', (req, res) => {
  const PAYTM_PAYMENT_URL = process.env.PAYTM_PAYMENT_URL || 'https://securegw.paytm.in/theia/processTransaction';
  const cleanedUrl = PAYTM_PAYMENT_URL.replace(/^["']|["']$/g, '').trim();
  
  res.json({
    success: true,
    data: {
      rawPaymentUrl: process.env.PAYTM_PAYMENT_URL || 'NOT SET',
      cleanedPaymentUrl: cleanedUrl,
      urlLength: cleanedUrl.length,
      containsPaytm: cleanedUrl.includes('paytm.in') || cleanedUrl.includes('paytm.com'),
      containsDummy: cleanedUrl.toLowerCase().includes('dummy.com'),
      isConfigured: !!(process.env.PAYTM_MERCHANT_ID && process.env.PAYTM_MERCHANT_KEY && process.env.PAYTM_CALLBACK_URL)
    }
  });
});

// All other payment routes require authentication
router.use(verifyToken);

// POST /api/payments/initiate
router.post('/initiate', initiatePayment);

// GET /api/payments/status/:orderId
router.get('/status/:orderId', getPaymentStatus);

export default router;

