# Complete Admin System Design
## Ludo Betting Game - Production-Ready Admin Platform

---

## 1. ADMIN COMMISSION SYSTEM

### Commission Logic Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMISSION CALCULATION                    │
├─────────────────────────────────────────────────────────────┤
│  Player A Stake: ₹20                                        │
│  Player B Stake: ₹20                                        │
│  ─────────────────                                          │
│  Total Pot: ₹40                                             │
│  Commission Rate: 20% of TABLE AMOUNT (₹20)                 │
│  Admin Commission: ₹20 × 0.20 = ₹4                          │
│  Winner Payout: ₹40 - ₹4 = ₹36                              │
└─────────────────────────────────────────────────────────────┘
```

### Commission Rules

| Rule | Description |
|------|-------------|
| **Calculation Base** | Commission = 20% of per-player stake (NOT total pot) |
| **Server-Side Only** | Commission calculated exclusively on backend |
| **Per-Match Storage** | Each game stores: stake, commission, winner_payout |
| **Audit Trail** | Every commission entry timestamped and linked to game |
| **Immutable Records** | Commission records cannot be modified after creation |

### How Commission is Processed

```
GAME END FLOW:
──────────────
1. Game server determines winner
2. Calculate: commission = bet_amount × 0.20
3. Calculate: winner_payout = (bet_amount × 2) - commission
4. Database Transaction:
   ├── INSERT into game_commissions (commission record)
   ├── INSERT into game_results (full game details)
   ├── UPDATE winner's wallet (+winner_payout)
   ├── INSERT into wallet_transactions (audit trail)
   └── COMMIT transaction
```

### Commission Storage Schema

```sql
game_commissions:
  - id: UUID (primary key)
  - game_id: VARCHAR (reference to game)
  - table_id: VARCHAR (reference to table)
  - winner_id: UUID (FK to users)
  - loser_id: UUID (FK to users)
  - bet_amount: DECIMAL (per-player stake)
  - total_pot: DECIMAL (bet_amount × 2)
  - commission_rate: DECIMAL (default 0.20)
  - commission: DECIMAL (actual amount taken)
  - winner_payout: DECIMAL (amount to winner)
  - status: VARCHAR ('completed', 'refunded')
  - created_at: TIMESTAMP
```

---

## 2. GAME RESULT & ACCOUNTING FLOW

### Step-by-Step Game End Process

```
┌─────────────────────────────────────────────────────────────┐
│                    GAME END SEQUENCE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: IDENTIFY WINNER                                    │
│  ─────────────────────────                                  │
│  • Check win condition (4 tokens home OR forfeit/timeout)   │
│  • Record result_type: 'normal_win', 'forfeit', 'timeout'   │
│                                                             │
│  STEP 2: CALCULATE FINANCIALS                               │
│  ────────────────────────────                               │
│  • bet_amount = table.betAmount (per player)                │
│  • total_pot = bet_amount × 2                               │
│  • commission = bet_amount × COMMISSION_RATE (0.20)         │
│  • winner_payout = total_pot - commission                   │
│                                                             │
│  STEP 3: DATABASE TRANSACTION (Atomic)                      │
│  ─────────────────────────────────────                      │
│  BEGIN TRANSACTION                                          │
│    │                                                        │
│    ├─► game_results: Store complete game record             │
│    │   - game_id, players, winner, scores, duration         │
│    │                                                        │
│    ├─► game_commissions: Store commission record            │
│    │   - commission amount, rate, payout                    │
│    │                                                        │
│    ├─► users (winner): ADD winner_payout to balance         │
│    │                                                        │
│    ├─► wallet_transactions (winner):                        │
│    │   - type: 'game_win'                                   │
│    │   - amount: +winner_payout                             │
│    │   - balance_before, balance_after                      │
│    │                                                        │
│    ├─► wallet_transactions (loser):                         │
│    │   - type: 'game_bet' (already deducted at game start)  │
│    │                                                        │
│    └─► COMMIT                                               │
│                                                             │
│  STEP 4: EMIT RESULTS                                       │
│  ─────────────────────                                      │
│  • Notify both players via socket                           │
│  • Update frontend with final balances                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Game Result Data Structure

