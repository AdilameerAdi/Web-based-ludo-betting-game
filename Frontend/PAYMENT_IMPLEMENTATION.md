# Payment Integration - Add Funds Implementation

## Overview
This document describes the Paytm payment gateway integration for adding funds to user wallets in the Ludo game application.

## What Has Been Implemented

### Backend (`backend/`)

1. **Payment Controller** (`backend/controllers/paymentController.js`)
   - `initiatePayment`: Creates payment order and generates Paytm payment parameters
   - `paymentCallback`: Handles Paytm payment callback and updates user balance
   - `getPaymentStatus`: Retrieves payment status for an order
   - Checksum generation and verification for Paytm

2. **Payment Routes** (`backend/routes/paymentRoutes.js`)
   - `POST /api/payments/initiate` - Initiate payment
   - `POST /api/payments/callback` - Paytm callback (no auth required)
   - `GET /api/payments/status/:orderId` - Get payment status

3. **Server Integration** (`backend/server.js`)
   - Payment routes registered at `/api/payments`

### Frontend (`src/components/`)

1. **AddFunds Component** (`src/components/AddFunds.jsx`)
   - Quick amount selection (₹100, ₹500, ₹1000, ₹2000, ₹5000)
   - Custom amount input
   - Form submission to Paytm payment gateway
   - Error handling

2. **PaymentStatus Component** (`src/components/PaymentStatus.jsx`)
   - Displays payment success/failure status
   - Shows order ID and current balance
   - Navigation back to dashboard

3. **UserDashboard Integration** (`src/components/UserDashboard.jsx`)
   - "Add Funds" button functionality
   - Payment status handling from URL parameters
   - Balance refresh after successful payment

## Configuration

### Environment Variables (`.env` file in `backend/`)

Add these to your `.env` file:

```env
# Paytm Test Credentials
PAYTM_MERCHANT_ID=wGTGuY25794243710156
PAYTM_MERCHANT_KEY=l%FAgDhj0#KDK274
PAYTM_WEBSITE=WEBSTAGING
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=http://localhost:5000/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw-stage.paytm.in/theia/processTransaction

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

## Database Requirements

### Payments Table (Optional but Recommended)

Create a `payments` table in Supabase:

```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  bank_transaction_id TEXT,
  response_code TEXT,
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

**Note:** The payment system will work without this table, but payment history won't be stored.

## Testing

### Test Payment Flow

1. User clicks "Add Funds" button
2. Selects amount (quick select or custom)
3. Clicks "Proceed to Pay"
4. Redirected to Paytm payment page
5. Completes payment (use test credentials)
6. Redirected back to app with payment status
7. Balance updated automatically

### Paytm Test Credentials

For testing, you can use these test payment methods:
- **Test Card**: Use Paytm test cards from their documentation
- **Test Wallet**: Use Paytm test wallet credentials
- **Test UPI**: Use test UPI IDs provided by Paytm

## What Else Might Be Needed

### 1. Production Configuration
- Replace test credentials with production credentials
- Update `PAYTM_PAYMENT_URL` to production URL: `https://securegw.paytm.in/theia/processTransaction`
- Update `PAYTM_CALLBACK_URL` to production callback URL
- Use production `PAYTM_WEBSITE` value

### 2. Security Enhancements
- Add rate limiting to payment endpoints
- Implement payment amount validation on backend
- Add transaction logging
- Implement fraud detection

### 3. Additional Features
- **Payment History**: Show user's payment history
- **Refund Handling**: Implement refund functionality
- **Withdrawal**: Implement withdraw funds feature
- **Payment Methods**: Support multiple payment gateways
- **Promo Codes**: Add discount/promo code support

### 4. Error Handling
- Better error messages for users
- Retry mechanism for failed payments
- Payment timeout handling
- Network error recovery

### 5. Notifications
- Email/SMS notifications on payment success
- In-app notifications
- Payment receipt generation

### 6. Admin Features
- Payment dashboard
- Transaction reports
- Refund management
- Payment analytics

## API Endpoints

### Initiate Payment
```
POST /api/payments/initiate
Headers: Authorization: Bearer <token>
Body: { "amount": 100 }
Response: { "success": true, "data": { "orderId": "...", "paymentUrl": "...", "params": {...} } }
```

### Payment Callback (Called by Paytm)
```
POST /api/payments/callback
Body: Paytm callback parameters
Response: HTML redirect page
```

### Get Payment Status
```
GET /api/payments/status/:orderId
Headers: Authorization: Bearer <token>
Response: { "success": true, "data": { ...payment details... } }
```

## Notes

- The payment system uses Paytm's staging environment for testing
- Checksum is generated using SHA256 algorithm
- Payment callback automatically updates user balance on success
- The system gracefully handles missing payments table
- All amounts are in INR (₹)

## Support

For Paytm integration issues, refer to:
- [Paytm Developer Documentation](https://developer.paytm.com/docs/)
- [Paytm Test Credentials](https://developer.paytm.com/docs/testing/)

