# Paytm Payment Gateway Troubleshooting

## Issue: 403 Forbidden Error

If you're getting a 403 error when trying to access Paytm payment gateway, check the following:

### 1. Correct Payment URL

The correct Paytm staging URL for form submissions is:
```
https://securegw-stage.paytm.in/theia/processTransaction
```

**NOT:**
```
https://securegw-stage.paytm.in/merchant-transaction/processTransaction
```

✅ **Fixed in code** - Updated to use `/theia/processTransaction`

### 2. Verify Paytm Credentials

Check your `.env` file has correct Paytm test credentials:

```env
PAYTM_MERCHANT_ID=wGTGuY25794243710156
PAYTM_MERCHANT_KEY=l%FAgDhj0#KDK274
PAYTM_WEBSITE=WEBSTAGING
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=http://localhost:5000/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw-stage.paytm.in/theia/processTransaction
```

### 3. Common Causes of 403 Error

1. **Invalid Merchant Credentials**
   - Verify your Paytm merchant ID and key are correct
   - Check if your Paytm staging account is active

2. **Merchant Account Not Activated**
   - Your Paytm staging account might need activation
   - Contact Paytm support to activate your test merchant account

3. **IP Restrictions**
   - Some Paytm accounts have IP whitelisting
   - Check if your IP is allowed

4. **Wrong Environment**
   - Make sure you're using staging credentials for staging URL
   - Production credentials won't work with staging URL

### 4. Testing Steps

1. **Check Backend Logs**
   - Look for `[Payment] Payment Initiated` logs
   - Verify all parameters are present
   - Check if checksum is generated correctly

2. **Check Browser Console**
   - Look for form submission errors
   - Check network tab for the POST request
   - Verify form parameters are correct

3. **Verify Form Submission**
   - The form should POST to Paytm with all required parameters
   - All parameters should be present (MID, ORDER_ID, TXN_AMOUNT, etc.)
   - CHECKSUMHASH must be present and valid

### 5. Alternative: Test with Paytm Test Cards

If the staging gateway is not accessible, you can:

1. **Use Paytm Test Mode** (if available)
2. **Contact Paytm Support** to activate your staging account
3. **Use Production Credentials** (only if you have production account)

### 6. Debug Checklist

- [ ] Payment URL is correct: `/theia/processTransaction`
- [ ] All Paytm credentials are set in `.env`
- [ ] Merchant ID and Key are correct
- [ ] Callback URL is accessible
- [ ] Form is submitting with all parameters
- [ ] Checksum is being generated correctly
- [ ] Backend logs show payment initiation

### 7. Contact Paytm Support

If the issue persists:
- Email: support@paytm.com
- Provide your Merchant ID
- Mention you're trying to use staging/test environment
- Ask them to verify your account status

## Production Setup

When moving to production:

1. **Update Environment Variables:**
   ```env
   PAYTM_WEBSITE=WEB
   PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
   PAYTM_MERCHANT_ID=your_production_merchant_id
   PAYTM_MERCHANT_KEY=your_production_merchant_key
   ```

2. **Update Callback URL:**
   ```env
   PAYTM_CALLBACK_URL=https://your-domain.com/api/payments/callback
   ```

3. **Test with Real Transactions:**
   - Start with small amounts
   - Verify callback is working
   - Check wallet updates

