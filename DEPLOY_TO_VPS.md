# 🚀 Deploy Ludo Battle Game to VPS

## VPS Credentials
- **IP Address:** 74.48.78.32
- **Username:** root
- **Password:** Jh6CN6W1AQwl
- **Domain:** https://ludobattle.com

---

## Step 1: Clean VPS (Remove Previous Deployment)

### Option A: Using the cleanup script (Recommended)

1. **Connect to VPS:**
   ```bash
   ssh root@74.48.78.32
   ```

2. **Upload cleanup script:**
   ```bash
   # On your local machine, from project directory:
   scp cleanup-vps.sh root@74.48.78.32:~/
   ```

3. **Run cleanup script on VPS:**
   ```bash
   # On VPS:
   chmod +x ~/cleanup-vps.sh
   ~/cleanup-vps.sh
   ```

### Option B: Manual cleanup

```bash
# Connect to VPS
ssh root@74.48.78.32

# Stop all processes
pkill -f node
pm2 stop all
pm2 delete all
systemctl stop nginx

# Remove old directories
rm -rf /var/www/ludobattle
rm -rf ~/ludo-game
rm -rf ~/Web-based-ludo-betting-game

# Remove Nginx config
rm -f /etc/nginx/sites-enabled/ludobattle
rm -f /etc/nginx/sites-available/ludobattle

# Clean logs
rm -rf ~/.pm2/logs/*
```

---

## Step 2: Push Code to GitHub

### On your local machine:

```bash
cd /Users/kpklaptops/Desktop/Web-based-ludo-betting-game

# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Production ready - Paytm integration fixed"

# Push to GitHub
git push origin main
```

**Note:** Make sure your GitHub repository URL is set. If not:
```bash
git remote -v  # Check current remote
# If needed, set remote:
# git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

---

## Step 3: Install Required Software on VPS

```bash
# Connect to VPS
ssh root@74.48.78.32

# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install PM2 (Process Manager)
npm install -g pm2

# Install Git
apt install -y git

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Verify installations
node --version
npm --version
nginx -v
pm2 --version
```

---

## Step 4: Clone Repository on VPS

```bash
# Create application directory
mkdir -p /var/www/ludobattle
cd /var/www/ludobattle

# Clone your repository (replace with your GitHub URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Or if you need to set up SSH keys:
# git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git .
```

---

## Step 5: Configure Backend Environment

```bash
cd /var/www/ludobattle/backend

# Copy example env file
cp env.example .env

# Edit .env file
nano .env
```

**Update `.env` with these values:**

```env
# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://ludobattle.com

# Supabase Configuration (Get from Supabase Dashboard)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (Generate a strong random string)
JWT_SECRET=your_strong_random_jwt_secret_here

# Paytm Payment Gateway Configuration (Production)
PAYTM_MERCHANT_ID=WebHos32378446216792
PAYTM_MERCHANT_KEY=9xhvwj1I0V#3SE2s
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail109
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=https://ludobattle.com/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

## Step 6: Configure Frontend Environment

```bash
cd /var/www/ludobattle/Frontend

# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

**Update `.env` with these values:**

```env
VITE_API_BASE_URL=https://ludobattle.com/api
VITE_SOCKET_URL=https://ludobattle.com
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

## Step 7: Install Dependencies and Build

### Backend:
```bash
cd /var/www/ludobattle/backend
npm install
```

### Frontend:
```bash
cd /var/www/ludobattle/Frontend
npm install
npm run build
```

The build output will be in `/var/www/ludobattle/Frontend/dist`

---

## Step 8: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/ludobattle
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name ludobattle.com www.ludobattle.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

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

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

**Enable the site:**
```bash
ln -s /etc/nginx/sites-available/ludobattle /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # Remove default site
nginx -t  # Test configuration
systemctl restart nginx
```

---

## Step 9: Setup SSL Certificate (HTTPS)

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d ludobattle.com -d www.ludobattle.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**After SSL setup, update Nginx config to use HTTPS:**
```bash
nano /etc/nginx/sites-available/ludobattle
```

