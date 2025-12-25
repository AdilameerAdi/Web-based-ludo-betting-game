# 🚀 Deployment Summary - Ludo Battle Game

## ✅ What's Ready

1. **Backend Configuration:** `backend/env.example` updated with production domain (ludobattle.com)
2. **VPS Cleanup Script:** `cleanup-vps.sh` and `VPS_CLEANUP_COMMANDS.sh` created
3. **Deployment Guides:** Complete step-by-step instructions created
4. **Git Repository:** Already configured with remote: `https://github.com/AdilameerAdi/Web-based-ludo-betting-game.git`

---

## 📋 Step-by-Step Deployment Process

### Step 1: Push Code to GitHub

**On your local machine:**

```bash
cd /Users/kpklaptops/Desktop/Web-based-ludo-betting-game

# Check what will be committed
git status

# Add all changes
git add .

# Commit
git commit -m "Production ready - Paytm integration fixed for ludobattle.com"

# Push to GitHub
git push origin main
```

**Note:** Make sure you have GitHub credentials configured. If prompted, use your GitHub username and Personal Access Token.

---

### Step 2: Clean VPS

**Connect to VPS:**
```bash
ssh root@74.48.78.32
# Password: Jh6CN6W1AQwl
```

**Run cleanup commands:**
```bash
# Stop all processes
pkill -f node || true
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
systemctl stop nginx

# Remove old directories
rm -rf /var/www/ludobattle
rm -rf ~/ludo-game
rm -rf ~/Web-based-ludo-betting-game

# Remove Nginx configs
rm -f /etc/nginx/sites-enabled/ludobattle
rm -f /etc/nginx/sites-available/ludobattle

# Clean logs
rm -rf ~/.pm2/logs/* 2>/dev/null || true

echo "VPS cleaned successfully!"
```

---

### Step 3: Install Required Software (if not already installed)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2

# Install Git
apt install -y git

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

---

### Step 4: Clone Repository

```bash
# Create application directory
mkdir -p /var/www/ludobattle
cd /var/www/ludobattle

# Clone repository
git clone https://github.com/AdilameerAdi/Web-based-ludo-betting-game.git .

# If you need to authenticate, use:
# git clone https://YOUR_USERNAME:YOUR_TOKEN@github.com/AdilameerAdi/Web-based-ludo-betting-game.git .
```

---

### Step 5: Configure Backend Environment

```bash
cd /var/www/ludobattle/backend

# Copy example file
cp env.example .env

# Edit .env file
nano .env
```

**Update these values in `.env`:**

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://ludobattle.com

# Add your Supabase credentials
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Generate a strong JWT secret (random string)
JWT_SECRET=your_strong_random_jwt_secret_here

# Paytm Configuration (already correct in env.example)
PAYTM_MERCHANT_ID=WebHos32378446216792
PAYTM_MERCHANT_KEY=9xhvwj1I0V#3SE2s
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail109
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=https://ludobattle.com/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Configure Frontend Environment

```bash
cd /var/www/ludobattle/Frontend

# Create .env file
nano .env
```

**Add these lines:**

```env
VITE_API_BASE_URL=https://ludobattle.com/api
VITE_SOCKET_URL=https://ludobattle.com
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 7: Install Dependencies and Build

```bash
# Backend
cd /var/www/ludobattle/backend
npm install

# Frontend
cd /var/www/ludobattle/Frontend
npm install
npm run build
```

---

### Step 8: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/ludobattle
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name ludobattle.com www.ludobattle.com;

    # Frontend
    location / {
        root /var/www/ludobattle/Frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/ludobattle /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

### Step 9: Setup SSL Certificate

```bash
# Get SSL certificate
certbot --nginx -d ludobattle.com -d www.ludobattle.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Redirect HTTP to HTTPS: Yes
```

---

### Step 10: Start Backend with PM2

```bash
cd /var/www/ludobattle

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs (usually something like: sudo env PATH=... pm2 startup systemd -u root --hp /root)
```

**Check status:**
```bash
pm2 status
pm2 logs ludobattle-backend
```

---

### Step 11: ⚠️ CRITICAL - Whitelist Paytm Callback URL

**Before testing payments, you MUST:**

1. Go to: https://business.paytm.com
2. Login with Paytm merchant account
3. Navigate to: **Settings → API Settings**
4. Find **"Callback URL Whitelist"** or **"Return URL"**
5. Add: `https://ludobattle.com/api/payments/callback`
6. Save changes

**Without this, Paytm will reject payment callbacks!**

---

### Step 12: Test Deployment

1. Visit: https://ludobattle.com
2. Test login/registration
3. Test payment flow:
   - Login
   - Go to Add Funds
   - Try adding funds
   - Should redirect to Paytm
   - Complete payment
   - Should redirect back to site

---

## 🔍 Troubleshooting

### Check Backend Logs
```bash
pm2 logs ludobattle-backend
```

### Check Nginx Logs
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
pm2 restart all
systemctl restart nginx
```

### Check if Backend is Running
```bash
pm2 status
netstat -tulpn | grep 5000
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] VPS cleaned (old deployment removed)
- [ ] Software installed (Node.js, Nginx, PM2, Certbot)
- [ ] Repository cloned on VPS
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Dependencies installed
- [ ] Frontend built
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Backend running with PM2
- [ ] Paytm callback URL whitelisted
- [ ] Website accessible
- [ ] Payment flow tested

---

**🎉 Once all steps are complete, your site will be live at https://ludobattle.com!**

