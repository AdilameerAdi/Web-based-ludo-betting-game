# Deployment Checklist

## ✅ Pre-Deployment Security Checks

### 1. Environment Variables
- [x] `.env` files are in `.gitignore`
- [x] `env.example` file exists with all required variables
- [x] No hardcoded secrets in code
- [x] JWT_SECRET requires environment variable (no fallback)
- [x] SUPABASE_SERVICE_ROLE_KEY added to env.example

### 2. Required Environment Variables

#### Backend (.env)
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_strong_random_jwt_secret
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_WEBSITE=WEBSTAGING (or WEB for production)
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=https://your-backend-domain.com/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw-stage.paytm.in/merchant-transaction/processTransaction (or production URL)
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

### 3. Security Fixes Applied
- [x] Removed hardcoded JWT_SECRET fallback
- [x] JWT_SECRET now requires environment variable
- [x] Service role key properly configured
- [x] No sensitive data in console logs

### 4. Code Quality
- [x] No hardcoded localhost URLs (all use environment variables)
- [x] CORS properly configured with FRONTEND_URL
- [x] Error handling in place
- [x] No exposed API keys or secrets

## 📋 Deployment Steps

### 1. Backend Deployment

1. **Set Environment Variables**
   - Add all required environment variables to your hosting platform
   - Use strong, random JWT_SECRET
   - Update FRONTEND_URL to production URL
   - Update PAYTM_CALLBACK_URL to production URL

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Verify**
   - Check server logs for successful startup
   - Verify Supabase connection
   - Test admin login endpoint

### 2. Frontend Deployment

1. **Set Environment Variables**
   - VITE_API_BASE_URL: Your backend API URL
   - VITE_SOCKET_URL: Your backend WebSocket URL

2. **Build**
   ```bash
   npm run build
   ```

3. **Deploy**
   - Deploy the `dist` folder to your hosting platform
   - Ensure environment variables are set in your hosting platform

### 3. Database Setup

1. **Run SQL Scripts** (if not already done)
   - `backend/WITHDRAWAL_TABLE_SETUP.sql`
   - `backend/ADMIN_TABLE_SETUP.sql`
   - `backend/COMPLETE_ADMIN_SYSTEM.sql` (if needed)

2. **Verify Tables**
   - users
   - admins
   - withdrawals
   - game_commissions
   - game_results
   - payments
   - tables
   - games
   - game_actions

### 4. Post-Deployment Verification

- [ ] Admin login works
- [ ] User registration works
- [ ] Payment integration works
- [ ] Game creation and play works
- [ ] Withdrawal system works
- [ ] Admin dashboard shows all data
- [ ] WebSocket connections work
- [ ] CORS allows frontend domain

## 🔒 Security Reminders

1. **Never commit `.env` files**
2. **Use strong, random JWT_SECRET** (at least 32 characters)
3. **Keep SUPABASE_SERVICE_ROLE_KEY secret** (only use in backend)
4. **Use HTTPS in production**
5. **Update Paytm to production credentials** when ready
6. **Review CORS settings** for production domain
7. **Enable Supabase RLS policies** as needed
8. **Regularly update dependencies** for security patches

## 🐛 Common Issues

### Issue: CORS errors
**Solution**: Update FRONTEND_URL in backend .env to match production frontend URL

### Issue: WebSocket connection fails
**Solution**: Ensure VITE_SOCKET_URL points to correct backend URL with WebSocket support

### Issue: Admin can't see users
**Solution**: Verify SUPABASE_SERVICE_ROLE_KEY is set correctly

### Issue: JWT token errors
**Solution**: Ensure JWT_SECRET is set and same across all instances

## 📝 Notes

- All localhost URLs are fallbacks for development
- Production should use environment variables
- Test all features in staging before production
- Monitor server logs for errors
- Set up error tracking (e.g., Sentry) for production