```javascript
{
  game_id: "game_abc123",
  table_id: "table_xyz789",
  table_type: "default",  // or "custom"
  player1_id: "uuid-player1",
  player2_id: "uuid-player2",
  winner_id: "uuid-player1",
  loser_id: "uuid-player2",
  bet_amount: 20.00,
  winner_payout: 36.00,
  commission: 4.00,
  result_type: "normal_win",  // 'forfeit', 'disconnect', 'timeout'
  game_duration_seconds: 542,
  player1_tokens_finished: 4,
  player2_tokens_finished: 2,
  completed_at: "2025-12-18T10:30:00Z"
}
```

---

## 3. WITHDRAWAL REQUEST SYSTEM

### Player Side Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 PLAYER WITHDRAWAL REQUEST                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. INITIATE REQUEST                                        │
│     ├── Player enters: amount, payment method, account      │
│     └── Submit withdrawal request                           │
│                                                             │
│  2. SERVER VALIDATION                                       │
│     ├── Check: amount ≤ wallet_balance                      │
│     ├── Check: amount ≥ MIN_WITHDRAWAL (₹100)               │
│     ├── Check: amount ≤ MAX_WITHDRAWAL (₹50,000)            │
│     ├── Check: No pending withdrawal exists                 │
│     ├── Check: User not in active game                      │
│     └── Check: Account details valid                        │
│                                                             │
│  3. CREATE WITHDRAWAL RECORD                                │
│     ├── Deduct amount from wallet immediately               │
│     ├── Create wallet_transaction (type: 'withdrawal')      │
│     ├── Store withdrawal request with:                      │
│     │   - amount                                            │
│     │   - user_id                                           │
│     │   - payment_method ('paytm', 'upi', 'bank')           │
│     │   - account_details (JSON)                            │
│     │   - wallet_balance_at_request (snapshot)              │
│     │   - status: 'pending'                                 │
│     └── Return success to player                            │
│                                                             │
│  4. PLAYER NOTIFICATION                                     │
│     └── "Withdrawal request submitted. Processing time:     │
│          10-20 minutes after admin approval."               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Admin Side Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  ADMIN WITHDRAWAL MANAGEMENT                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WITHDRAWAL REQUEST VIEW SHOWS:                             │
│  ─────────────────────────────                              │
│  • Player name / mobile / user ID                           │
│  • Requested amount                                         │
│  • Wallet balance at request time                           │
│  • Current wallet balance                                   │
│  • Payment method (Paytm/UPI/Bank)                          │
│  • Account details:                                         │
│    - Paytm: Mobile number                                   │
│    - UPI: UPI ID (e.g., user@paytm)                         │
│    - Bank: Account no, IFSC, Account holder name            │
│  • Request timestamp                                        │
│  • Request status                                           │
│                                                             │
│  ADMIN ACTIONS:                                             │
│  ──────────────                                             │
│                                                             │
│  [APPROVE] ────────────────────────────────────────────►    │
│     │                                                       │
│     ├── Validate balance still sufficient                   │
│     ├── Update status: 'approved'                           │
│     ├── Set processed_by: admin_id                          │
│     ├── Set processed_at: timestamp                         │
│     ├── Log to admin_audit_logs                             │
│     └── Notify user: "Approved. Processing within 10-20min" │
│                                                             │
│  [MARK COMPLETED] ─────────────────────────────────────►    │
│     │  (After admin manually sends money via Paytm/UPI)     │
│     │                                                       │
│     ├── Update status: 'completed'                          │
│     ├── Set completed_at: timestamp                         │
│     ├── Log to admin_audit_logs                             │
│     └── Notify user: "Withdrawal completed successfully"    │
│                                                             │
│  [REJECT] ─────────────────────────────────────────────►    │
│     │                                                       │
│     ├── Enter rejection reason (required)                   │
│     ├── REFUND: Add amount back to user's wallet            │
│     ├── Create wallet_transaction (type: 'refund')          │
│     ├── Update status: 'rejected'                           │
│     ├── Set rejection_reason: text                          │
│     ├── Log to admin_audit_logs                             │
│     └── Notify user: "Rejected. Reason: [reason].           │
│                       Amount refunded to wallet."           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Withdrawal Status Lifecycle

