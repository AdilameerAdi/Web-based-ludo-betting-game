# 🎲 Ludo Game - Multiplayer Online Gaming Platform

A full-stack multiplayer Ludo game application with real-time gameplay, payment integration, wallet system, and admin panel.

---

## 📚 **DEPLOYMENT DOCUMENTATION**

**🚀 For complete step-by-step deployment from GitHub to live website (including cleaning VPS first):**
👉 **[COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)** - **START HERE!** Complete deployment guide from GitHub push to live site

The deployment guide includes:
- ✅ Complete removal of previous deployment
- ✅ Fresh server setup from scratch
- ✅ Detailed step-by-step instructions
- ✅ Security checklist
- ✅ Troubleshooting solutions

---

## 🚀 **QUICK DEPLOY: Push Code to Make It Live**

**Already deployed? Just need to update your live site? Follow these steps:**

### Step 1: Push Your Code to GitHub

On your local machine:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

### Step 2: SSH into Your Server

```bash
ssh root@your-server-ip
# Replace your-server-ip with your actual server IP
```

### Step 3: Pull Latest Code and Deploy

```bash
# Navigate to project directory
cd /var/www/ludo-game

# Pull latest code from GitHub
git pull origin main

# Update backend dependencies (if package.json changed)
cd backend
npm install --production
pm2 restart ludo-backend

# Update frontend dependencies and rebuild (if package.json changed)
cd ../Frontend
npm install
npm run build
# Frontend is served by Nginx, no PM2 restart needed

# Check status
cd ..
pm2 status
```

### Quick One-Liner (If no dependency changes)

If you only changed code files (not package.json), you can use this faster method:

```bash
cd /var/www/ludo-game && git pull origin main && cd backend && pm2 restart ludo-backend && cd ../Frontend && npm run build && pm2 status
```

### Verify Deployment

```bash
# Check if apps are running
pm2 status

# View logs for any errors
pm2 logs --lines 50

# Test your website
# Visit: https://your-domain.com
```

**That's it! Your changes are now live! 🎉**

---

## 📋 Initial VPS Deployment Guide (First Time Setup)

If this is your first time deploying, follow the complete guide below:

This guide will walk you through deploying the application on your VPS server step by step.

### Prerequisites

- Ubuntu 20.04+ VPS server
- Domain name pointed to your server IP
- SSH access to your server
- Basic knowledge of Linux commands

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Connect to Your VPS Server

```bash
ssh root@your-server-ip
# Enter your password when prompted
```

**Note:** Replace `your-server-ip` with your actual server IP address. You'll be asked to enter your password.

---

### Step 2: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

**Password Required:** You may be asked for your sudo password.

---

### Step 3: Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

**Password Required:** Sudo password for installation.

---

### Step 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
pm2 startup
```

**Password Required:** 
- Sudo password for npm global install
- Follow the instructions from `pm2 startup` command and run the provided command (it will require sudo password)

---

### Step 5: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

**Password Required:** Sudo password.

---

### Step 6: Clone Your Repository

```bash
cd /var/www
sudo mkdir ludo-game
sudo chown $USER:$USER ludo-game
cd ludo-game
git clone https://github.com/your-username/your-repo-name.git .
```

**Password Required:** 
- Sudo password for directory creation
- Git credentials (username and personal access token) if repository is private

**Note:** Replace `your-username` and `your-repo-name` with your actual GitHub username and repository name.

---

### Step 7: Install Project Dependencies

**Backend Dependencies:**
```bash
cd /var/www/ludo-game/backend
npm install --production
```

**Frontend Dependencies:**
```bash
cd /var/www/ludo-game/Frontend
npm install
npm run build
```

**No password required** for these commands.

---

### Step 8: Create Environment Files

**Backend Environment File:**
```bash
cd /var/www/ludo-game/backend
cp env.example .env
nano .env
```

**Password Required:** No password, but you'll need to edit the file.

**Update the following values in `.env`:**
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Supabase Configuration (Enter your actual values)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (Generate a strong random string)
JWT_SECRET=your_strong_random_jwt_secret_key_here

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

**Frontend Environment File:**
```bash
cd /var/www/ludo-game/Frontend
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

