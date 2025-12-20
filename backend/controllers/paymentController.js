import crypto from 'crypto';
import { creditWallet, isTransactionProcessed, TRANSACTION_TYPES } from '../services/walletService.js';

// Paytm Configuration - All values must be set via environment variables
const PAYTM_MERCHANT_ID = process.env.PAYTM_MERCHANT_ID;
const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY;
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || 'DEFAULT';
const PAYTM_INDUSTRY_TYPE = process.env.PAYTM_INDUSTRY_TYPE || 'Retail109';
const PAYTM_CHANNEL_ID = process.env.PAYTM_CHANNEL_ID || 'WEB';
const PAYTM_CALLBACK_URL = process.env.PAYTM_CALLBACK_URL;
// Paytm payment URL - use /theia/processTransaction for form submissions
// Production URL for Paytm payment gateway
const PAYTM_PAYMENT_URL = process.env.PAYTM_PAYMENT_URL || 'https://securegw.paytm.in/theia/processTransaction';

// Validate required Paytm environment variables
if (!PAYTM_MERCHANT_ID || !PAYTM_MERCHANT_KEY || !PAYTM_CALLBACK_URL) {
  console.error('❌ [Payment] ERROR: Required Paytm environment variables are missing!');
  console.error('❌ [Payment] Required: PAYTM_MERCHANT_ID, PAYTM_MERCHANT_KEY, PAYTM_CALLBACK_URL');
  console.error('❌ [Payment] Please set these in your .env file');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Paytm configuration is incomplete. Cannot start server in production mode.');
  }
}

// Check for wrong URL and warn
const WRONG_URL_PATTERN = '/merchant-transaction/processTransaction';
if (PAYTM_PAYMENT_URL.includes(WRONG_URL_PATTERN)) {
  console.error('❌ [Payment] ERROR: Wrong Paytm URL detected!');
  console.error('❌ [Payment] Current URL:', PAYTM_PAYMENT_URL);
  console.error('❌ [Payment] This URL causes 503 errors. Please update your .env file:');
  console.error('❌ [Payment] Change PAYTM_PAYMENT_URL to: https://securegw.paytm.in/theia/processTransaction');
  console.error('❌ [Payment] Then restart your server.');
}

// Log on module load to verify URL
if (process.env.PAYTM_PAYMENT_URL) {
  console.log('[Payment] Using PAYTM_PAYMENT_URL from environment:', process.env.PAYTM_PAYMENT_URL);
} else {
  console.log('[Payment] Using default PAYTM_PAYMENT_URL:', PAYTM_PAYMENT_URL);
}
console.log('[Payment] Paytm Payment URL configured:', PAYTM_PAYMENT_URL);

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
      callbackUrl: PAYTM_CALLBACK_URL,
      checksumLength: checksum.length,
      paramsCount: Object.keys(params).length
    });
    
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

