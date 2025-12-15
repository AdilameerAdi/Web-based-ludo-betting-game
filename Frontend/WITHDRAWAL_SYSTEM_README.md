# Withdrawal System Documentation

## Overview
This withdrawal system allows users to request withdrawals from their game balance, and admins to manually review and process these requests.

## Setup Instructions

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:
```bash
backend/WITHDRAWAL_TABLE_SETUP.sql
```

This will create:
- `withdrawals` table to store withdrawal requests
- Indexes for better query performance
- `is_admin` column in `users` table (if it doesn't exist)

### 2. Make a User Admin
To grant admin access to a user, update the `users` table in Supabase:
```sql
UPDATE users SET is_admin = true WHERE mobile = 'YOUR_ADMIN_MOBILE_NUMBER';
```

Or you can set it during user creation by modifying the signup process.

## Features

### User Features
1. **Withdrawal Request Page** (`WithdrawFunds.jsx`)
   - Users can request withdrawals from their balance
   - Minimum withdrawal: ₹100
   - Supports multiple payment methods (UPI, Bank Account, Paytm, PhonePe, Google Pay)
   - Shows withdrawal history with status
   - Balance is deducted immediately when request is created
   - Balance is refunded if request is rejected

2. **Access**: Click the "💸 Withdraw" button in the dashboard

### Admin Features
1. **Admin Withdrawals Page** (`AdminWithdrawals.jsx`)
   - View all withdrawal requests
   - Filter by status (All, Pending, Approved, Completed, Rejected)
   - See pending count badge
   - Approve or reject pending requests
   - Mark approved requests as completed after sending money
   - Add admin notes to requests
   - View user details and account information

2. **Access**: Click the "👨‍💼 Admin" button in the dashboard (only visible to admin users)

## Workflow

### User Workflow
1. User clicks "Withdraw" button
2. User enters withdrawal amount (min ₹100)
3. User selects payment method
4. User enters account details (UPI ID, bank account, etc.)
5. User submits request
6. Balance is deducted immediately
7. Request status: **Pending**

### Admin Workflow
1. Admin clicks "Admin" button
2. Admin sees all withdrawal requests
3. For **Pending** requests:
   - Admin can **Approve** or **Reject**
   - If rejected: Balance is automatically refunded to user
   - Admin can add notes
4. For **Approved** requests:
   - Admin sends money manually (outside the system)
   - Admin clicks "Mark as Completed" after sending money
   - Admin can add transaction notes
5. Request status changes: **Pending** → **Approved** → **Completed** (or **Rejected**)

## API Endpoints

### User Endpoints
- `POST /api/withdrawals` - Create withdrawal request
- `GET /api/withdrawals` - Get user's withdrawal requests

### Admin Endpoints
- `GET /api/withdrawals/all` - Get all withdrawal requests (admin only)
- `PUT /api/withdrawals/:withdrawalId/status` - Update withdrawal status (admin only)

## Status Flow
```
Pending → Approved → Completed
Pending → Rejected (balance refunded)
```

## Security
- All endpoints require authentication (JWT token)
- Admin endpoints check for `is_admin` flag
- Balance validation before withdrawal
- Automatic balance refund on rejection

## Notes
- Balance is deducted when request is created (not when approved)
- If request is rejected, balance is automatically refunded
- Admin must manually send money outside the system
- Admin marks as "Completed" after confirming money was sent
- Minimum withdrawal amount: ₹100