```
  ┌──────────┐     ┌──────────┐     ┌───────────┐
  │ PENDING  │────►│ APPROVED │────►│ COMPLETED │
  └──────────┘     └──────────┘     └───────────┘
       │
       │           ┌──────────┐
       └──────────►│ REJECTED │ (Refund issued)
                   └──────────┘
```

---

## 4. WITHDRAWAL SAFETY & ANTI-FRAUD

### Safeguards Implemented

| Safeguard | Implementation |
|-----------|----------------|
| **Balance Change Protection** | Snapshot `wallet_balance_at_request` when request created; verify on approval |
| **Double Withdrawal Prevention** | Check `status = 'pending'` before creating new request |
| **Double Approval Prevention** | Database constraint + check `status = 'pending'` before approve |
| **Atomic Operations** | All wallet changes in database transactions |
| **Audit Trail** | Every action logged to `admin_audit_logs` with timestamps |

### Server Crash Recovery

```
SCENARIO: Server crashes during withdrawal approval

PROTECTION MECHANISM:
─────────────────────
1. Withdrawal status only changes to 'approved' AFTER all
   database operations complete (atomic transaction)

2. If crash occurs mid-transaction:
   - Transaction rolls back automatically
   - Withdrawal remains 'pending'
   - Admin retries approval

3. If crash after DB commit but before socket notification:
   - User can refresh to see updated status
   - No financial inconsistency
```

### Fraud Detection Flags

```javascript
AUTOMATIC FLAGS (for admin review):
─────────────────────────────────
• Multiple withdrawal requests in 24 hours (>3)
• Large withdrawal (>₹10,000) from new account (<7 days)
• Withdrawal request immediately after large deposit
• Unusual pattern: deposit → play 1 game → withdraw all
• Account details changed recently before withdrawal
```

---

## 5. ADMIN GAME REPORTING DASHBOARD

### Daily Reports View

```
┌─────────────────────────────────────────────────────────────┐
│                    TODAY'S SUMMARY                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Games Played Today:        47                              │
│  Total Stake Volume:        ₹4,700                          │
│  Admin Commission Earned:   ₹470                            │
│  Winners Today:             47                              │
│  Losers Today:              47                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          HOURLY GAME DISTRIBUTION                    │   │
│  │  12 ████████████                                     │   │
│  │  10 ██████████                                       │   │
│  │   8 ████████                                         │   │
│  │   6 ██████                                           │   │
│  │   4 ████                                             │   │
│  │   2 ██                                               │   │
│  │     00 02 04 06 08 10 12 14 16 18 20 22             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Game History View

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              GAME HISTORY                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Match ID      │ Date & Time        │ Players          │ Winner    │ Stake  │ Comm. │
├───────────────┼────────────────────┼──────────────────┼───────────┼────────┼───────┤
│ game_abc123   │ 2025-12-18 10:30   │ Player1 vs P2    │ Player1   │ ₹20    │ ₹4    │
│ game_def456   │ 2025-12-18 10:25   │ Player3 vs P4    │ Player4   │ ₹50    │ ₹10   │
│ game_ghi789   │ 2025-12-18 10:20   │ Player5 vs P6    │ Player5   │ ₹100   │ ₹20   │
│ ...           │ ...                │ ...              │ ...       │ ...    │ ...   │
└─────────────────────────────────────────────────────────────────────────────────────┘

FILTERS:
┌────────────────────────────────────────────────────────────┐
│ Date Range: [Start Date] to [End Date]                     │
│ Player ID:  [_______________]                              │
│ Game Type:  [All ▼] [Default] [Custom]                     │
│ Min Stake:  [___] Max Stake: [___]                         │
│                                         [Apply Filters]    │
└────────────────────────────────────────────────────────────┘
```

