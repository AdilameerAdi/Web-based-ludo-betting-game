#!/bin/bash

# Ludo Game Deployment Script
# Run this script on your VPS server after uploading the project

set -e

echo "🚀 Starting Ludo Game Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Get project directory
PROJECT_DIR=$(pwd)
echo -e "${GREEN}Project directory: $PROJECT_DIR${NC}"

# Step 1: Install dependencies
echo -e "\n${YELLOW}Step 1: Installing dependencies...${NC}"

echo "Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: backend/package.json not found${NC}"
    exit 1
fi
npm install --production

echo "Installing frontend dependencies..."
cd "$PROJECT_DIR/Frontend"
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Frontend/package.json not found${NC}"
    exit 1
fi
npm install

# Step 2: Build frontend
echo -e "\n${YELLOW}Step 2: Building frontend...${NC}"
cd "$PROJECT_DIR/Frontend"
npm run build

# Step 3: Create logs directory
echo -e "\n${YELLOW}Step 3: Creating logs directory...${NC}"
cd "$PROJECT_DIR"
mkdir -p logs

# Step 4: Check environment files
echo -e "\n${YELLOW}Step 4: Checking environment files...${NC}"

if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${RED}Warning: backend/.env not found${NC}"
    echo "Please create backend/.env file from backend/env.example"
    echo "You can copy it: cp backend/env.example backend/.env"
    echo "Then edit it: nano backend/.env"
fi

if [ ! -f "$PROJECT_DIR/Frontend/.env" ]; then
    echo -e "${YELLOW}Warning: Frontend/.env not found${NC}"
    echo "Creating Frontend/.env from template..."
    cat > "$PROJECT_DIR/Frontend/.env" << EOF
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
EOF
    echo "Please update Frontend/.env with your production URLs"
fi

# Step 5: Start with PM2
echo -e "\n${YELLOW}Step 5: Starting applications with PM2...${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 not found. Installing PM2...${NC}"
    npm install -g pm2
fi

cd "$PROJECT_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo -e "\n${GREEN}✅ Deployment completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Configure Nginx (see DEPLOYMENT.md)"
echo "2. Set up SSL certificate"
echo "3. Update environment variables"
echo "4. Check PM2 status: pm2 status"
echo "5. View logs: pm2 logs"

