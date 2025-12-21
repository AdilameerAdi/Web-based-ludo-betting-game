# 🚀 Complete Deployment Guide - From GitHub to Live Website

This guide will walk you through deploying your Ludo Game application from scratch on a fresh VPS server, starting with pushing code to GitHub.

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ GitHub account and repository created
- ✅ Ubuntu 20.04+ VPS server with root/sudo access
- ✅ Domain name `ludobattle.com` pointed to your server IP (A record)
- ✅ SSH access to your VPS server
- ✅ Supabase project credentials
- ✅ Paytm merchant credentials

---

## 📦 Step 1: Push Code to GitHub

### 1.1 Initialize Git Repository (if not already done)

```bash
# On your local machine, navigate to project directory
cd "C:\Users\Adil Ameer\Desktop\New folder (4)\my-project"

# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - Ready for deployment"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name it (e.g., `ludo-game`)
4. **DO NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

### 1.3 Push Code to GitHub

```bash
# Add remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** If repository is private, you'll need to authenticate with a personal access token.

---

## 🖥️ Step 2: Connect to Your VPS Server

```bash
# Connect via SSH (replace YOUR_SERVER_IP with your actual IP)
ssh root@YOUR_SERVER_IP

# Or if using a different user
ssh your-username@YOUR_SERVER_IP
```

Enter your password when prompted.

---

## 🗑️ Step 3: Clean VPS - Remove All Previous Deployments

### 3.1 Stop All Running Services

```bash
# Stop PM2 processes
pm2 stop all
pm2 delete all

# Stop Nginx
sudo systemctl stop nginx

# Kill any Node.js processes
pkill -f node
```

### 3.2 Remove Project Directory

```bash
# Remove project directory if it exists
sudo rm -rf /var/www/ludo-game

# Remove Nginx configuration
sudo rm -f /etc/nginx/sites-available/ludo-game
sudo rm -f /etc/nginx/sites-enabled/ludo-game

# Remove SSL certificates (if you want to start fresh)
sudo certbot delete --cert-name ludobattle.com
```

### 3.3 Clean Up PM2

```bash
# Clear PM2 logs
pm2 flush

# Remove PM2 startup script (optional)
pm2 unstartup
```

### 3.4 Verify Clean State

```bash
# Check if port 5000 is free
sudo netstat -tulpn | grep :5000

# Check if port 5173 is free
sudo netstat -tulpn | grep :5173

# Check PM2 status (should be empty)
pm2 status

# Check Nginx status
sudo systemctl status nginx
```

**Your VPS is now clean and ready for fresh deployment!**

---

## 🔧 Step 4: Install Required Software

### 4.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 4.2 Install Node.js 18+

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 4.3 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown and run the provided command (requires sudo password)
```

### 4.4 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4.5 Install Certbot (for SSL)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

---

## 📥 Step 5: Clone Repository from GitHub

### 5.1 Create Project Directory

```bash
# Create directory
sudo mkdir -p /var/www/ludo-game

# Set ownership
sudo chown -R $USER:$USER /var/www/ludo-game

# Navigate to directory
cd /var/www/ludo-game
```

### 5.2 Clone Repository

```bash
# Clone your repository (replace with your actual GitHub URL)
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git .

# Verify files are cloned
ls -la
```

**If repository is private**, you'll need to:
1. Generate a Personal Access Token on GitHub
2. Use it as password when prompted:
   ```
   Username: YOUR_USERNAME
   Password: YOUR_PERSONAL_ACCESS_TOKEN
   ```

---

## ⚙️ Step 6: Install Dependencies

### 6.1 Install Backend Dependencies

```bash
# Navigate to backend directory
cd /var/www/ludo-game/backend

# Install production dependencies
npm install --production

# Verify installation
ls node_modules
```

### 6.2 Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd /var/www/ludo-game/Frontend

# Install all dependencies
npm install

# Verify installation
ls node_modules
```

---

## 🔐 Step 7: Configure Environment Variables

