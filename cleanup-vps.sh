#!/bin/bash

# VPS Cleanup Script for Ludo Battle Game
# This script will clean up previous deployment and prepare for fresh deployment

echo "=========================================="
echo "VPS Cleanup Script - Ludo Battle Game"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

print_info "Starting VPS cleanup..."

# Stop all Node.js processes
print_info "Stopping all Node.js processes..."
pkill -f node || true
pkill -f pm2 || true
sleep 2

# Stop PM2 processes if running
if command -v pm2 &> /dev/null; then
    print_info "Stopping PM2 processes..."
    pm2 stop all || true
    pm2 delete all || true
fi

# Stop Nginx
print_info "Stopping Nginx..."
systemctl stop nginx || service nginx stop || true

# Remove old application directory
print_info "Removing old application directory..."
if [ -d "/var/www/ludobattle" ]; then
    rm -rf /var/www/ludobattle
    print_info "Removed /var/www/ludobattle"
fi

if [ -d "/home/ludobattle" ]; then
    rm -rf /home/ludobattle
    print_info "Removed /home/ludobattle"
fi

# Remove old project directories
print_info "Cleaning up project directories..."
if [ -d "~/ludo-game" ]; then
    rm -rf ~/ludo-game
    print_info "Removed ~/ludo-game"
fi

if [ -d "~/Web-based-ludo-betting-game" ]; then
    rm -rf ~/Web-based-ludo-betting-game
    print_info "Removed ~/Web-based-ludo-betting-game"
fi

# Clean up Nginx configuration
print_info "Cleaning up Nginx configuration..."
if [ -f "/etc/nginx/sites-enabled/ludobattle" ]; then
    rm -f /etc/nginx/sites-enabled/ludobattle
    print_info "Removed Nginx site config"
fi

if [ -f "/etc/nginx/sites-available/ludobattle" ]; then
    rm -f /etc/nginx/sites-available/ludobattle
    print_info "Removed Nginx available config"
fi

# Clean up PM2 ecosystem file
if [ -f "~/ecosystem.config.js" ]; then
    rm -f ~/ecosystem.config.js
    print_info "Removed PM2 ecosystem file"
fi

# Clean up old log files
print_info "Cleaning up log files..."
rm -rf ~/.pm2/logs/* || true
rm -f /var/log/nginx/error.log.* || true
rm -f /var/log/nginx/access.log.* || true

# Clean npm cache (optional, but helps)
print_info "Cleaning npm cache..."
npm cache clean --force || true

# Remove old node_modules if they exist in common locations
print_info "Cleaning up old node_modules..."
find /root -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
find /home -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true

print_info ""
print_info "=========================================="
print_info "Cleanup completed successfully!"
print_info "=========================================="
print_info ""
print_info "Next steps:"
print_info "1. Clone your repository from GitHub"
print_info "2. Install dependencies"
print_info "3. Configure environment variables"
print_info "4. Build frontend"
print_info "5. Set up Nginx"
print_info "6. Start the application with PM2"
print_info ""

