import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { creditWallet, isTransactionProcessed, TRANSACTION_TYPES } from '../services/walletService.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first (before reading them)
// Try loading from backend directory (where PM2 runs from) and also from project root
const backendEnvPath = join(__dirname, '../.env');
const rootEnvPath = join(__dirname, '../../.env');

// Log which .env files exist
if (existsSync(backendEnvPath)) {
  console.log('[Payment] ✅ Found .env file at:', backendEnvPath);
  dotenv.config({ path: backendEnvPath });
} else {
  console.log('[Payment] ⚠️  No .env file found at:', backendEnvPath);
}

if (existsSync(rootEnvPath)) {
  console.log('[Payment] ✅ Found .env file at:', rootEnvPath);
  dotenv.config({ path: rootEnvPath }); // Fallback to project root
} else {
  console.log('[Payment] ⚠️  No .env file found at:', rootEnvPath);
}

// Paytm Configuration - All values must be set via environment variables
// Strip quotes from environment variables if present (common .env file issue)
const PAYTM_MERCHANT_ID = (process.env.PAYTM_MERCHANT_ID || '').replace(/^["']|["']$/g, '');
const PAYTM_MERCHANT_KEY = (process.env.PAYTM_MERCHANT_KEY || '').replace(/^["']|["']$/g, '');
const PAYTM_WEBSITE = (process.env.PAYTM_WEBSITE || 'DEFAULT').replace(/^["']|["']$/g, '');
const PAYTM_INDUSTRY_TYPE = (process.env.PAYTM_INDUSTRY_TYPE || 'Retail109').replace(/^["']|["']$/g, '');
const PAYTM_CHANNEL_ID = (process.env.PAYTM_CHANNEL_ID || 'WEB').replace(/^["']|["']$/g, '');
const PAYTM_CALLBACK_URL = (process.env.PAYTM_CALLBACK_URL || '').replace(/^["']|["']$/g, '');
// Paytm payment URL - use /theia/processTransaction for form submissions
// Production URL for Paytm payment gateway
// Strip quotes and trim whitespace
let rawPaymentUrl = (process.env.PAYTM_PAYMENT_URL || 'https://securegw.paytm.in/theia/processTransaction').replace(/^["']|["']$/g, '').trim();

// CRITICAL: Ensure URL always uses HTTPS (not HTTP)
// Paytm requires HTTPS - HTTP will cause Access Denied
if (rawPaymentUrl.startsWith('http://')) {
  console.warn('[Payment] WARNING: PAYTM_PAYMENT_URL is HTTP, converting to HTTPS');
  rawPaymentUrl = rawPaymentUrl.replace('http://', 'https://');
}

// Ensure URL starts with https://
if (!rawPaymentUrl.startsWith('https://')) {
  if (rawPaymentUrl.startsWith('securegw.paytm.in')) {
    rawPaymentUrl = 'https://' + rawPaymentUrl;
  } else {
    console.error('[Payment] ERROR: Invalid PAYTM_PAYMENT_URL. Must be HTTPS Paytm URL.');
  }
}

const PAYTM_PAYMENT_URL = rawPaymentUrl;

// Validate required Paytm environment variables
// Instead of throwing an error that crashes the server, we'll disable payment functionality
const PAYTM_CONFIGURED = !!(PAYTM_MERCHANT_ID && PAYTM_MERCHANT_KEY && PAYTM_CALLBACK_URL);

// Debug logging to help diagnose configuration issues
if (process.env.NODE_ENV === 'production' || process.env.DEBUG_PAYMENT === 'true') {
  console.log('[Payment] Configuration Debug:');
  console.log('[Payment] PAYTM_MERCHANT_ID:', PAYTM_MERCHANT_ID ? `${PAYTM_MERCHANT_ID.substring(0, 10)}...` : 'MISSING');
  console.log('[Payment] PAYTM_MERCHANT_KEY:', PAYTM_MERCHANT_KEY ? `${PAYTM_MERCHANT_KEY.substring(0, 5)}...` : 'MISSING');
  console.log('[Payment] PAYTM_CALLBACK_URL:', PAYTM_CALLBACK_URL || 'MISSING');
  console.log('[Payment] PAYTM_CONFIGURED:', PAYTM_CONFIGURED);
}

if (!PAYTM_CONFIGURED) {
  console.error('❌ [Payment] WARNING: Required Paytm environment variables are missing!');
  console.error('❌ [Payment] Required: PAYTM_MERCHANT_ID, PAYTM_MERCHANT_KEY, PAYTM_CALLBACK_URL');
  console.error('❌ [Payment] Please set these in your .env file');
  console.error('❌ [Payment] Payment functionality will be disabled until configuration is complete.');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ [Payment] Server will start, but payment endpoints will return errors.');
  }
} else {
  console.log('✅ [Payment] Paytm configuration is complete.');
  console.log('✅ [Payment] Merchant ID:', PAYTM_MERCHANT_ID);
  console.log('✅ [Payment] Callback URL:', PAYTM_CALLBACK_URL);
}

// Check for wrong URL and warn
const WRONG_URL_PATTERN = '/merchant-transaction/processTransaction';
const DUMMY_URL_PATTERNS = ['dummy.com', 'test.com', 'example.com', 'localhost'];
const isDummyUrl = DUMMY_URL_PATTERNS.some(pattern => PAYTM_PAYMENT_URL.toLowerCase().includes(pattern));

if (PAYTM_PAYMENT_URL.includes(WRONG_URL_PATTERN)) {
  console.error('❌ [Payment] ERROR: Wrong Paytm URL detected!');
  console.error('❌ [Payment] Current URL:', PAYTM_PAYMENT_URL);
  console.error('❌ [Payment] This URL causes 503 errors. Please update your .env file:');
  console.error('❌ [Payment] Change PAYTM_PAYMENT_URL to: https://securegw.paytm.in/theia/processTransaction');
  console.error('❌ [Payment] Then restart your server.');
}

if (isDummyUrl) {
  console.error('❌ [Payment] ERROR: Dummy/Test URL detected!');
  console.error('❌ [Payment] Current URL:', PAYTM_PAYMENT_URL);
  console.error('❌ [Payment] This is not a valid Paytm payment URL. Please update your .env file:');
  console.error('❌ [Payment] Change PAYTM_PAYMENT_URL to: https://securegw.paytm.in/theia/processTransaction');
  console.error('❌ [Payment] For staging/test, use: https://securegw-stage.paytm.in/theia/processTransaction');
  console.error('❌ [Payment] Then restart your server.');
}

// Log on module load to verify URL
console.log('[Payment] ============================================');
console.log('[Payment] PAYMENT URL CONFIGURATION CHECK:');
console.log('[Payment] ============================================');
console.log('[Payment] Raw process.env.PAYTM_PAYMENT_URL:', process.env.PAYTM_PAYMENT_URL || 'NOT SET');
if (process.env.PAYTM_PAYMENT_URL) {
  console.log('[Payment] ✅ Using PAYTM_PAYMENT_URL from environment');
  console.log('[Payment] 📍 Raw URL (with quotes if any):', JSON.stringify(process.env.PAYTM_PAYMENT_URL));
  console.log('[Payment] 📍 Cleaned URL (quotes removed):', PAYTM_PAYMENT_URL);
  console.log('[Payment] 📏 URL Length:', PAYTM_PAYMENT_URL.length);
  console.log('[Payment] 🔍 Contains paytm.in:', PAYTM_PAYMENT_URL.includes('paytm.in'));
  console.log('[Payment] 🔍 Contains dummy.com:', PAYTM_PAYMENT_URL.toLowerCase().includes('dummy.com'));
  
  // Check if URL has quotes (shouldn't happen after cleaning, but let's verify)
  if (PAYTM_PAYMENT_URL.includes('"') || PAYTM_PAYMENT_URL.includes("'")) {
    console.error('[Payment] ❌ WARNING: URL still contains quotes after cleaning!');
  }
} else {
  console.log('[Payment] ⚠️  PAYTM_PAYMENT_URL not found in environment, using default');
  console.log('[Payment] 📍 Default URL:', PAYTM_PAYMENT_URL);
}
console.log('[Payment] 📍 Final PAYTM_PAYMENT_URL value:', PAYTM_PAYMENT_URL);
console.log('[Payment] ============================================');

// Generate Paytm checksum (SHA256)
function generateChecksum(params, key) {
  // Sort parameters and create string
  const sortedKeys = Object.keys(params).sort();
  const string = sortedKeys
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  
  // Add merchant key and generate hash
  const hashString = string + '&' + key;
  const hash = crypto.createHash('sha256').update(hashString).digest('hex');
  return hash;
}

// Verify Paytm checksum
function verifyChecksum(params, checksum, key) {
  // Remove CHECKSUMHASH from params for verification
  const paramsForChecksum = { ...params };
  delete paramsForChecksum.CHECKSUMHASH;
  
  // Sort parameters and create string
  const sortedKeys = Object.keys(paramsForChecksum).sort();
  const string = sortedKeys
    .map((k) => `${k}=${paramsForChecksum[k]}`)
    .join('&');
  
  // Add merchant key and generate hash
  const hashString = string + '&' + key;
  const hash = crypto.createHash('sha256').update(hashString).digest('hex');
  return hash === checksum;
}

// Initiate payment
export const initiatePayment = async (req, res) => {
  try {
    // Check if Paytm is configured
    if (!PAYTM_CONFIGURED) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured. Please contact administrator.',
        error: 'Paytm configuration is incomplete. Required environment variables: PAYTM_MERCHANT_ID, PAYTM_MERCHANT_KEY, PAYTM_CALLBACK_URL'
      });
    }

    const userId = req.user.userId;
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is ₹1'
      });
    }

    if (amount > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum amount is ₹1,00,000'
      });
    }

    // Get user details
    const { supabase } = await import('../config/supabase.js');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, mobile')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record in database (if payments table exists)
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          user_id: userId,
          amount: amount,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (paymentError && paymentError.code !== 'PGRST116') {
        console.error('Payment creation error:', paymentError);
      }
    } catch (err) {
      // Payments table may not exist, continue without it
      console.log('Note: Payments table may not exist. Continuing without payment record.');
    }

    // Prepare Paytm parameters (order matters for checksum)
    const params = {
      MID: PAYTM_MERCHANT_ID,
      WEBSITE: PAYTM_WEBSITE,
      INDUSTRY_TYPE_ID: PAYTM_INDUSTRY_TYPE,
      CHANNEL_ID: PAYTM_CHANNEL_ID,
      ORDER_ID: orderId,
      CUST_ID: userId,
      MOBILE_NO: userData.mobile || '9999999999',
      EMAIL: `${userId}@ludogame.com`,
      TXN_AMOUNT: amount.toString(),
      CALLBACK_URL: PAYTM_CALLBACK_URL
    };

    // Generate checksum BEFORE adding CHECKSUMHASH
    const checksum = generateChecksum(params, PAYTM_MERCHANT_KEY);
    params.CHECKSUMHASH = checksum;
    
    console.log('[Payment] Payment Initiated:', {
      orderId,
      amount,
      userId,
      merchantId: PAYTM_MERCHANT_ID,
      paymentUrl: PAYTM_PAYMENT_URL,
      paymentUrlLength: PAYTM_PAYMENT_URL.length,
      paymentUrlFromEnv: process.env.PAYTM_PAYMENT_URL,
      callbackUrl: PAYTM_CALLBACK_URL,
      checksumLength: checksum.length,
      paramsCount: Object.keys(params).length
    });
    
    // Extra validation - log the actual URL being sent
    console.log('[Payment] 🔍 DEBUG: Actual payment URL being sent to client:', PAYTM_PAYMENT_URL);
    if (PAYTM_PAYMENT_URL.includes('dummy.com')) {
      console.error('[Payment] ❌ CRITICAL: dummy.com detected in payment URL!');
      console.error('[Payment] ❌ This should not happen if .env is correct.');
      console.error('[Payment] ❌ Please check:');
      console.error('[Payment] ❌ 1. Is the server restarted after .env change?');
      console.error('[Payment] ❌ 2. Is the .env file in the correct location?');
      console.error('[Payment] ❌ 3. Are there multiple .env files?');
    }
    
    // Log params (without sensitive data) for debugging
    console.log('[Payment] Payment params:', {
      MID: params.MID,
      ORDER_ID: params.ORDER_ID,
      TXN_AMOUNT: params.TXN_AMOUNT,
      CUST_ID: params.CUST_ID,
      WEBSITE: params.WEBSITE,
      INDUSTRY_TYPE_ID: params.INDUSTRY_TYPE_ID,
      CHANNEL_ID: params.CHANNEL_ID,
      CHECKSUMHASH: params.CHECKSUMHASH ? 'present' : 'missing'
    });

    // Validate payment URL before sending response
    const DUMMY_URL_PATTERNS = ['dummy.com', 'test.com', 'example.com'];
    const isDummyUrl = DUMMY_URL_PATTERNS.some(pattern => PAYTM_PAYMENT_URL.toLowerCase().includes(pattern));
    
    if (isDummyUrl) {
      console.error('[Payment] ❌ ERROR: Invalid payment URL detected:', PAYTM_PAYMENT_URL);
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not properly configured. Please contact administrator.',
        error: 'Invalid PAYTM_PAYMENT_URL in server configuration. Expected Paytm gateway URL but found dummy/test URL.'
      });
    }

    // Validate that URL is a valid Paytm URL
    if (!PAYTM_PAYMENT_URL.includes('paytm.in') && !PAYTM_PAYMENT_URL.includes('paytm.com')) {
      console.error('[Payment] ❌ ERROR: Payment URL does not appear to be a valid Paytm URL:', PAYTM_PAYMENT_URL);
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not properly configured. Please contact administrator.',
        error: 'Invalid PAYTM_PAYMENT_URL. URL must be a valid Paytm gateway URL.'
      });
    }

    res.json({
      success: true,
      data: {
        orderId,
        paymentUrl: PAYTM_PAYMENT_URL,
        params,
        amount
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
};

// Payment callback handler
export const paymentCallback = async (req, res) => {
  try {
    // Check if Paytm is configured
    if (!PAYTM_CONFIGURED) {
      console.error('[Payment] Callback received but Paytm is not configured');
      return res.status(503).send('Payment service is not configured');
    }

    const params = req.body;
    const { ORDERID, TXNID, TXNAMOUNT, STATUS, RESPCODE, RESPMSG, BANKTXNID, CHECKSUMHASH } = params;

    // Verify checksum
    const isValidChecksum = verifyChecksum(params, CHECKSUMHASH, PAYTM_MERCHANT_KEY);

    if (!isValidChecksum) {
      return res.status(400).send('Checksum verification failed');
    }

    const { supabaseAdmin } = await import('../config/supabase.js');
    
    console.log('[Payment] Callback received:', {
      ORDERID,
      STATUS,
      TXNID,
      TXNAMOUNT,
      RESPCODE,
      RESPMSG
    });
    
    // Find payment record
    let paymentData = null;
    try {
      const { data, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('order_id', ORDERID)
        .single();
      
      if (!paymentError && data) {
        paymentData = data;
        console.log('[Payment] Found payment record:', { user_id: data.user_id, amount: data.amount });
      } else {
        console.log('[Payment] Payment record not found or table doesn\'t exist. Using CUST_ID from params.');
      }
    } catch (err) {
      // Payments table may not exist
      console.log('[Payment] Payments table may not exist, continuing with params...');
    }

    const paymentStatus = STATUS === 'TXN_SUCCESS' ? 'success' : 'failed';
    const paymentMessage = RESPMSG || 'Payment processing';

    // Update payment record if exists
    if (paymentData) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('payments')
          .update({
            transaction_id: TXNID,
            bank_transaction_id: BANKTXNID,
            status: paymentStatus,
            response_code: RESPCODE,
            response_message: paymentMessage,
            updated_at: new Date().toISOString()
          })
          .eq('order_id', ORDERID);
        
        if (updateError) {
          console.error('[Payment] Error updating payment record:', updateError);
        } else {
          console.log('[Payment] Payment record updated successfully');
        }
      } catch (err) {
        console.error('[Payment] Exception updating payment:', err);
      }
    }

    // If payment successful, credit wallet (with duplicate prevention)
    if (STATUS === 'TXN_SUCCESS') {
      const userId = paymentData?.user_id || params.CUST_ID;
      const amount = parseFloat(TXNAMOUNT);

      console.log('[Payment] Processing successful payment:', { userId, amount, ORDERID });

      if (!userId) {
        console.error('[Payment] No user ID found in payment data or params');
      } else if (!amount || amount <= 0) {
        console.error('[Payment] Invalid amount:', amount);
      } else {
        try {
          // Check if this transaction was already processed
          const alreadyProcessed = await isTransactionProcessed(ORDERID, TRANSACTION_TYPES.ADD_FUNDS);
          
          if (alreadyProcessed) {
            console.log(`[Payment] Transaction ${ORDERID} already processed. Skipping duplicate.`);
          } else {
            console.log(`[Payment] Processing new transaction ${ORDERID} for user ${userId}`);
            
            // Credit wallet using wallet service
            const creditResult = await creditWallet(
              userId,
              amount,
              TRANSACTION_TYPES.ADD_FUNDS,
              ORDERID,
              {
                transaction_id: TXNID,
                bank_transaction_id: BANKTXNID,
                payment_method: 'paytm'
              }
            );

            if (creditResult.success) {
              console.log(`[Payment] ✅ Successfully credited ${amount} to user ${userId}. New balance: ${creditResult.newBalance}`);
              
              // Emit real-time wallet update via Socket.IO
              if (global.io) {
                global.io.to(`user_${userId}`).emit('wallet_updated', {
                  balance: creditResult.newBalance,
                  amount: amount,
                  type: 'credit',
                  reason: 'add_funds',
                  transactionId: creditResult.transactionId,
                  orderId: ORDERID
                });
                console.log(`[Payment] Emitted wallet_updated event to user_${userId}`);
              } else {
                console.warn('[Payment] global.io not available for real-time update');
              }
            } else {
              console.error('[Payment] ❌ Failed to credit wallet:', creditResult.error);
              console.error('[Payment] Error details:', JSON.stringify(creditResult, null, 2));
            }
          }
        } catch (err) {
          console.error('[Payment] ❌ Exception processing payment credit:', err);
          console.error('[Payment] Error stack:', err.stack);
        }
      }
    } else {
      console.log(`[Payment] Payment failed or pending. Status: ${STATUS}, Message: ${paymentMessage}`);
    }

    // Redirect to frontend with payment status
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment-status?status=${paymentStatus}&orderId=${ORDERID}&message=${encodeURIComponent(paymentMessage)}`;

    // For Paytm, we need to return HTML that redirects
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Processing</title>
        </head>
        <body>
          <script>
            window.location.href = "${redirectUrl}";
          </script>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).send('Payment callback processing failed');
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const { supabase } = await import('../config/supabase.js');
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !paymentData) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: paymentData
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

