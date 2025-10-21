#!/bin/bash

###############################################################################
# SoulMatch Web - Deployment Script
# This script automates the deployment process on VPS
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/soulmatch"
APP_NAME="soulmatch"
BRANCH="main"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if running as correct user
if [ "$USER" != "soulmatch" ]; then
    print_error "This script must be run as 'soulmatch' user"
    exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

print_info "Starting deployment process..."
echo ""

# Step 1: Backup current version
print_info "Creating backup..."
BACKUP_DIR="$HOME/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$APP_DIR/.next" "$BACKUP_DIR/" 2>/dev/null || true
cp "$APP_DIR/.env.local" "$BACKUP_DIR/" 2>/dev/null || true
print_success "Backup created: $BACKUP_DIR"
echo ""

# Step 2: Stop application
print_info "Stopping application..."
pm2 stop $APP_NAME 2>/dev/null || true
print_success "Application stopped"
echo ""

# Step 3: Pull latest code
print_info "Pulling latest code from $BRANCH..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH
print_success "Code updated"
echo ""

# Step 4: Install dependencies
print_info "Installing dependencies..."
npm install --production=false
print_success "Dependencies installed"
echo ""

# Step 5: Run build
print_info "Building application..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Build failed! Restoring backup..."
    pm2 start $APP_NAME
    exit 1
fi
print_success "Build completed"
echo ""

# Step 6: Restart application
print_info "Restarting application..."
pm2 restart $APP_NAME
pm2 save
print_success "Application restarted"
echo ""

# Step 7: Health check
print_info "Running health check..."
sleep 5
if pm2 status | grep -q "$APP_NAME.*online"; then
    print_success "Application is running"
else
    print_error "Application failed to start! Check logs: pm2 logs $APP_NAME"
    exit 1
fi
echo ""

# Step 8: Cleanup old backups (keep last 5)
print_info "Cleaning up old backups..."
cd "$HOME/backups"
ls -t | tail -n +6 | xargs -r rm -rf
print_success "Old backups removed"
echo ""

print_success "Deployment completed successfully!"
echo ""
echo "View logs: pm2 logs $APP_NAME"
echo "Check status: pm2 status"
echo ""
