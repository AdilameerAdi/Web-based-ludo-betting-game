# VPS Deployment Guide for Ludo Game Application

This guide will help you deploy the Ludo Game application on your VPS server.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ and npm
- PM2 (Process Manager)
- Nginx (Web Server)
- SSL Certificate (Let's Encrypt recommended)

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify installation
```

### 1.3 Install PM2
```bash
sudo npm install -g pm2
pm2 startup  # Follow instructions to enable PM2 on system startup
```

### 1.4 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Step 2: Application Setup

### 2.1 Clone/Upload Project
```bash
cd /var/www
sudo mkdir ludo-game
sudo chown $USER:$USER ludo-game
# Upload your project files here or clone from git
```

### 2.2 Install Dependencies

**Backend:**
```bash
cd /var/www/ludo-game/backend
npm install --production
```

**Frontend:**
```bash
cd /var/www/ludo-game/Frontend
npm install
npm run build
```

### 2.3 Create Environment Files

**Backend `.env` file:**
```bash
cd /var/www/ludo-game/backend
nano .env
```

Add the following (update with your actual values):
```env
# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret
JWT_SECRET=your_strong_random_jwt_secret_key

# Paytm Payment Gateway Configuration (Production)
PAYTM_MERCHANT_ID=WebHos32378446216792
PAYTM_MERCHANT_KEY=9xhvwj110V#3SE2s
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail109
PAYTM_CHANNEL_ID=WEB
PAYTM_CALLBACK_URL=https://your-domain.com/api/payments/callback
PAYTM_PAYMENT_URL=https://securegw.paytm.in/theia/processTransaction
```

**Frontend `.env` file:**
```bash
cd /var/www/ludo-game/Frontend
nano .env
```

Add:
```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

### 2.4 Create Logs Directory
```bash
cd /var/www/ludo-game
mkdir -p logs
```

## Step 3: Configure PM2

### 3.1 Start Applications with PM2
```bash
cd /var/www/ludo-game
pm2 start ecosystem.config.js
pm2 save
```

### 3.2 Verify PM2 Status
```bash
pm2 status
pm2 logs
```

## Step 4: Configure Nginx

### 4.1 Copy Nginx Configuration
```bash
sudo cp /var/www/ludo-game/nginx.conf /etc/nginx/sites-available/ludo-game
```

### 4.2 Update Domain Name
```bash
sudo nano /etc/nginx/sites-available/ludo-game
# Replace 'your-domain.com' with your actual domain name
```

### 4.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/ludo-game /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Step 5: SSL Certificate (Let's Encrypt)

### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5.3 Auto-renewal
```bash
sudo certbot renew --dry-run  # Test renewal
```

## Step 6: Firewall Configuration

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Step 7: Monitoring and Maintenance

### 7.1 PM2 Commands
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all          # Restart all apps
pm2 restart ludo-backend # Restart backend only
pm2 restart ludo-frontend # Restart frontend only
pm2 monit               # Monitor resources
```

### 7.2 Update Application
```bash
cd /var/www/ludo-game
# Pull latest changes or upload new files

# Backend
cd backend
npm install --production
pm2 restart ludo-backend

# Frontend
cd ../Frontend
npm install
npm run build
pm2 restart ludo-frontend
```

## Step 8: Database Setup

Ensure your Supabase database is properly configured with all required tables:
- users
- games
- game_states
- wallet_transactions
- withdrawals
- payments
- admins

Run migration scripts if needed:
```bash
cd /var/www/ludo-game/backend
# Execute SQL migration files in Supabase dashboard
```

## Troubleshooting

### Check Backend Logs
```bash
pm2 logs ludo-backend
tail -f /var/www/ludo-game/logs/backend-error.log
```

### Check Frontend Logs
```bash
pm2 logs ludo-frontend
tail -f /var/www/ludo-game/logs/frontend-error.log
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
sudo systemctl restart nginx
pm2 restart all
```

## Security Checklist

- [ ] Strong JWT_SECRET set
- [ ] Environment variables secured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Regular backups configured
- [ ] PM2 auto-restart enabled
- [ ] Log rotation configured
- [ ] Database credentials secured

## Performance Optimization

1. **Enable Nginx caching** for static assets
2. **Configure PM2 clustering** if needed (modify ecosystem.config.js)
3. **Set up database connection pooling**
4. **Monitor server resources** with `pm2 monit`
5. **Configure log rotation** to prevent disk space issues

## Backup Strategy

1. **Database**: Regular Supabase backups
2. **Code**: Version control (Git)
3. **Environment files**: Secure backup location
4. **Logs**: Regular cleanup and rotation

## Support

For issues, check:
- PM2 logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- Application logs: `/var/www/ludo-game/logs/`

