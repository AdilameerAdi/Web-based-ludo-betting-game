# Paytm Payment Integration Troubleshooting

## Quick Fix: Akamai CDN "Access Denied" Error

**If you see this error:**
```
Access Denied
Reference #18.cdd0dd17.1765814797.549bd617
https://errors.edgesuite.net/18.cdd0dd17.1765814797.549bd617
```

**Immediate Actions:**
1. ✅ Verify payment URL uses `https://` (check `.env` file)
2. ✅ Contact Paytm support with error reference number for IP whitelisting
3. ✅ Try Paytm JavaScript SDK (see Section 6) instead of form submission
4. ✅ Check merchant account status in Paytm dashboard

**Most Common Cause:** IP address not whitelisted by Paytm's CDN (Akamai)

---

## "Access Denied" Error Fix

If you're getting "Access Denied" error from Paytm, here are the fixes applied:

### 1. Updated Payment URL
Changed from:
```
https://securegw-stage.paytm.in/theia/processTransaction
```
To:
```
https://securegw-stage.paytm.in/merchant-transaction/processTransaction
```

### 2. Fixed Checksum Generation
The checksum generation now properly:
- Sorts parameters alphabetically
- Creates string with `key=value&key=value` format
- Adds merchant key at the end: `string&merchant_key`
- Uses SHA256 hash

### 3. Common Issues and Solutions

#### Issue: Access Denied Error (Akamai CDN Error)
**Error Message:**
```
Access Denied
You don't have permission to access "http://securegw-stage.paytm.in/merchant-transaction/processTransaction" on this server.
Reference #18.cdd0dd17.1765814797.549bd617
https://errors.edgesuite.net/18.cdd0dd17.1765814797.549bd617
```

**Why This Happens:**
1. **IP Blocking**: Paytm's CDN (Akamai) may be blocking your IP address
2. **HTTP vs HTTPS**: Notice the error shows `http://` - ensure you're using `https://`
3. **Request Method**: The endpoint requires POST method, not GET
4. **Missing Headers**: Some requests may require specific headers
5. **Merchant Account Issues**: Your merchant account might need activation or IP whitelisting
6. **Endpoint Deprecated**: The endpoint URL might have changed

**Solutions (Try in Order):**

1. **Verify HTTPS is Used (Not HTTP)**
   - Check your `.env` file: `PAYTM_PAYMENT_URL=https://securegw-stage.paytm.in/merchant-transaction/processTransaction`
   - Ensure the URL starts with `https://` not `http://`
   - The error message showing `http://` suggests a redirect or misconfiguration

2. **Check Request Method**
   - The form must use `POST` method (already correct in code)
   - Verify in browser DevTools Network tab that the request is POST

3. **Contact Paytm Support for IP Whitelisting**
   - Email Paytm support with:
     - Error reference number: `18.cdd0dd17.1765814797.549bd617`
     - Your merchant ID: `wGTGuY25794243710156`
     - Your public IP address (find at https://whatismyipaddress.com/)
     - Request IP whitelisting for staging environment
   - Paytm Support: support@paytm.com or merchant support portal

4. **Try Alternative Endpoint**
   - Some merchants report success with: `https://securegw-stage.paytm.in/theia/processTransaction`
   - But this is usually the older endpoint

5. **Use Paytm JavaScript SDK Instead**
   - Form submission may be blocked, but SDK might work
   - See Section 6 below for SDK implementation

6. **Verify Merchant Account Status**
   - Log into Paytm Merchant Dashboard
   - Check if account is active and approved
   - Verify staging credentials are enabled

7. **Check Network/Firewall**
   - Try from different network (mobile hotspot, different location)
   - Disable VPN if using one
   - Check if corporate firewall is blocking the request

8. **Verify All Parameters**
   - Ensure all required parameters are present
   - Check checksum is correctly generated
   - Verify merchant key is correct (URL encoded if needed)

**Quick Fix Checklist:**
- [ ] Payment URL uses `https://` (not `http://`)
- [ ] Form uses POST method
- [ ] All parameters are included
- [ ] Checksum is generated correctly
- [ ] Merchant credentials are correct
- [ ] Contacted Paytm support for IP whitelisting
- [ ] Tried from different network
- [ ] Verified merchant account is active

#### Issue: Payment Page Not Loading
**Solutions:**
- Check browser console for errors
- Verify CORS settings
- Ensure callback URL is accessible
- Check network connectivity

#### Issue: Checksum Verification Failed
**Solutions:**
- Ensure parameters are sorted alphabetically
- Verify merchant key is correct
- Check that CHECKSUMHASH is not included in checksum calculation
- Use SHA256 algorithm

### 4. Testing Checklist

- [ ] Merchant ID is correct
- [ ] Merchant Key is correct (URL encoded if needed)
- [ ] Payment URL is correct
- [ ] Callback URL is accessible
- [ ] All required parameters are present
- [ ] Checksum is generated correctly
- [ ] Amount is valid (≥ 1, ≤ 100000)
- [ ] User exists in database
- [ ] Mobile number is valid

### 5. Paytm Test Credentials

Make sure you're using:
- **Merchant ID**: `wGTGuY25794243710156`
- **Merchant Key**: `l%FAgDhj0#KDK274`
- **Website**: `WEBSTAGING`
- **Industry Type**: `Retail`
- **Channel ID**: `WEB`

### 6. Alternative: Use Paytm JavaScript SDK

If form submission doesn't work, you can use Paytm's JavaScript SDK:

```javascript
// In AddFunds.jsx, instead of form submission:
import { loadScript } from '@paytm/paytm-js';

// After getting payment params:
loadScript({
  src: 'https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/wGTGuY25794243710156.js',
  onload: () => {
    window.Paytm.CheckoutJS.init({
      root: '',
      flow: 'DEFAULT',
      data: {
        orderId: result.data.orderId,
        token: result.data.params.CHECKSUMHASH,
        tokenType: 'CHECKSUM',
        amount: result.data.amount
      },
      handler: {
        notifyMerchant: function(eventName, data) {
          console.log('Payment event:', eventName, data);
        }
      }
    }).then(function() {
      window.Paytm.CheckoutJS.invoke();
    });
  }
});
```

### 7. Debug Steps

1. **Check Backend Logs**
   - Look for "Payment Initiated" log with order details
   - Verify checksum is generated

2. **Check Network Tab**
   - Verify `/api/payments/initiate` returns 200
   - Check response contains all required params
   - Verify paymentUrl is correct

3. **Test Checksum Manually**
   ```javascript
   // Test checksum generation
   const params = {
     MID: 'wGTGuY25794243710156',
     WEBSITE: 'WEBSTAGING',
     INDUSTRY_TYPE_ID: 'Retail',
     CHANNEL_ID: 'WEB',
     ORDER_ID: 'ORDER_123',
     CUST_ID: 'user123',
     MOBILE_NO: '9999999999',
     EMAIL: 'test@test.com',
     TXN_AMOUNT: '100',
     CALLBACK_URL: 'http://localhost:5000/api/payments/callback'
   };
   // Generate checksum and verify
   ```

### 8. Contact Paytm Support

If issues persist:
- Contact Paytm support with error reference number
- Provide merchant ID and order ID
- Share error details and logs
- Request IP whitelisting if needed

### 9. Production Setup

For production:
- Use production merchant credentials
- Update payment URL to: `https://securegw.paytm.in/merchant-transaction/processTransaction`
- Update website to production value
- Ensure callback URL is HTTPS
- Enable proper error logging

