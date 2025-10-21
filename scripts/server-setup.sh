#!/bin/bash

###############################################################################
# SoulMatch Web - Initial Server Setup Script
# Run this script on a fresh Ubuntu 22.04 server
# Usage: bash server-setup.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}➜ $1${NC}"; }
print_header() { echo -e "${BLUE}==== $1 ====${NC}"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

echo ""
print_header "SoulMatch Web - Server Setup"
echo ""

# Get configuration from user
read -p "Enter domain name (or press Enter to skip): " DOMAIN_NAME
read -p "Enter email for SSL certificate: " SSL_EMAIL
read -p "Enter username for non-root user [soulmatch]: " USERNAME
USERNAME=${USERNAME:-soulmatch}

echo ""
print_info "Configuration:"
echo "  Domain: ${DOMAIN_NAME:-Not configured}"
echo "  Email: $SSL_EMAIL"
echo "  Username: $USERNAME"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Step 1: Update system
print_header "Updating System"
apt update
apt upgrade -y
print_success "System updated"
echo ""

# Step 2: Set timezone
print_header "Setting Timezone"
timedatectl set-timezone Asia/Kolkata
print_success "Timezone set to Asia/Kolkata"
echo ""

# Step 3: Create non-root user
print_header "Creating User: $USERNAME"
if id "$USERNAME" &>/dev/null; then
    print_info "User $USERNAME already exists"
else
    adduser --disabled-password --gecos "" $USERNAME
    echo "$USERNAME:$(openssl rand -base64 32)" | chpasswd
    usermod -aG sudo $USERNAME
    print_success "User created"
fi
echo ""

# Step 4: Install Node.js
print_header "Installing Node.js 20.x"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version
print_success "Node.js installed"
echo ""

# Step 5: Install PM2
print_header "Installing PM2"
npm install -g pm2
pm2 --version
print_success "PM2 installed"
echo ""

# Step 6: Install Git
print_header "Installing Git"
apt install git -y
git --version
print_success "Git installed"
echo ""

# Step 7: Install Nginx
print_header "Installing Nginx"
apt install nginx -y
systemctl start nginx
systemctl enable nginx
print_success "Nginx installed and started"
echo ""

# Step 8: Install Certbot
print_header "Installing Certbot"
apt install certbot python3-certbot-nginx -y
print_success "Certbot installed"
echo ""

# Step 9: Configure Firewall
print_header "Configuring Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
print_success "Firewall configured"
echo ""

# Step 10: Install Fail2ban
print_header "Installing Fail2ban"
apt install fail2ban -y

# Create fail2ban config
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl start fail2ban
systemctl enable fail2ban
print_success "Fail2ban installed and configured"
echo ""

# Step 11: Enable automatic security updates
print_header "Enabling Automatic Security Updates"
apt install unattended-upgrades -y
echo 'Unattended-Upgrade::Automatic-Reboot "true";' >> /etc/apt/apt.conf.d/50unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot-Time "03:00";' >> /etc/apt/apt.conf.d/50unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
print_success "Automatic updates enabled"
echo ""

# Step 12: Create application directory
print_header "Creating Application Directory"
mkdir -p /var/www/soulmatch
chown $USERNAME:$USERNAME /var/www/soulmatch
print_success "Application directory created"
echo ""

# Step 13: Configure Nginx (if domain provided)
if [ ! -z "$DOMAIN_NAME" ]; then
    print_header "Configuring Nginx"

    cat > /etc/nginx/sites-available/soulmatch <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    access_log /var/log/nginx/soulmatch-access.log;
    error_log /var/log/nginx/soulmatch-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;
}
EOF

    ln -sf /etc/nginx/sites-available/soulmatch /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl reload nginx
    print_success "Nginx configured for $DOMAIN_NAME"
    echo ""
fi

# Step 14: Setup SSL (if domain and email provided)
if [ ! -z "$DOMAIN_NAME" ] && [ ! -z "$SSL_EMAIL" ]; then
    print_header "Setting up SSL Certificate"
    print_info "Please ensure your domain DNS is pointing to this server"
    read -p "Is DNS configured and propagated? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos -m $SSL_EMAIL --redirect
        print_success "SSL certificate installed"
    else
        print_info "Skipping SSL. Run this later: sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME"
    fi
    echo ""
fi

# Step 15: Harden SSH
print_header "Hardening SSH Configuration"
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
echo "AllowUsers $USERNAME" >> /etc/ssh/sshd_config
print_info "Root login disabled. Make sure you have SSH key for $USERNAME user!"
echo ""

# Step 16: Create helpful scripts
print_header "Creating Helper Scripts"

# Create monitoring script
cat > /home/$USERNAME/monitor.sh <<'EOF'
#!/bin/bash
echo "=== System Status ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== Recent Logs ==="
pm2 logs soulmatch --lines 10 --nostream
EOF

chmod +x /home/$USERNAME/monitor.sh
chown $USERNAME:$USERNAME /home/$USERNAME/monitor.sh

# Create backup script
cat > /home/$USERNAME/backup.sh <<EOF
#!/bin/bash
BACKUP_DIR=\$HOME/backups/\$(date +%Y%m%d)
mkdir -p \$BACKUP_DIR
sudo cp /etc/nginx/sites-available/soulmatch \$BACKUP_DIR/ 2>/dev/null || true
cp /var/www/soulmatch/.env.local \$BACKUP_DIR/ 2>/dev/null || true
pm2 save
cp ~/.pm2/dump.pm2 \$BACKUP_DIR/ 2>/dev/null || true
cd ~/backups && tar -czf config-backup-\$(date +%Y%m%d).tar.gz \$(date +%Y%m%d)
echo "Backup created: ~/backups/config-backup-\$(date +%Y%m%d).tar.gz"
EOF

chmod +x /home/$USERNAME/backup.sh
chown $USERNAME:$USERNAME /home/$USERNAME/backup.sh

print_success "Helper scripts created"
echo ""

# Final instructions
print_header "Setup Complete!"
echo ""
print_success "Server is ready for deployment"
echo ""
echo "Next steps:"
echo "1. Switch to $USERNAME user: su - $USERNAME"
echo "2. Add SSH key to ~/.ssh/authorized_keys"
echo "3. Clone your repository to /var/www/soulmatch"
echo "4. Create .env.local file"
echo "5. Build and start application"
echo ""
echo "Helpful commands:"
echo "  Monitor system: ./monitor.sh"
echo "  Backup config: ./backup.sh"
echo "  View logs: pm2 logs soulmatch"
echo ""
print_info "IMPORTANT: Setup SSH key authentication before restarting SSH!"
print_info "Current session will remain active"
echo ""
read -p "Restart SSH service now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl restart ssh
    print_success "SSH service restarted"
else
    print_info "Remember to restart SSH: sudo systemctl restart ssh"
fi
echo ""
print_success "All done! 🎉"
echo ""
