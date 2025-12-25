#!/bin/bash
# Quick VPS Cleanup Commands
# Run these commands on your VPS after SSH connection

echo "Cleaning VPS..."

# Stop all Node processes
pkill -f node || true
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Stop Nginx
systemctl stop nginx || service nginx stop || true

# Remove old directories
rm -rf /var/www/ludobattle
rm -rf ~/ludo-game
rm -rf ~/Web-based-ludo-betting-game

# Remove Nginx configs
rm -f /etc/nginx/sites-enabled/ludobattle
rm -f /etc/nginx/sites-available/ludobattle

# Clean logs
rm -rf ~/.pm2/logs/* 2>/dev/null || true

echo "Cleanup complete!"