---

## 6. USER MANAGEMENT & LOGIN TRACKING

### User List View

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER MANAGEMENT                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ User ID       │ Mobile      │ Balance  │ Games │ Won  │ Lost │ Registered   │ Status│
├───────────────┼─────────────┼──────────┼───────┼──────┼──────┼──────────────┼───────┤
│ uuid-user1    │ 9876543210  │ ₹1,250   │ 45    │ 28   │ 17   │ 2025-12-01   │ Active│
│ uuid-user2    │ 9123456780  │ ₹500     │ 12    │ 5    │ 7    │ 2025-12-15   │ Active│
│ uuid-user3    │ 9988776655  │ ₹0       │ 3     │ 0    │ 3    │ 2025-12-17   │ Active│
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### User Detail View

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PROFILE: uuid-user1                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BASIC INFO                                                 │
│  ──────────                                                 │
│  User ID:         uuid-user1                                │
│  Mobile:          9876543210                                │
│  Email:           user@email.com                            │
│  Registered:      2025-12-01 14:30:00                       │
│  Status:          Active                                    │
│                                                             │
│  WALLET                                                     │
│  ──────                                                     │
│  Current Balance: ₹1,250                                    │
│  Total Deposits:  ₹2,000                                    │
│  Total Withdrawn: ₹500                                      │
│  Total Winnings:  ₹1,450                                    │
│  Total Losses:    ₹700                                      │
│                                                             │
│  GAME STATS                                                 │
│  ──────────                                                 │
│  Games Played:    45                                        │
│  Games Won:       28 (62%)                                  │
│  Games Lost:      17                                        │
│  Avg. Stake:      ₹35                                       │
│                                                             │
│  LOGIN ACTIVITY                                             │
│  ──────────────                                             │
│  Total Logins:    127                                       │
│  Last Login:      2025-12-18 09:15:00                       │
│  Last IP:         192.168.1.100                             │
│  Device:          Android / Chrome                          │
│                                                             │
│  ACTIONS:                                                   │
│  [View Wallet History] [View Game History] [Suspend User]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. ADMIN WALLET & EARNINGS VIEW

### Admin Dashboard Summary

```
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN EARNINGS DASHBOARD                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ TOTAL COMMISSION │  │ TODAY'S EARNINGS │                │
│  │     ₹45,230      │  │      ₹470        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ PENDING W/D      │  │ APPROVED W/D     │                │
│  │   ₹12,500 (8)    │  │   ₹5,000 (3)     │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  NET PROFIT CALCULATION:                                    │
│  ─────────────────────                                      │
│  Total Commission Earned:     ₹45,230                       │
│  Total Withdrawals Completed: ₹28,500                       │
│  Pending Withdrawals:         ₹12,500                       │
│  ─────────────────────────────────────                      │
│  Available Net Profit:        ₹4,230                        │
│                                                             │
│  PERIOD SUMMARIES:                                          │
│  ─────────────────                                          │
│  This Week:   ₹3,200 commission | 320 games                 │
│  This Month:  ₹12,800 commission | 1,280 games              │
│  All Time:    ₹45,230 commission | 4,523 games              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. EDGE CASES & FAILURE HANDLING

### Scenario Handling Matrix

| Scenario | Detection | Handling |
|----------|-----------|----------|
| **Game ends but payout fails** | Transaction rollback | Game remains in 'active' state; retry mechanism triggers |
| **Withdrawal during active game** | Pre-validation check | Reject withdrawal request until game completes |
| **Admin approves wrong request** | Audit log review | Implement "Undo" within 5 minutes; manual correction by super_admin |
| **Duplicate admin actions** | Optimistic locking + status check | Return "Already processed" error |
| **Server crash mid-transaction** | PostgreSQL ACID | Auto-rollback to consistent state |
| **Data inconsistency detected** | Scheduled reconciliation job | Alert admin; create discrepancy report |

### Recovery Procedures

```
PAYOUT FAILURE RECOVERY:
────────────────────────
1. Game ends → Start payout transaction
2. If failure detected:
   a. Log error with full context
   b. Set game status to 'payout_pending'
   c. Add to retry queue
   d. Alert admin dashboard
