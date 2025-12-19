# URGENT: Fix 503 Error - Wrong Paytm URL

## The Problem
You're getting **503 Service Unavailable** because your `.env` file has the **WRONG Paytm URL**.

## The Fix (3 Steps)

### Step 1: Open `backend/.env` file

### Step 2: Find this line:
```env
PAYTM_PAYMENT_URL=https://securegw-stage.paytm.in/merchant-transaction/processTransaction
```

### Step 3: Change it to:
```env
PAYTM_PAYMENT_URL=https://securegw-stage.paytm.in/theia/processTransaction
```

**ONLY change:** `/merchant-transaction/processTransaction` → `/theia/processTransaction`

### Step 4: Save the file and RESTART your server

```bash
# Stop server (Ctrl+C in terminal)
npm start
```

## After Restart

You should see in logs:
```
[Payment] Using PAYTM_PAYMENT_URL from environment: https://securegw-stage.paytm.in/theia/processTransaction
```

**NOT:**
```
[Payment] Using PAYTM_PAYMENT_URL from environment: https://securegw-stage.paytm.in/merchant-transaction/processTransaction
```

## Why This Happens

- ❌ **Wrong URL**: `/merchant-transaction/processTransaction` → Returns 503
- ✅ **Correct URL**: `/theia/processTransaction` → Works correctly

The old endpoint is deprecated or doesn't exist, causing 503 errors.

## Quick Check

After updating `.env` and restarting, the server will now warn you if the wrong URL is detected.

## Test

1. Update `.env` file
2. Restart server
3. Try adding funds
4. Should redirect to Paytm (no 503 error)

