import crypto from 'crypto';

// Paytm Test Credentials (from user)
const PAYTM_MERCHANT_ID = process.env.PAYTM_MERCHANT_ID || 'wGTGuY25794243710156';
const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY || 'l%FAgDhj0#KDK274';
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || 'WEBSTAGING';
const PAYTM_INDUSTRY_TYPE = process.env.PAYTM_INDUSTRY_TYPE || 'Retail';
const PAYTM_CHANNEL_ID = process.env.PAYTM_CHANNEL_ID || 'WEB';
const PAYTM_CALLBACK_URL = process.env.PAYTM_CALLBACK_URL || 'http://localhost:5000/api/payments/callback';
const PAYTM_PAYMENT_URL = process.env.PAYTM_PAYMENT_URL || 'https://securegw-stage.paytm.in/merchant-transaction/processTransaction';

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
    
    console.log('Payment Initiated:', {
      orderId,
      amount,
      merchantId: PAYTM_MERCHANT_ID,
      checksumLength: checksum.length
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

    const { supabase } = await import('../config/supabase.js');
    
    // Find payment record
    let paymentData = null;
    try {
      const { data, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', ORDERID)
        .single();
      
      if (!paymentError) {
        paymentData = data;
      }
    } catch (err) {
      // Payments table may not exist
      console.log('Payments table may not exist, continuing...');
    }

    const paymentStatus = STATUS === 'TXN_SUCCESS' ? 'success' : 'failed';
    const paymentMessage = RESPMSG || 'Payment processing';

    // Update payment record if exists
    if (paymentData) {
      try {
        await supabase
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
      } catch (err) {
        console.error('Error updating payment:', err);
      }
    }

    // If payment successful, update user balance
    if (STATUS === 'TXN_SUCCESS') {
      const userId = paymentData?.user_id || params.CUST_ID;
      const amount = parseFloat(TXNAMOUNT);

      if (userId) {
        try {
          // Get current balance
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

          if (!userError && userData) {
            const newBalance = (userData.balance || 0) + amount;
            await supabase
              .from('users')
              .update({ balance: newBalance })
              .eq('id', userId);
          }
        } catch (err) {
          console.error('Error updating user balance:', err);
        }
      }
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

