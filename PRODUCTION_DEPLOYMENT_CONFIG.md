# Production Deployment Configuration for VPS

## ✅ Yes, Deploying to VPS Will Fix the Issue!

When you deploy to a VPS with a **real domain**, Paytm will accept your callback URL because it's no longer localhost.

## 🔧 Production Configuration

### Step 1: Update `backend/.env` on VPS

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Your VPS Domain (replace with your actual domain)
FRONTEND_URL=https://yourdomain.com

# Supabase Configuration (keep your existing values)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (use a strong random string)
JWT_SECRET=your_strong_random_jwt_secret_here

# Paytm Payment Gateway Configuration (Production)
PAYTM_MERCHANT_ID=WebHos32378446216792
PAYTM_MERCHANT_KEY=9xhvwj1I0V#3SE2s
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail109
PAYTM_CHANNEL_ID=WEB

# CRITICAL: Use your real domain for callback URL
PAYTM_CALLBACK_URL=https://yourdomain.com/api/payments/callback

# Production Paytm URL
PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
```

### Step 2: Whitelist Callback URL in Paytm Dashboard

**IMPORTANT:** Before deploying, you MUST whitelist your callback URL:

1. Login to Paytm Business Dashboard: https://business.paytm.com
2. Go to **Settings → API Settings**
3. Find **"Callback URL Whitelist"** or **"Return URL"**
4. Add: `https://yourdomain.com/api/payments/callback`
5. Save the changes

**⚠️ Without whitelisting, Paytm will reject the callback!**

### Step 3: Update Frontend Environment

If you have a frontend `.env` file, update:

```env
VITE_API_BASE_URL=https://yourdomain.com/api
```

### Step 4: Deploy Checklist

- [ ] Domain is configured and pointing to your VPS
- [ ] SSL certificate is installed (HTTPS required)
- [ ] Backend `.env` has production domain in `PAYTM_CALLBACK_URL`
- [ ] Backend `.env` has production domain in `FRONTEND_URL`
- [ ] Callback URL is whitelisted in Paytm dashboard
- [ ] Server is running on port 5000 (or your chosen port)
- [ ] Firewall allows port 5000 (or your chosen port)
- [ ] PM2 or similar process manager is running the server

### Step 5: Test After Deployment

1. Visit: `https://yourdomain.com`
2. Login to your account
3. Try adding funds
4. Should redirect to Paytm payment page (not dummy.com)
5. Complete payment
6. Should redirect back to your site

## 🎯 What This Fixes

- ✅ **No more dummy.com redirect** - Real domain is accepted
- ✅ **No more certificate errors** - Real SSL certificate
- ✅ **Payments will work** - Production environment configured correctly

## 📝 Example Configuration

If your domain is `ludobattle.com`:

```env
FRONTEND_URL=https://ludobattle.com
PAYTM_CALLBACK_URL=https://ludobattle.com/api/payments/callback
```

## ⚠️ Important Notes

1. **HTTPS is REQUIRED** - Paytm only accepts HTTPS callback URLs
2. **Whitelist is MANDATORY** - Must add callback URL in Paytm dashboard
3. **Domain must be live** - DNS must be pointing to your VPS
4. **SSL certificate required** - Use Let's Encrypt (free) or paid SSL

## 🚀 After Deployment

Once deployed, the payment flow will be:
1. User clicks "Add Funds"
2. Redirects to Paytm payment page ✅
3. User completes payment
4. Paytm redirects to `https://yourdomain.com/api/payments/callback` ✅
5. Your server processes the callback
6. User redirected to payment status page ✅

**Everything will work once you have a real domain!**

