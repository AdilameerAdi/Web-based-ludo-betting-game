# Admin System Setup Guide

## Overview
The admin system provides a separate login page and dashboard for administrators to manage the platform.

## Setup Instructions

### 1. Generate Admin Password Hash

First, generate a bcrypt hash for the admin password. You can use the provided script:

```bash
cd backend
node generateAdminPassword.js
```

This will output a hash for the password "123456". Copy this hash.

Alternatively, you can generate it manually in Node.js:
```javascript
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('123456', 10);
console.log(hash);
```

### 2. Update SQL File

Open `backend/ADMIN_TABLE_SETUP.sql` and replace the hash in the INSERT statement (line 42) with the hash you generated.

### 3. Run SQL Scripts

Run these SQL scripts in your Supabase SQL Editor in order:

1. **First, run `backend/WITHDRAWAL_TABLE_SETUP.sql`** (if not already done)
2. **Then, run `backend/ADMIN_TABLE_SETUP.sql`**

### 4. Default Admin Credentials

After running the SQL script, you can login with:
- **Username:** `adil`
- **Password:** `123456`

### 5. Access Admin Panel

Navigate to: `http://localhost:5173/admin`

## Admin Dashboard Features

### 1. Withdrawal Requests
- View all withdrawal requests
- Filter by status (Pending, Approved, Completed, Rejected)
- Approve or reject requests
- Mark as completed after sending money
- Add admin notes

### 2. Commission Received
- View total commission from games
- See commission history with details
- Track earnings from each game

### 3. Add Funds History
- View all successful add funds transactions
- See total amount added by users
- Track user payment history

### 4. Change Password
- Update admin password
- Requires current password verification
- Automatically logs out after password change

## API Endpoints

### Admin Authentication
- `POST /api/admin/login` - Admin login

### Admin Dashboard (Requires Admin Token)
- `GET /api/admin/withdrawals` - Get all withdrawals
- `PUT /api/admin/withdrawals/:id/status` - Update withdrawal status
- `GET /api/admin/stats/commission` - Get commission statistics
- `GET /api/admin/commission` - Get commission history
- `GET /api/admin/stats/add-funds` - Get add funds statistics
- `GET /api/admin/add-funds-history` - Get add funds history
- `PUT /api/admin/change-password` - Change admin password

## Security Notes

- Admin uses separate authentication from regular users
- Admin tokens are stored separately (`adminToken` in localStorage)
- All admin endpoints require valid admin token
- Password is hashed using bcrypt (10 salt rounds)

## Changing Admin Password

1. Login to admin dashboard
2. Click "Change Password"
3. Enter current password and new password
4. System will automatically log you out after successful change

## Troubleshooting

### Can't login?
- Verify the password hash in the database matches the generated hash
- Check that the `admins` table exists
- Verify the username is correct (case-sensitive)

### Commission not showing?
- Ensure `game_commissions` table exists
- Check that commission records are being created when games complete
- Verify status is set to 'completed'

### Add funds history empty?
- Check that `payments` table exists
- Verify payment status is 'TXN_SUCCESS', 'success', or 'SUCCESS'
- Ensure user_id foreign key is properly set