### 7.1 Backend Environment Configuration

```bash
# Navigate to backend
cd /var/www/ludo-game/backend

# Copy example file
cp env.example .env

# Edit environment file
nano .env
```

**Update the `.env` file with your actual values:**

```env
# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://ludobattle.com

# Supabase Configuration (Replace with your actual values)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (Generate a strong random string)
JWT_SECRET=YOUR_STRONG_RANDOM_JWT_SECRET_HERE

# Paytm Payment Gateway Configuration
PAYTM_MERCHANT_ID=WebHos32378446216792
PAYTM_MERCHANT_KEY=9xhvwj110V#3SE2s
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail109
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=https://ludobattle.com/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
```

**To save in nano:** Press `Ctrl+X`, then `Y`, then `Enter`

**To generate a strong JWT_SECRET:**
```bash
openssl rand -base64 64
```

### 7.2 Frontend Environment Configuration

```bash
# Navigate to frontend
cd /var/www/ludo-game/Frontend

# Create .env file
nano .env
```

**Add the following:**

```env
VITE_API_BASE_URL=https://ludobattle.com/api
VITE_SOCKET_URL=https://ludobattle.com
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

## 🏗️ Step 8: Build Frontend

```bash
# Make sure you're in frontend directory
cd /var/www/ludo-game/Frontend

# Build for production
npm run build

# Verify build was successful
ls -la dist
```

You should see a `dist` folder with built files.

---

## 📝 Step 9: Create Logs Directory

```bash
# Navigate to project root
cd /var/www/ludo-game

# Create logs directory
mkdir -p logs

# Verify
ls -la logs
```

---

## 🚀 Step 10: Start Backend with PM2

```bash
# Navigate to project root
cd /var/www/ludo-game

# Start backend using PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs ludo-backend --lines 20
```

**Expected output:** `ludo-backend` should be `online`

---

## 🌐 Step 11: Configure Nginx

### 11.1 Copy Nginx Configuration

```bash
# Copy configuration file
sudo cp /var/www/ludo-game/nginx.conf /etc/nginx/sites-available/ludo-game

# Verify file was copied
sudo cat /etc/nginx/sites-available/ludo-game | head -20
```

### 11.2 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ludo-game /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

**Expected output:** `syntax is ok` and `test is successful`

### 11.3 Reload Nginx

```bash
# Reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

---

## 🔒 Step 12: Configure Firewall

```bash
# Allow SSH (important - don't skip this!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**When prompted to continue, type `Y` and press Enter**

---

## 🔐 Step 13: Install SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d ludobattle.com -d www.ludobattle.com
```

**Follow the prompts:**
1. Enter your email address
2. Agree to terms (type `A` and press Enter)
3. Choose whether to share email (type `Y` or `N`)
4. Certbot will automatically configure Nginx

**Verify SSL installation:**
```bash
# Check certificates
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## ✅ Step 14: Verify Deployment

### 14.1 Check PM2 Status

```bash
pm2 status
```

**Expected:** `ludo-backend` should be `online`

### 14.2 Check Nginx Status

```bash
sudo systemctl status nginx
```

**Expected:** `active (running)`

### 14.3 Test Backend API

```bash
# Test health endpoint
curl https://ludobattle.com/api/health
```

**Expected response:**
```json
{"status":"OK","message":"Server is running"}
```

### 14.4 Test Frontend

Open your browser and visit:
- `https://ludobattle.com` - Should load the frontend
- `https://www.ludobattle.com` - Should also work

### 14.5 Check Logs

```bash
# Backend logs
pm2 logs ludo-backend --lines 50

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

---

## 🎉 Deployment Complete!

Your application should now be live at:
- **Frontend:** https://ludobattle.com
- **API:** https://ludobattle.com/api
- **Health Check:** https://ludobattle.com/api/health

---

## 🔄 Updating Your Application (After Initial Deployment)

When you make changes and want to update the live site:

### Quick Update Process

```bash
# 1. On your local machine, commit and push changes
git add .
git commit -m "Your update message"
git push origin main

