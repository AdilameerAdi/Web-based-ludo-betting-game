import express from 'express';
import { initiatePayment, paymentCallback, getPaymentStatus } from '../controllers/paymentController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Payment callback doesn't require authentication (Paytm will call it)
router.post('/callback', paymentCallback);

// Diagnostic endpoint (no auth required for debugging)
router.get('/config-check', (req, res) => {
  const PAYTM_MERCHANT_ID = (process.env.PAYTM_MERCHANT_ID || '').replace(/^["']|["']$/g, '');
  const PAYTM_MERCHANT_KEY = (process.env.PAYTM_MERCHANT_KEY || '').replace(/^["']|["']$/g, '');
  const PAYTM_WEBSITE = (process.env.PAYTM_WEBSITE || 'DEFAULT').replace(/^["']|["']$/g, '');
  const PAYTM_INDUSTRY_TYPE = (process.env.PAYTM_INDUSTRY_TYPE || 'Retail109').replace(/^["']|["']$/g, '');
  const PAYTM_CHANNEL_ID = (process.env.PAYTM_CHANNEL_ID || 'WEB').replace(/^["']|["']$/g, '');
  const PAYTM_CALLBACK_URL = (process.env.PAYTM_CALLBACK_URL || '').replace(/^["']|["']$/g, '');
  const PAYTM_PAYMENT_URL = (process.env.PAYTM_PAYMENT_URL || 'https://securegw.paytm.in/theia/processTransaction').replace(/^["']|["']$/g, '').trim();
  
  const cleanedUrl = PAYTM_PAYMENT_URL.replace(/^["']|["']$/g, '').trim();
  
  // Check configuration status
  const isConfigured = !!(PAYTM_MERCHANT_ID && PAYTM_MERCHANT_KEY && PAYTM_CALLBACK_URL);
  const issues = [];
  
  if (!PAYTM_MERCHANT_ID) issues.push('PAYTM_MERCHANT_ID is missing');
  if (!PAYTM_MERCHANT_KEY) issues.push('PAYTM_MERCHANT_KEY is missing');
  if (!PAYTM_CALLBACK_URL) issues.push('PAYTM_CALLBACK_URL is missing');
  if (PAYTM_MERCHANT_ID && PAYTM_MERCHANT_ID.length < 5) issues.push('PAYTM_MERCHANT_ID seems invalid (too short)');
  if (PAYTM_MERCHANT_KEY && PAYTM_MERCHANT_KEY.length < 10) issues.push('PAYTM_MERCHANT_KEY seems invalid (too short)');
  if (cleanedUrl && !cleanedUrl.includes('paytm.in') && !cleanedUrl.includes('paytm.com')) {
    issues.push('PAYTM_PAYMENT_URL does not appear to be a valid Paytm URL');
  }
  if (cleanedUrl && !cleanedUrl.startsWith('https://')) {
    issues.push('PAYTM_PAYMENT_URL should use HTTPS, not HTTP');
  }
  
  res.json({
    success: true,
    configured: isConfigured,
    issues: issues,
    data: {
      merchantId: PAYTM_MERCHANT_ID ? `${PAYTM_MERCHANT_ID.substring(0, 10)}...` : 'NOT SET',
      merchantKey: PAYTM_MERCHANT_KEY ? `Set (length: ${PAYTM_MERCHANT_KEY.length})` : 'NOT SET',
      website: PAYTM_WEBSITE || 'NOT SET',
      industryType: PAYTM_INDUSTRY_TYPE || 'NOT SET',
      channelId: PAYTM_CHANNEL_ID || 'NOT SET',
      callbackUrl: PAYTM_CALLBACK_URL || 'NOT SET',
      rawPaymentUrl: process.env.PAYTM_PAYMENT_URL || 'NOT SET',
      cleanedPaymentUrl: cleanedUrl,
      urlLength: cleanedUrl.length,
      containsPaytm: cleanedUrl.includes('paytm.in') || cleanedUrl.includes('paytm.com'),
      containsDummy: cleanedUrl.toLowerCase().includes('dummy.com'),
      isStaging: cleanedUrl.includes('securegw-stage.paytm.in'),
      isProduction: cleanedUrl.includes('securegw.paytm.in') && !cleanedUrl.includes('stage')
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

