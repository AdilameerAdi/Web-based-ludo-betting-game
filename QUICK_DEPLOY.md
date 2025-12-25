# ⚡ Quick Deployment Guide

## VPS Info
- **IP:** 74.48.78.32
- **User:** root
- **Password:** Jh6CN6W1AQwl
- **Domain:** https://ludobattle.com

---

## 🧹 Step 1: Clean VPS

```bash
# Connect to VPS
ssh root@74.48.78.32

# Run cleanup commands
pkill -f node
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
systemctl stop nginx
rm -rf /var/www/ludobattle
rm -rf ~/ludo-game
rm -rf ~/Web-based-ludo-betting-game
rm -f /etc/nginx/sites-enabled/ludobattle
rm -f /etc/nginx/sites-available/ludobattle
```

---

## 📤 Step 2: Push to GitHub

```bash
# On your local machine
cd /Users/kpklaptops/Desktop/Web-based-ludo-betting-game

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Production ready - Paytm integration fixed for ludobattle.com"

# Push
git push origin main
```

---

## 🚀 Step 3: Deploy to VPS

See `DEPLOY_TO_VPS.md` for complete step-by-step instructions.

**Quick commands:**
```bash
# Connect to VPS
ssh root@74.48.78.32

# Install software (if not installed)
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs nginx git certbot python3-certbot-nginx
npm install -g pm2

# Clone repo (replace YOUR_REPO_URL)
mkdir -p /var/www/ludobattle
cd /var/www/ludobattle
git clone YOUR_REPO_URL .

# Configure backend
cd backend
cp env.example .env
nano .env  # Update with production values

# Configure frontend
cd ../Frontend
cp .env.example .env
nano .env  # Update: VITE_API_BASE_URL=https://ludobattle.com/api

# Install & build
cd backend && npm install
cd ../Frontend && npm install && npm run build

# Setup Nginx (see DEPLOY_TO_VPS.md for config)
# Setup SSL: certbot --nginx -d ludobattle.com

# Start with PM2
cd /var/www/ludobattle
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## ⚠️ CRITICAL: Whitelist Paytm Callback

1. Go to: https://business.paytm.com
2. Settings → API Settings
3. Add: `https://ludobattle.com/api/payments/callback`
4. Save

---

## ✅ Test

Visit: https://ludobattle.com

