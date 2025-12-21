# 🚀 Complete Deployment Guide - Ludo Game Application

This guide provides step-by-step instructions to **completely remove** the previous deployment and deploy the application **from scratch** on a fresh Ubuntu VPS server.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Remove Previous Deployment](#step-1-remove-previous-deployment)
3. [Step 2: Server Setup](#step-2-server-setup)
4. [Step 3: Install Required Software](#step-3-install-required-software)
5. [Step 4: Clone Repository](#step-4-clone-repository)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Install Dependencies](#step-6-install-dependencies)
8. [Step 7: Build Frontend](#step-7-build-frontend)
9. [Step 8: Configure PM2](#step-8-configure-pm2)
10. [Step 9: Configure Nginx](#step-9-configure-nginx)
11. [Step 10: Setup SSL Certificate](#step-10-setup-ssl-certificate)
12. [Step 11: Configure Firewall](#step-11-configure-firewall)
13. [Step 12: Start Services](#step-12-start-services)
14. [Step 13: Verify Deployment](#step-13-verify-deployment)
15. [Troubleshooting](#troubleshooting)
16. [Useful Commands](#useful-commands)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Ubuntu 20.04+ VPS server with root/sudo access
- ✅ Domain name pointed to your server IP (A record)
- ✅ SSH access to your server
- ✅ GitHub repository URL (public or private with access token)
- ✅ Supabase project credentials
- ✅ Paytm merchant credentials
- ✅ Basic knowledge of Linux terminal commands

**Required Information:**
- Server IP address
- Domain name
- GitHub repository URL
- Supabase URL, Anon Key, and Service Role Key
- Paytm Merchant ID and Key
- Strong JWT secret (generate a random string)

---

## Step 1: Remove Previous Deployment

If you have a previous deployment, follow these steps to completely remove it:

### 1.1 Connect to Your Server

```bash
ssh root@your-server-ip
# Or if using a different user:
ssh username@your-server-ip
```

### 1.2 Stop All Running Services

```bash
# Stop PM2 processes
pm2 stop all
pm2 delete all

# Stop Nginx
sudo systemctl stop nginx
```

### 1.3 Remove PM2 from Startup

```bash
pm2 unstartup
```

### 1.4 Remove Project Directory

```bash
# Navigate to project location
cd /var/www

# Remove the entire project directory (if it exists)
sudo rm -rf ludo-game

# Or if you want to keep a backup first:
sudo mv ludo-game ludo-game-backup-$(date +%Y%m%d)
```

### 1.5 Remove Nginx Configuration

```bash
# Remove Nginx site configuration
sudo rm -f /etc/nginx/sites-enabled/ludo-game
sudo rm -f /etc/nginx/sites-available/ludo-game

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 1.6 Remove SSL Certificates (Optional)

If you want to completely remove SSL certificates:

```bash
# List certificates
sudo certbot certificates

# Delete certificate (replace with your domain)
sudo certbot delete --cert-name your-domain.com
```

### 1.7 Clean Up Node.js Processes (If Any)

```bash
# Kill any remaining Node.js processes
sudo pkill -f node

# Check if ports are still in use
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :5173
```

**✅ Previous deployment removed!** Now proceed with fresh installation.

---

## Step 2: Server Setup

### 2.1 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

**Password Required:** Enter your sudo password when prompted.

### 2.2 Install Essential Tools

```bash
sudo apt install -y git curl wget build-essential
```

---

## Step 3: Install Required Software

### 3.1 Install Node.js 18.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

**Password Required:** Sudo password for installation.

### 3.2 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on system boot
pm2 startup

# Follow the instructions shown. You'll need to run a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-username --hp /home/your-username
```

**Password Required:** 
- Sudo password for npm global install
- Sudo password for the `pm2 startup` command

### 3.3 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Start Nginx
sudo systemctl start nginx

# Check Nginx status
sudo systemctl status nginx
```

**Password Required:** Sudo password.

### 3.4 Install Certbot (for SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Password Required:** Sudo password.

---

## Step 4: Clone Repository

### 4.1 Create Project Directory

```bash
# Create directory
sudo mkdir -p /var/www/ludo-game

# Set ownership to your user
sudo chown -R $USER:$USER /var/www/ludo-game

# Navigate to directory
cd /var/www/ludo-game
```

**Password Required:** Sudo password for directory creation.

### 4.2 Clone from GitHub

**For Public Repository:**
```bash
git clone https://github.com/your-username/your-repo-name.git .
```

**For Private Repository:**
```bash
# Option 1: Using Personal Access Token
git clone https://YOUR_TOKEN@github.com/your-username/your-repo-name.git .

# Option 2: Using SSH (if you've set up SSH keys)
git clone git@github.com:your-username/your-repo-name.git .
```

**Password Required:** 
- Git credentials (username and personal access token) if repository is private

**Note:** Replace `your-username` and `your-repo-name` with your actual GitHub username and repository name.

### 4.3 Verify Files

```bash
# Check if files are cloned correctly
ls -la

# You should see: backend, Frontend, ecosystem.config.js, nginx.conf, etc.
```

---

## Step 5: Configure Environment Variables

### 5.1 Backend Environment File

```bash
# Navigate to backend directory
cd /var/www/ludo-game/backend

# Copy example file
cp env.example .env

# Edit the .env file
nano .env
```

**Update the following values in `.env`:**

```env
# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Supabase Configuration (Enter your actual values)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# JWT Secret (Generate a strong random string)
# You can generate one using: openssl rand -base64 32
JWT_SECRET=your_strong_random_jwt_secret_key_here_minimum_32_characters

# Paytm Production Credentials
PAYTM_MERCHANT_ID=WebHos32378446216792
PAYTM_MERCHANT_KEY=9xhvwj110V#3SE2s
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail109
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=https://your-domain.com/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

**Important Notes:**
- Replace `your-domain.com` with your actual domain name
- Replace Supabase values with your actual Supabase credentials
- Generate a strong JWT_SECRET (minimum 32 characters)
- Keep this file secure and never commit it to Git

### 5.2 Frontend Environment File

```bash
# Navigate to Frontend directory
cd /var/www/ludo-game/Frontend

# Create .env file
nano .env
```

**Add the following:**

```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

**Note:** Replace `your-domain.com` with your actual domain name.

---

## Step 6: Install Dependencies

### 6.1 Install Backend Dependencies

```bash
# Navigate to backend
cd /var/www/ludo-game/backend

# Install production dependencies
npm install --production
```

**No password required** for npm commands.

### 6.2 Install Frontend Dependencies

```bash
# Navigate to Frontend
cd /var/www/ludo-game/Frontend

# Install all dependencies
npm install
```

**No password required** for npm commands.

---

## Step 7: Build Frontend

```bash
# Make sure you're in Frontend directory
cd /var/www/ludo-game/Frontend

# Build the production version
npm run build
```

**No password required.**

This will create a `dist` folder with the production-ready frontend files.

**Verify build:**
```bash
ls -la dist/
# You should see index.html and assets folder
```

---

## Step 8: Configure PM2

### 8.1 Create Logs Directory

```bash
# Navigate to project root
cd /var/www/ludo-game

# Create logs directory
mkdir -p logs
```

### 8.2 Verify PM2 Configuration

The `ecosystem.config.js` file should already be in your project root. Verify it exists:

```bash
cat ecosystem.config.js
```

It should contain configuration for `ludo-backend`. Frontend is served directly by Nginx from the dist folder.

### 8.3 Start Applications with PM2

```bash
# Make sure you're in project root
cd /var/www/ludo-game

# Start both applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

**No password required** (PM2 was already configured in Step 3.2).

**Expected Output:**
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ restart │ uptime   │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ ludo-backend     │ online  │ 0       │ 0s       │
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

**Note:** Frontend is served directly by Nginx from `Frontend/dist` directory, so no separate PM2 process is needed.

### 8.4 View Logs (Optional)

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs ludo-backend

# Frontend is served by Nginx, check Nginx logs:
sudo tail -f /var/log/nginx/error.log
```

---

## Step 9: Configure Nginx

### 9.1 Copy Nginx Configuration

```bash
# Copy configuration file
sudo cp /var/www/ludo-game/nginx.conf /etc/nginx/sites-available/ludo-game
```

**Password Required:** Sudo password.

### 9.2 Edit Nginx Configuration

```bash
# Edit the configuration file
sudo nano /etc/nginx/sites-available/ludo-game
```

**Password Required:** No password, but you need to edit.

**Important:** Replace all instances of `ludobattle.com` and `www.ludobattle.com` with your actual domain name.

**Find and replace:**
- `server_name ludobattle.com www.ludobattle.com;` → `server_name your-domain.com www.your-domain.com;`
- `ssl_certificate /etc/letsencrypt/live/ludobattle.com/fullchain.pem;` → `ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/ludobattle.com/privkey.pem;` → `ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;`

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### 9.3 Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ludo-game /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

**Password Required:** Sudo password.

**Expected Output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 9.4 Reload Nginx

```bash
sudo systemctl reload nginx
```

**Password Required:** Sudo password.

---

## Step 10: Setup SSL Certificate

### 10.1 Obtain SSL Certificate

```bash
# Obtain SSL certificate for your domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Password Required:** 
- Sudo password
- Email address (for certificate notifications)
- Agree to terms (type `A` and press Enter)
- Choose to share email (optional, type `Y` or `N`)

**Note:** Replace `your-domain.com` with your actual domain name.

**Important:** Make sure your domain is pointing to your server IP before running this command.

### 10.2 Test Auto-renewal

```bash
# Test certificate renewal
sudo certbot renew --dry-run
```

**Password Required:** Sudo password.

Certbot will automatically renew certificates. The dry-run test verifies the renewal process works.

### 10.3 Verify SSL Configuration

After SSL installation, Certbot automatically updates your Nginx configuration. Verify:

```bash
# Check if HTTPS is working
sudo nginx -t
sudo systemctl reload nginx
```

**Password Required:** Sudo password.

---

## Step 11: Configure Firewall

### 11.1 Configure UFW (Uncomplicated Firewall)

```bash
# Allow SSH (important - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

**Password Required:** Sudo password. When enabling UFW, you'll be asked to confirm with `Y`.

### 11.2 Verify Firewall Status

```bash
# Check firewall status
sudo ufw status
```

**Expected Output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)               ALLOW       Anywhere (v6)
```

---

## Step 12: Start Services

### 12.1 Verify PM2 Status

```bash
pm2 status
```

`ludo-backend` should be **online**. Frontend is served directly by Nginx from the dist folder.

### 12.2 Restart Services (If Needed)

```bash
# Restart all PM2 processes
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx
```

**Password Required:** Sudo password for Nginx.

### 12.3 Enable Services on Boot

```bash
# PM2 is already configured (from Step 3.2)
pm2 save

# Nginx is already enabled (from Step 3.3)
sudo systemctl enable nginx
```

**Password Required:** Sudo password.

---

## Step 13: Verify Deployment

### 13.1 Check PM2 Status

```bash
pm2 status
pm2 logs --lines 20
```

**Expected:** Both apps should show as `online` with no errors.

### 13.2 Check Nginx Status

```bash
sudo systemctl status nginx
```

**Expected:** Should show `active (running)`.

### 13.3 Test Backend API

```bash
# Test backend health (if you have a health endpoint)
curl http://localhost:5000/api/health

# Or test from your domain
curl https://your-domain.com/api/health
```

### 13.4 Test Frontend

Open your browser and visit:
- `https://your-domain.com` - Should load the frontend
- `https://your-domain.com/api/health` - Should return API response (if health endpoint exists)

### 13.5 Check Ports

```bash
# Check if ports are listening
sudo netstat -tulpn | grep :5000  # Backend
sudo netstat -tulpn | grep :5173  # Frontend (if using preview)
sudo netstat -tulpn | grep :80    # HTTP
sudo netstat -tulpn | grep :443   # HTTPS
```

**Password Required:** Sudo password.

---

## Troubleshooting

### Application Not Starting

**Problem:** PM2 shows apps as `errored` or `stopped`

**Solution:**
```bash
# Check logs
pm2 logs ludo-backend --lines 50
# Frontend is served by Nginx, check Nginx logs:
sudo tail -f /var/log/nginx/error.log

# Common issues:
# 1. Missing environment variables - check .env files
# 2. Port already in use - check with: sudo netstat -tulpn | grep :5000
# 3. Missing dependencies - run: npm install in both directories
# 4. Build errors - check Frontend build: npm run build
```

### Nginx 502 Bad Gateway

**Problem:** Website shows "502 Bad Gateway"

**Solution:**
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs ludo-backend

# Restart backend
pm2 restart ludo-backend

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Port Already in Use

**Problem:** Port 5000 or 5173 is already in use

**Solution:**
```bash
# Find process using the port
sudo lsof -i :5000
sudo lsof -i :5173

# Kill the process (replace PID with actual process ID)
sudo kill -9 PID

# Or kill all node processes (use with caution)
sudo pkill -f node
```

### SSL Certificate Issues

**Problem:** SSL certificate not working or expired

**Solution:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# If issues persist, delete and recreate
sudo certbot delete --cert-name your-domain.com
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Frontend Not Loading

**Problem:** Frontend shows blank page or 404

**Solution:**
```bash
# Check if dist folder exists
ls -la /var/www/ludo-game/Frontend/dist

# Rebuild frontend
cd /var/www/ludo-game/Frontend
npm run build

# Check Nginx root path in configuration
sudo nano /etc/nginx/sites-available/ludo-game
# Verify: root /var/www/ludo-game/Frontend/dist;

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Database Connection Issues

**Problem:** Backend can't connect to Supabase

**Solution:**
```bash
# Check backend .env file
cd /var/www/ludo-game/backend
cat .env | grep SUPABASE

# Verify Supabase credentials are correct
# Test connection from backend
cd /var/www/ludo-game/backend
node -e "import('./config/supabase.js').then(m => m.testConnection())"
```

### Socket.IO Connection Issues

**Problem:** WebSocket connections not working

**Solution:**
```bash
# Check Nginx Socket.IO configuration
sudo nano /etc/nginx/sites-available/ludo-game
# Verify /socket.io location block exists

# Check backend CORS settings
cd /var/www/ludo-game/backend
cat .env | grep FRONTEND_URL

# Restart both services
pm2 restart all
sudo systemctl reload nginx
```

---

## Useful Commands

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs                    # All apps
pm2 logs ludo-backend       # Backend only
# Frontend is served by Nginx, check Nginx logs:
sudo tail -f /var/log/nginx/error.log
pm2 logs --lines 50         # Last 50 lines

# Restart applications
pm2 restart all             # All apps
pm2 restart ludo-backend    # Backend only
# Frontend is served by Nginx, rebuild with: cd Frontend && npm run build

# Stop applications
pm2 stop all
pm2 stop ludo-backend

# Delete applications
pm2 delete all
pm2 delete ludo-backend

# Monitor resources
pm2 monit

# Save current process list
pm2 save

# View detailed info
pm2 info ludo-backend
# Frontend is served by Nginx, check Nginx status:
sudo systemctl status nginx
```

### Nginx Management

```bash
# Check status
sudo systemctl status nginx

# Start/Stop/Restart
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx    # Reload config without downtime

# Test configuration
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### View Logs

```bash
# Application logs (PM2)
pm2 logs
pm2 logs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u nginx --lines 50
```

### Git Commands (For Updates)

```bash
# Navigate to project
cd /var/www/ludo-game

# Pull latest changes
git pull origin main

# Check status
git status

# View recent commits
git log --oneline -10
```

### Update Application

```bash
# Full update process
cd /var/www/ludo-game
git pull origin main

# Update backend
cd backend
npm install --production  # Only if package.json changed
pm2 restart ludo-backend

# Update frontend
cd ../Frontend
npm install              # Only if package.json changed
npm run build
# Frontend is served by Nginx, rebuild with: cd Frontend && npm run build

# Verify
pm2 status
```

### System Information

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
htop  # If installed

# Check running Node processes
ps aux | grep node

# Check port usage
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :5173
```

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] Strong JWT_SECRET set in backend `.env` (minimum 32 characters)
- [ ] All environment variables are set correctly
- [ ] `.env` files are NOT committed to Git (check `.gitignore`)
- [ ] SSL certificate is installed and working
- [ ] Firewall is configured (only ports 22, 80, 443 open)
- [ ] PM2 auto-restart is enabled
- [ ] Nginx security headers are configured
- [ ] Database credentials are secure
- [ ] Regular backups are configured
- [ ] Domain DNS is properly configured

---

## 📝 Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Keep your JWT_SECRET secure** - Generate a strong random string using: `openssl rand -base64 32`
3. **Regular backups** - Backup your database and code regularly
4. **Monitor logs** - Check logs regularly for errors: `pm2 logs`
5. **Update dependencies** - Keep npm packages updated for security: `npm audit`
6. **Domain DNS** - Ensure your domain A record points to your server IP
7. **SSL Renewal** - Certbot automatically renews certificates, but monitor renewal logs

---

## 🎉 Deployment Complete!

Your Ludo Game application should now be live at `https://your-domain.com`

### Quick Verification Checklist:

- [ ] Visit `https://your-domain.com` - Frontend loads
- [ ] Test API: `https://your-domain.com/api/health` - Returns response
- [ ] Check PM2: `pm2 status` - Both apps online
- [ ] Check Nginx: `sudo systemctl status nginx` - Active
- [ ] Test SSL: Browser shows padlock icon
- [ ] Test Socket.IO: Game connections work

### Next Steps:

1. Test all application features
2. Monitor logs for any errors
3. Set up monitoring and alerts
4. Configure automated backups
5. Set up CI/CD pipeline (optional)

---

## 📞 Support & Troubleshooting

**For detailed troubleshooting of 404 errors and API issues, see:**
👉 **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Complete troubleshooting guide

**Common Issues:**
1. **404 Route Not Found:** Usually means frontend environment variable not set or frontend not rebuilt
2. **502 Bad Gateway:** Backend not running or Nginx routing issue
3. **CORS Errors:** Backend FRONTEND_URL not matching actual domain

**Quick Diagnostic:**
```bash
# Check if backend is running
pm2 status

# Test backend directly
curl http://localhost:5000/api/health

# Test through Nginx
curl https://your-domain.com/api/health

# Check frontend environment
cd /var/www/ludo-game/Frontend
cat .env

# Check backend environment
cd /var/www/ludo-game/backend
cat .env
```

**If you encounter issues:**

1. **Check PM2 logs:** `pm2 logs --lines 50`
2. **Check Nginx logs:** `sudo tail -f /var/log/nginx/error.log`
3. **Verify environment variables:** Check `.env` files
4. **Check firewall:** `sudo ufw status`
5. **Verify DNS:** Ensure domain points to server IP
6. **Check port availability:** `sudo netstat -tulpn | grep :5000`

---

**Last Updated:** $(date)
**Version:** 1.0.0