# 2. SSH into your server
ssh root@YOUR_SERVER_IP

# 3. Navigate to project
cd /var/www/ludo-game

# 4. Pull latest code
git pull origin main

# 5. Update backend (if package.json changed)
cd backend
npm install --production
pm2 restart ludo-backend

# 6. Update frontend (if package.json changed)
cd ../Frontend
npm install
npm run build
# Frontend is served by Nginx, no restart needed

# 7. Verify
cd ..
pm2 status
```

### Quick Update (Code Changes Only)

If you only changed code files (not dependencies):

```bash
cd /var/www/ludo-game
git pull origin main
cd backend && pm2 restart ludo-backend
cd ../Frontend && npm run build
pm2 status
```

---

## 🛠️ Useful Commands Reference

### PM2 Commands

```bash
pm2 status                    # Check application status
pm2 logs                      # View all logs
pm2 logs ludo-backend         # View backend logs only
pm2 restart ludo-backend      # Restart backend
pm2 stop ludo-backend         # Stop backend
pm2 delete ludo-backend       # Delete backend from PM2
pm2 monit                     # Monitor resources
```

### Nginx Commands

```bash
sudo systemctl status nginx   # Check Nginx status
sudo systemctl restart nginx  # Restart Nginx
sudo systemctl reload nginx   # Reload Nginx configuration
sudo nginx -t                 # Test Nginx configuration
sudo tail -f /var/log/nginx/error.log    # View error logs
sudo tail -f /var/log/nginx/access.log   # View access logs
```

### Git Commands

```bash
cd /var/www/ludo-game
git status                    # Check git status
git pull origin main          # Pull latest changes
git log --oneline -10         # View recent commits
```

### System Commands

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node

# Check port usage
sudo netstat -tulpn | grep :5000
```

---

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs ludo-backend --lines 50

# Check if port is in use
sudo netstat -tulpn | grep :5000

# Restart backend
pm2 restart ludo-backend
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs ludo-backend

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart both
pm2 restart ludo-backend
sudo systemctl reload nginx
```

### Frontend Not Loading

```bash
# Check if dist folder exists
ls -la /var/www/ludo-game/Frontend/dist

# Rebuild frontend
cd /var/www/ludo-game/Frontend
npm run build

# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Check certificates
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Reinstall certificate
sudo certbot --nginx -d ludobattle.com -d www.ludobattle.com --force-renewal
```

### Database Connection Issues

```bash
# Check backend logs for database errors
pm2 logs ludo-backend | grep -i "database\|supabase\|error"

# Verify environment variables
cd /var/www/ludo-game/backend
cat .env | grep SUPABASE
```

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] Strong JWT_SECRET set in `backend/.env` (minimum 32 characters)
- [ ] All environment variables are set correctly
- [ ] `.env` files are NOT committed to Git
- [ ] SSL certificate is installed and working
- [ ] Firewall is configured (only ports 22, 80, 443 open)
- [ ] PM2 auto-restart is enabled
- [ ] Nginx security headers are configured
- [ ] Database credentials are secure
- [ ] Domain DNS is properly configured

---

## 📞 Need Help?

If you encounter issues:

1. **Check logs first:**
   ```bash
   pm2 logs ludo-backend --lines 50
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify configuration:**
   ```bash
   sudo nginx -t
   pm2 status
   ```

3. **Check environment variables:**
   ```bash
   cd /var/www/ludo-game/backend
   cat .env
   ```

4. **Verify services are running:**
   ```bash
   sudo systemctl status nginx
   pm2 status
   ```

---

## 📝 Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Keep your JWT_SECRET secure** - Don't share it
3. **Regular backups** - Backup your database and code regularly
4. **Monitor logs** - Check logs regularly for errors
5. **Update dependencies** - Keep npm packages updated for security

---

**🎉 Congratulations! Your Ludo Game application is now deployed and live!**

Visit **https://ludobattle.com** to see your application.