3. Retry job runs every 1 minute
4. After 3 failures: Manual admin intervention required

WALLET RECONCILIATION:
──────────────────────
1. Daily job compares:
   - Sum of all wallet transactions
   - Current wallet balances
2. If mismatch > ₹1:
   - Generate discrepancy report
   - Alert admin immediately
   - Lock affected accounts until resolved
```

---

## 9. AUDIT LOGS & TRANSPARENCY

### Audit Log Categories

| Category | Events Logged |
|----------|---------------|
| **Authentication** | admin_login, admin_logout, password_change |
| **Withdrawals** | withdrawal_view, withdrawal_approve, withdrawal_reject, withdrawal_complete |
| **Users** | user_view, user_suspend, user_unsuspend, user_balance_adjust |
| **Games** | game_view, game_void, game_refund |
| **Settings** | setting_change |
| **System** | backup_created, maintenance_toggle |

### Audit Log Structure

```json
{
  "id": "uuid-log-entry",
  "admin_id": "uuid-admin",
  "admin_username": "adil",
  "action": "withdrawal_approve",
  "target_table": "withdrawals",
  "target_id": "uuid-withdrawal",
  "old_value": {
    "status": "pending"
  },
  "new_value": {
    "status": "approved",
    "processed_by": "uuid-admin",
    "processed_at": "2025-12-18T10:30:00Z"
  },
  "ip_address": "192.168.1.50",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-12-18T10:30:00Z"
}
```

### Immutability Guarantee

```sql
-- Audit logs table has:
-- 1. No UPDATE trigger (only INSERT allowed)
-- 2. No DELETE permissions for any role
-- 3. Retention policy: Keep forever (or archive after 2 years)

-- RLS Policy Example:
CREATE POLICY audit_insert_only ON admin_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies = immutable
```

---

## 10. FUTURE EXTENSIONS (Roadmap)

### Phase 2 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Auto Payout** | Integrate UPI/Paytm API for automatic withdrawals | High |
| **Admin Roles** | super_admin, admin, moderator, viewer | Medium |
| **Fraud Detection** | ML-based anomaly detection on betting patterns | Medium |
| **CSV Export** | Export reports to CSV/Excel | High |
| **Email Notifications** | Transactional emails for withdrawals, wins | Medium |

### Phase 3 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **SMS Alerts** | SMS for withdrawal status, large wins | Low |
| **Mobile Admin App** | React Native admin dashboard | Low |
| **Real-time Analytics** | Live dashboard with WebSocket updates | Medium |
| **API Keys** | External API access for integrations | Low |
| **Multi-currency** | Support USD, other currencies | Future |

---

## Quick Setup Instructions

1. **Run SQL Schema:**
   ```bash
   # In Supabase SQL Editor, run:
   # Contents of COMPLETE_ADMIN_SYSTEM.sql
   ```

2. **Default Admin Credentials:**
   - Username: `adil`
   - Password: `123456`

3. **Access Admin Panel:**
   - URL: `http://localhost:5173/admin`
   - Login with above credentials

4. **Change Password:**
   - Immediately change password after first login
   - Navigate to Admin Dashboard → Change Password

---

## Commission Rate Configuration

Current: **20% of table amount (per-player stake)**

To modify, update in:
1. `system_settings` table: `commission_rate` key
2. `backend/game/utils/constants.js`: `COMMISSION_RATE`

```javascript
// constants.js
export const COMMISSION_RATE = 0.20; // 20%
```

---

*Document Version: 1.0*
*Last Updated: 2025-12-18*