### Step 9: Create Logs Directory

```bash
cd /var/www/ludo-game
mkdir -p logs
```

**No password required.**

---

### Step 10: Start Applications with PM2

```bash
cd /var/www/ludo-game
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

**No password required** (PM2 was already configured in Step 4).

---

### Step 11: Configure Nginx

**Copy Nginx Configuration:**
```bash
sudo cp /var/www/ludo-game/nginx.conf /etc/nginx/sites-available/ludo-game
```

**Password Required:** Sudo password.

**Edit Nginx Configuration:**
```bash
sudo nano /etc/nginx/sites-available/ludo-game
```

**Password Required:** No password, but you need to edit.

**Replace `your-domain.com` with your actual domain name** in the file.

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

**Enable the Site:**
```bash
sudo ln -s /etc/nginx/sites-available/ludo-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Password Required:** Sudo password for all commands.

---

### Step 12: Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Password Required:** Sudo password. When enabling UFW, you'll be asked to confirm with `Y`.

---

### Step 13: Install SSL Certificate (Let's Encrypt)

**Install Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Password Required:** Sudo password.

**Obtain SSL Certificate:**
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Password Required:** 
- Sudo password
- Email address (for certificate notifications)
- Agree to terms (type `A` and press Enter)
- Choose to share email (optional, type `Y` or `N`)

**Test Auto-renewal:**
```bash
sudo certbot renew --dry-run
```

**Password Required:** Sudo password.

---

### Step 14: Update Nginx for HTTPS

After SSL installation, Certbot automatically updates your Nginx configuration. However, you may need to uncomment the HTTPS server block in your nginx.conf:

```bash
sudo nano /etc/nginx/sites-available/ludo-game
```

**Uncomment the HTTPS server block** (remove `#` from lines starting with `server {` for port 443).

**Reload Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Password Required:** Sudo password.

---

### Step 15: Verify Deployment

**Check PM2 Status:**
```bash
pm2 status
pm2 logs
```

**Check Nginx Status:**
```bash
sudo systemctl status nginx
```

**Test Your Application:**
- Open your browser and visit: `https://your-domain.com`
- Check backend API: `https://your-domain.com/api/health` (if health endpoint exists)

**No password required** for verification commands.

---

## 🔧 Useful Commands

### PM2 Management

```bash
pm2 status                    # Check application status
pm2 logs                     # View all logs
pm2 logs ludo-backend        # View backend logs only
# Frontend is served by Nginx, check Nginx logs instead
pm2 restart all              # Restart all applications
pm2 restart ludo-backend     # Restart backend only
# Frontend is served by Nginx, rebuild with: cd Frontend && npm run build
pm2 stop all                 # Stop all applications
pm2 delete all               # Delete all applications
pm2 monit                    # Monitor resources
```

### Nginx Management

```bash
sudo systemctl status nginx   # Check Nginx status
sudo systemctl restart nginx  # Restart Nginx
sudo systemctl reload nginx   # Reload Nginx configuration
sudo nginx -t                 # Test Nginx configuration
```

### View Logs

```bash
# Application logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx -f
```

**Password Required:** Sudo password for Nginx and system log commands.

---

## 🔄 Updating Your Application (Detailed Guide)

### Full Update Process

When you push new changes to your repository, follow these steps:

```bash
# 1. Connect to your server
ssh root@your-server-ip

# 2. Navigate to project directory
cd /var/www/ludo-game

# 3. Pull latest code from GitHub
git pull origin main

# 4. Update backend
cd backend
npm install --production  # Only if package.json changed
pm2 restart ludo-backend

# 5. Update frontend
cd ../Frontend
npm install  # Only if package.json changed
npm run build
pm2 restart ludo-frontend

# 6. Verify deployment
cd ..
pm2 status
pm2 logs --lines 20  # Check for any errors
```

