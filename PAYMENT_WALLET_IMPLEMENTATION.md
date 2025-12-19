# Payment & Wallet System Implementation

## Overview
Complete implementation of payment integration, wallet management, and withdrawal system with real-time updates and comprehensive audit logging.

## ✅ Implemented Features

### 1. Wallet Service (`backend/services/walletService.js`)
- **Atomic Operations**: All wallet operations are atomic with transaction logging
- **Transaction Types**: 
  - `add_funds` - Payment credits
  - `game_win` - Game winnings
  - `game_bet` - Game stake deductions
  - `withdrawal_request` - Withdrawal deductions
  - `withdrawal_refund` - Withdrawal rejections
- **Duplicate Prevention**: Checks for already processed transactions
- **Balance Validation**: Prevents negative balances
- **Audit Logging**: All transactions logged to `wallet_transactions` table

### 2. Add Funds Flow (`backend/controllers/paymentController.js`)
- ✅ Real-time payment processing via Paytm
- ✅ Payment verification with checksum validation
- ✅ Duplicate transaction prevention
- ✅ Atomic wallet credit with transaction logging
- ✅ Real-time Socket.IO wallet updates
- ✅ Exact amount credited (no rounding errors)

### 3. Game Win/Loss Logic (`backend/game/services/gameService.js`)
- ✅ Stake deducted when game starts (locked funds)
- ✅ Winner receives prize pool (total pot - commission)
- ✅ Loser's stake already deducted at game start
- ✅ Commission calculated and recorded
- ✅ Real-time wallet updates for both players
- ✅ Complete transaction audit trail

### 4. Withdrawal System (`backend/controllers/withdrawalController.js`)
- ✅ Paytm-only validation
- ✅ Immediate balance deduction (funds locked)
- ✅ Prevents duplicate pending withdrawals
- ✅ Admin approval/rejection with refunds
- ✅ Real-time status updates
- ✅ Complete audit trail

### 5. Real-Time Updates (Socket.IO)
- ✅ Wallet balance updates via `wallet_updated` event
- ✅ Withdrawal status updates via `withdrawal_status_updated` event
- ✅ User rooms: `user_{userId}` for targeted updates
- ✅ Automatic room joining on authentication

### 6. Admin Reporting (`backend/controllers/adminReportingController.js`)
- ✅ Daily game reports
- ✅ Admin earnings summary
- ✅ Winners/losers statistics
- ✅ Commission tracking

### 7. Audit & Logging
- ✅ `wallet_transactions` table for all wallet operations
- ✅ Transaction metadata (reference IDs, game IDs, etc.)
- ✅ Balance before/after tracking
- ✅ Timestamp for all operations

## Database Schema

### Wallet Transactions Table
Run `backend/migrations/002_create_wallet_transactions.sql`:

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  reference_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Payment
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/callback` - Paytm callback (webhook)
- `GET /api/payments/status/:orderId` - Get payment status

### Withdrawal
- `POST /api/withdrawals` - Create withdrawal (Paytm only)
- `GET /api/withdrawals` - Get user withdrawals
- `PUT /api/admin/withdrawals/:id/status` - Update withdrawal status (admin)

### Admin Reporting
- `GET /api/admin/reports/daily-games` - Daily game report
- `GET /api/admin/reports/earnings` - Admin earnings summary

## Socket.IO Events

### Client → Server
- `authenticate` - Authenticate user and join user room
  ```javascript
  socket.emit('authenticate', { userId: 'user-id', token: 'jwt-token' });
  ```

### Server → Client
- `wallet_updated` - Wallet balance changed
  ```javascript
  {
    balance: 1500.00,
    amount: 500.00,
    type: 'credit' | 'debit',
    reason: 'add_funds' | 'game_win' | 'game_bet' | 'withdrawal_request' | 'withdrawal_refund',
    transactionId: 'uuid',
    gameId?: 'game-id',
    withdrawalId?: 'withdrawal-id'
  }
  ```

- `withdrawal_status_updated` - Withdrawal status changed
  ```javascript
  {
    withdrawalId: 'uuid',
    status: 'approved' | 'rejected' | 'completed',
    message: 'Status message'
  }
  ```

## Security Features

1. **Duplicate Prevention**: Transaction reference IDs prevent double processing
2. **Atomic Operations**: Wallet updates are atomic (all or nothing)
3. **Balance Validation**: Negative balances prevented
4. **Payment Verification**: Paytm checksum validation
5. **Admin Authorization**: All admin endpoints require authentication

## Usage Examples

### Frontend: Listen for Wallet Updates
```javascript
socket.on('wallet_updated', (data) => {
  console.log('Wallet updated:', data);
  setBalance(data.balance);
});

socket.on('withdrawal_status_updated', (data) => {
  console.log('Withdrawal status:', data);
  showNotification(data.message);
});
```

### Frontend: Authenticate Socket
```javascript
socket.emit('authenticate', { 
  userId: currentUser.id, 
  token: localStorage.getItem('token') 
});
```

## Testing Checklist

- [ ] Add funds flow works end-to-end
- [ ] Duplicate payment callbacks are rejected
- [ ] Game bet deduction works correctly
- [ ] Winner receives correct payout
- [ ] Loser's stake is deducted
- [ ] Withdrawal locks funds immediately
- [ ] Admin rejection refunds correctly
- [ ] Real-time updates work
- [ ] Wallet balance never goes negative
- [ ] All transactions are logged

## Notes

- All wallet operations use `supabaseAdmin` to bypass RLS
- Transaction logging is non-blocking (continues even if table doesn't exist)
- Real-time updates require user to authenticate via Socket.IO
- Withdrawal funds are locked and cannot be used in games
- Commission is calculated as: `bet_amount × COMMISSION_RATE`