Certbot will automatically update your config, but verify it includes:
- `listen 443 ssl;`
- SSL certificate paths
- HTTP to HTTPS redirect

**Reload Nginx:**
```bash
nginx -t
systemctl reload nginx
```

---

## Step 10: Start Backend with PM2

```bash
cd /var/www/ludobattle

# Use the ecosystem.config.js file
pm2 start ecosystem.config.js

# Or start manually:
# cd /var/www/ludobattle/backend
# pm2 start server.js --name "ludobattle-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

**Check PM2 status:**
```bash
pm2 status
pm2 logs ludobattle-backend
```

---

## Step 11: Whitelist Callback URL in Paytm Dashboard

**CRITICAL:** Before testing payments:

1. Go to: https://business.paytm.com
2. Login with your Paytm merchant account
3. Navigate to: **Settings → API Settings**
4. Find **"Callback URL Whitelist"** or **"Return URL"**
5. Add: `https://ludobattle.com/api/payments/callback`
6. Save changes

**Without this, Paytm will reject payment callbacks!**

---

## Step 12: Test Deployment

1. **Visit:** https://ludobattle.com
2. **Check backend:** https://ludobattle.com/api/health (if you have a health endpoint)
3. **Test payment flow:**
   - Login to your account
   - Go to Add Funds
   - Try adding funds
   - Should redirect to Paytm payment page
   - Complete payment
   - Should redirect back to your site

---

## Step 13: Monitor and Troubleshoot

### Check PM2 logs:
```bash
pm2 logs ludobattle-backend
```

### Check Nginx logs:
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Check PM2 status:
```bash
pm2 status
pm2 monit
```

### Restart services if needed:
```bash
pm2 restart all
systemctl restart nginx
```

---

## Common Issues and Solutions

### Issue: 502 Bad Gateway
- **Solution:** Check if backend is running: `pm2 status`
- **Solution:** Check backend logs: `pm2 logs ludobattle-backend`
- **Solution:** Verify backend is listening on port 5000: `netstat -tulpn | grep 5000`

### Issue: Payment redirects to dummy.com
- **Solution:** Verify `PAYTM_CALLBACK_URL` in `.env` is `https://ludobattle.com/api/payments/callback`
- **Solution:** Verify callback URL is whitelisted in Paytm dashboard
- **Solution:** Check backend logs for Paytm errors

### Issue: SSL Certificate errors
- **Solution:** Verify DNS A record points to VPS IP (74.48.78.32)
- **Solution:** Check firewall allows ports 80 and 443
- **Solution:** Re-run certbot: `certbot --nginx -d ludobattle.com -d www.ludobattle.com`

### Issue: Frontend not loading
- **Solution:** Verify frontend build exists: `ls -la /var/www/ludobattle/Frontend/dist`
- **Solution:** Rebuild frontend: `cd /var/www/ludobattle/Frontend && npm run build`
- **Solution:** Check Nginx error logs

---

## Firewall Configuration

```bash
# Allow HTTP, HTTPS, and SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Backup and Updates

### To update the application:

```bash
cd /var/www/ludobattle
git pull origin main
cd backend
npm install
cd ../Frontend
npm install
npm run build
pm2 restart all
```

---

## ✅ Deployment Checklist

- [ ] VPS cleaned (previous deployment removed)
- [ ] Code pushed to GitHub
- [ ] Software installed (Node.js, Nginx, PM2, Certbot)
- [ ] Repository cloned on VPS
- [ ] Backend `.env` configured with production values
- [ ] Frontend `.env` configured with production values
- [ ] Dependencies installed (backend and frontend)
- [ ] Frontend built successfully
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Backend running with PM2
- [ ] Callback URL whitelisted in Paytm dashboard
- [ ] Website accessible at https://ludobattle.com
- [ ] Payment flow tested and working

---

**🎉 Your application should now be live at https://ludobattle.com!**