### Quick Update (Code Changes Only)

If you only changed code files (not dependencies):

```bash
cd /var/www/ludo-game
git pull origin main
cd backend && pm2 restart ludo-backend
cd ../Frontend && npm run build && pm2 restart ludo-frontend
pm2 status
```

### Update with New Dependencies

If you added new npm packages:

```bash
cd /var/www/ludo-game
git pull origin main

# Backend dependencies
cd backend
npm install --production
pm2 restart ludo-backend

# Frontend dependencies
cd ../Frontend
npm install
npm run build
pm2 restart ludo-frontend
```

### Troubleshooting Updates

If something goes wrong after updating:

```bash
# Check logs
pm2 logs ludo-backend --lines 50
# Frontend is served by Nginx, check Nginx logs: sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart all

# If issues persist, check git status
cd /var/www/ludo-game
git status
git log --oneline -5  # See recent commits
```

**Password Required:** 
- Git credentials if repository is private
- No password for npm and PM2 commands

---

## 🗄️ Database Setup

Ensure your Supabase database has all required tables:

1. **users** - User accounts and balances
2. **games** - Game records
3. **game_states** - Game state snapshots
4. **wallet_transactions** - Transaction history
5. **withdrawals** - Withdrawal requests
6. **payments** - Payment records
7. **admins** - Admin accounts

Run the SQL migration files from `backend/migrations/` in your Supabase dashboard.

---

## 🔒 Security Checklist

- [x] Strong JWT_SECRET set in `.env`
- [x] Environment variables secured (not in git)
- [x] SSL certificate installed
- [x] Firewall configured (ports 22, 80, 443 only)
- [x] Database credentials secured
- [x] PM2 auto-restart enabled
- [x] Regular backups configured

---

## 🆘 Troubleshooting

### Application Not Starting

```bash
pm2 logs ludo-backend
# Frontend is served by Nginx, check Nginx logs: sudo tail -f /var/log/nginx/error.log
```

Check for errors in the logs.

### Nginx 502 Bad Gateway

```bash
sudo systemctl status nginx
pm2 status
```

Ensure both Nginx and PM2 applications are running.

### Port Already in Use

```bash
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :5173
```

Kill the process using the port or change the port in configuration.

### SSL Certificate Issues

```bash
sudo certbot certificates
sudo certbot renew
```

**Password Required:** Sudo password.

---

## 📞 Support

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables are set correctly
4. Check firewall rules: `sudo ufw status`

---

## 📝 Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Keep your JWT_SECRET secure** - Generate a strong random string
3. **Regular backups** - Backup your database and code regularly
4. **Monitor logs** - Check logs regularly for errors
5. **Update dependencies** - Keep npm packages updated for security

---

## 🎯 Quick Reference: All Commands in Order

```bash
# 1. Connect to server
ssh root@your-server-ip

# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install PM2
sudo npm install -g pm2
pm2 startup

# 5. Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 6. Clone repository
cd /var/www
sudo mkdir ludo-game
sudo chown $USER:$USER ludo-game
cd ludo-game
git clone https://github.com/your-username/your-repo-name.git .

# 7. Install dependencies
cd backend && npm install --production
cd ../Frontend && npm install && npm run build

# 8. Create environment files
cd ../backend
cp env.example .env
nano .env  # Edit with your values

cd ../Frontend
nano .env  # Add VITE_API_BASE_URL and VITE_SOCKET_URL

# 9. Create logs directory
cd ..
mkdir -p logs

# 10. Start with PM2
pm2 start ecosystem.config.js
pm2 save

# 11. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/ludo-game
sudo nano /etc/nginx/sites-available/ludo-game  # Update domain
sudo ln -s /etc/nginx/sites-available/ludo-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 12. Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 13. Install SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 14. Verify
pm2 status
sudo systemctl status nginx
```

---

**🎉 Congratulations! Your Ludo Game application is now deployed!**

Visit `https://your-domain.com` to see your application live.

