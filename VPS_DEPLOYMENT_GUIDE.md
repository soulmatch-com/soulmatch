# VPS Deployment Guide - Step by Step

Complete guide to deploy SoulMatch Web on a VPS (Virtual Private Server) for maximum cost savings.

**Estimated Cost:** $4-6/month
**Deployment Time:** 60-90 minutes (first time)
**Skill Level:** Intermediate (basic Linux knowledge helpful)

---

## Table of Contents

1. [Server Selection & Setup](#step-1-server-selection--setup)
2. [Initial Server Configuration](#step-2-initial-server-configuration)
3. [Install Required Software](#step-3-install-required-software)
4. [Deploy Application](#step-4-deploy-application)
5. [Configure Web Server (Nginx)](#step-5-configure-web-server-nginx)
6. [Setup SSL Certificate](#step-6-setup-ssl-certificate)
7. [Configure Domain](#step-7-configure-domain)
8. [Setup Process Manager](#step-8-setup-process-manager)
9. [Configure Firewall](#step-9-configure-firewall)
10. [Testing](#step-10-testing)
11. [Ongoing Maintenance](#step-11-ongoing-maintenance)

---

## Recommended VPS Providers

| Provider | Plan | Price | Specs | Best For |
|----------|------|-------|-------|----------|
| **Hetzner** | CX22 | €4.15/mo (~$4.50) | 2 vCPU, 4GB RAM | Best value (Europe) |
| **DigitalOcean** | Basic | $6/mo | 1 vCPU, 1GB RAM | Easy to use |
| **Vultr** | Regular | $6/mo | 1 vCPU, 1GB RAM | Good performance |
| **Linode** | Shared | $5/mo | 1 vCPU, 1GB RAM | Reliable |
| **Contabo** | VPS S | €4/mo (~$4.30) | 4 vCPU, 8GB RAM | Most resources |

**Recommendation:** **Hetzner CX22** (best price/performance for Indian audience from Singapore/Europe servers)

---

## Prerequisites

Before starting, you need:

- [ ] VPS account created
- [ ] Domain name (optional but recommended)
- [ ] SSH client installed (Terminal on Mac/Linux, PuTTY on Windows)
- [ ] Your local .env.local file with all environment variables
- [ ] Basic Linux command knowledge

---

## STEP 1: Server Selection & Setup

### 1.1 Create VPS Account

**Using Hetzner (Recommended):**

1. Go to [https://www.hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Click **"Sign Up"**
3. Complete registration
4. Add payment method

### 1.2 Create Server

1. **Login to Hetzner Console**
2. Click **"+ New Project"** → Name it "SoulMatch"
3. Click **"Add Server"**

**Server Configuration:**

```
Location: Falkenstein, Germany (or Ashburn, USA for global)
Image: Ubuntu 22.04 LTS
Type: Shared vCPU → CX22 (2 vCPU, 4GB RAM, 40GB SSD)
Networking: IPv4 + IPv6
SSH Keys: Add your SSH key (or create password)
Name: soulmatch-production
```

4. Click **"Create & Buy Now"**
5. Wait ~30 seconds for server creation
6. **Copy your server IP address** (e.g., 123.45.67.89)

### 1.3 Initial Connection Test

```bash
# Replace with your server IP
ssh root@123.45.67.89

# If using password, enter it when prompted
# If using SSH key, you'll connect automatically

# You should see:
# root@soulmatch-production:~#
```

✅ **Checkpoint:** You're now connected to your server!

---

## STEP 2: Initial Server Configuration

### 2.1 Update System Packages

```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y

# This may take 2-5 minutes
```

### 2.2 Set Timezone

```bash
# Set to your timezone (example: Asia/Kolkata)
timedatectl set-timezone Asia/Kolkata

# Verify
timedatectl
```

### 2.3 Create Non-Root User (Security Best Practice)

```bash
# Create new user
adduser soulmatch

# Follow prompts:
# - Enter password (SAVE THIS!)
# - Full Name: SoulMatch App
# - Other fields: Press Enter to skip

# Add to sudo group
usermod -aG sudo soulmatch

# Switch to new user
su - soulmatch

# You should now see: soulmatch@soulmatch-production:~$
```

### 2.4 Configure SSH for New User

```bash
# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# If you used SSH key with root, copy it:
sudo cp /root/.ssh/authorized_keys ~/.ssh/
sudo chown soulmatch:soulmatch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2.5 Test New User Connection

Open a **NEW terminal window** (don't close the first one):

```bash
# Test connection with new user
ssh soulmatch@123.45.67.89

# If successful, close the old root connection
```

✅ **Checkpoint:** You can SSH as non-root user

---

## STEP 3: Install Required Software

### 3.1 Install Node.js 20.x

```bash
# Download and install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 3.2 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify
pm2 --version
```

### 3.3 Install Git

```bash
# Install Git
sudo apt install git -y

# Verify
git --version

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 3.4 Install Nginx (Web Server)

```bash
# Install Nginx
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx

# Press 'q' to exit status view
```

### 3.5 Install Certbot (for SSL)

```bash
# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Verify
certbot --version
```

✅ **Checkpoint:** All software installed

**Verify by visiting:** `http://YOUR_SERVER_IP` in browser
You should see "Welcome to nginx!" page

---

## STEP 4: Deploy Application

### 4.1 Create Application Directory

```bash
# Create directory
sudo mkdir -p /var/www/soulmatch
sudo chown soulmatch:soulmatch /var/www/soulmatch

# Navigate to directory
cd /var/www/soulmatch
```

### 4.2 Clone Repository

**Option A: Public Repository**

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/soulmatch-web.git .

# Note the dot (.) at the end - clones into current directory
```

**Option B: Private Repository**

```bash
# Generate SSH key on server
ssh-keygen -t ed25519 -C "server@soulmatch"
# Press Enter 3 times (default location, no passphrase)

# Display public key
cat ~/.ssh/id_ed25519.pub

# Copy the output and add to GitHub:
# GitHub → Settings → SSH and GPG keys → New SSH key
# Paste the key and save

# Clone repository
git clone git@github.com:YOUR_USERNAME/soulmatch-web.git .
```

### 4.3 Install Dependencies

```bash
# Install npm packages
npm install

# This takes 2-5 minutes
```

### 4.4 Create Environment File

```bash
# Create .env.local file
nano .env.local
```

**Paste your environment variables:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret

# Application URL (use your domain or IP for now)
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter`

### 4.5 Build Application

```bash
# Build for production
npm run build

# This takes 1-2 minutes
# You should see: ✓ Compiled successfully
```

### 4.6 Test Application

```bash
# Start application (test)
npm start

# You should see:
# ▲ Next.js 15.5.4
# - Local:        http://localhost:3000
```

**In another terminal, test:**

```bash
curl http://localhost:3000
# Should see HTML output
```

**Stop the test server:**
- Press `Ctrl + C` in the first terminal

✅ **Checkpoint:** Application built successfully

---

## STEP 5: Configure Web Server (Nginx)

### 5.1 Create Nginx Configuration

```bash
# Create config file
sudo nano /etc/nginx/sites-available/soulmatch
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;

    # Replace with your domain (or server IP for now)
    server_name your-domain.com www.your-domain.com;

    # Logging
    access_log /var/log/nginx/soulmatch-access.log;
    error_log /var/log/nginx/soulmatch-error.log;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Important headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size (for image uploads)
    client_max_body_size 10M;
}
```

**Save and exit:** `Ctrl + X` → `Y` → `Enter`

### 5.2 Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/soulmatch /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo systemctl reload nginx
```

✅ **Checkpoint:** Nginx configured

---

## STEP 6: Setup SSL Certificate

**Note:** You need a domain name for SSL. If you don't have one yet, skip to Step 8 and come back here after configuring your domain.

### 6.1 Update Nginx Config with Domain

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/soulmatch

# Replace this line:
# server_name your-domain.com www.your-domain.com;
# With your actual domain:
# server_name soulmatch.example.com www.soulmatch.example.com;

# Save: Ctrl + X → Y → Enter
```

### 6.2 Obtain SSL Certificate

```bash
# Get certificate from Let's Encrypt
sudo certbot --nginx -d soulmatch.example.com -d www.soulmatch.example.com

# Follow prompts:
# - Enter email address
# - Agree to terms (Y)
# - Share email (Y or N)
# - Redirect HTTP to HTTPS? Choose 2 (Redirect)

# Should output:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/soulmatch.example.com/fullchain.pem
```

### 6.3 Setup Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Should output: Congratulations, all simulated renewals succeeded

# Auto-renewal is already configured via systemd timer
# Verify:
sudo systemctl status certbot.timer
```

✅ **Checkpoint:** SSL certificate installed and auto-renewing

---

## STEP 7: Configure Domain

### 7.1 Point Domain to Server

**In your domain registrar (GoDaddy, Namecheap, etc.):**

1. Go to DNS Management
2. Add/Edit these records:

```
Type: A
Name: @ (or soulmatch)
Value: YOUR_SERVER_IP
TTL: 3600

Type: A
Name: www
Value: YOUR_SERVER_IP
TTL: 3600
```

3. Save changes

**Wait 5-30 minutes for DNS propagation**

### 7.2 Verify DNS

```bash
# Check if domain resolves
nslookup soulmatch.example.com

# Should show your server IP
```

✅ **Checkpoint:** Domain pointing to server

---

## STEP 8: Setup Process Manager

### 8.1 Start Application with PM2

```bash
# Navigate to app directory
cd /var/www/soulmatch

# Start with PM2
pm2 start npm --name "soulmatch" -- start

# You should see:
# ┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ soulmatch    │ fork        │ 0       │ online  │ 0%       │
# └─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### 8.2 Configure PM2 Startup

```bash
# Generate startup script
pm2 startup

# Copy the command it outputs (will look like):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u soulmatch --hp /home/soulmatch

# Run that command (paste it and press Enter)

# Save PM2 process list
pm2 save

# Should output: [PM2] Successfully saved
```

### 8.3 PM2 Management Commands

```bash
# View status
pm2 status

# View logs (real-time)
pm2 logs soulmatch

# Press Ctrl+C to exit logs

# View logs (last 100 lines)
pm2 logs soulmatch --lines 100

# Restart application
pm2 restart soulmatch

# Stop application
pm2 stop soulmatch

# Start application
pm2 start soulmatch

# Delete from PM2
pm2 delete soulmatch
```

✅ **Checkpoint:** Application running and auto-starts on reboot

---

## STEP 9: Configure Firewall

### 9.1 Setup UFW (Uncomplicated Firewall)

```bash
# Check if UFW is installed
sudo ufw status

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow OpenSSH

# Allow HTTP
sudo ufw allow 'Nginx HTTP'

# Allow HTTPS
sudo ufw allow 'Nginx HTTPS'

# Enable firewall
sudo ufw enable

# Press 'y' to confirm

# Verify
sudo ufw status

# Should show:
# Status: active
# To                         Action      From
# --                         ------      ----
# OpenSSH                    ALLOW       Anywhere
# Nginx HTTP                 ALLOW       Anywhere
# Nginx HTTPS                ALLOW       Anywhere
```

✅ **Checkpoint:** Firewall configured

---

## STEP 10: Testing

### 10.1 Test Application

**Visit your domain/IP:**

```
https://soulmatch.example.com
```

**Test checklist:**

- [ ] Homepage loads
- [ ] Sign up works
- [ ] Email confirmation works
- [ ] Login works
- [ ] Profile creation works
- [ ] Image upload works
- [ ] Search works
- [ ] No console errors (F12 → Console)

### 10.2 Test Server Response

```bash
# Check HTTP response
curl -I https://soulmatch.example.com

# Should see:
# HTTP/2 200
# server: nginx
```

### 10.3 Check Application Logs

```bash
# View PM2 logs
pm2 logs soulmatch --lines 50

# Check for errors
# Healthy logs show:
# ▲ Next.js 15.5.4
# - Local:        http://localhost:3000
# - Network:      http://0.0.0.0:3000
```

### 10.4 Check Server Resources

```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check CPU usage
top
# Press 'q' to exit
```

✅ **Checkpoint:** Everything working!

---

## STEP 11: Ongoing Maintenance

### 11.1 Update Application

```bash
# Navigate to app directory
cd /var/www/soulmatch

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Rebuild
npm run build

# Restart application
pm2 restart soulmatch

# Verify
pm2 logs soulmatch
```

### 11.2 Update Server Packages

```bash
# Update package lists
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Reboot if kernel updated
sudo reboot
# Wait 1-2 minutes, then reconnect
```

### 11.3 Monitor Application

```bash
# PM2 monitoring
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/soulmatch-access.log
sudo tail -f /var/log/nginx/soulmatch-error.log

# Check system logs
sudo journalctl -u nginx -f
```

### 11.4 Backup Strategy

**Database:** Already backed up by Supabase

**Application Code:** In GitHub

**Environment Variables:**

```bash
# Backup .env.local
cp /var/www/soulmatch/.env.local ~/env-backup-$(date +%Y%m%d).txt

# Download to your local machine
scp soulmatch@YOUR_SERVER_IP:~/env-backup-*.txt ~/Desktop/
```

### 11.5 Security Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Select 'Yes'
```

---

## Quick Reference Commands

### Application Management

```bash
# View status
pm2 status

# View logs
pm2 logs soulmatch

# Restart app
pm2 restart soulmatch

# Rebuild and restart
cd /var/www/soulmatch && npm run build && pm2 restart soulmatch
```

### Nginx Management

```bash
# Test config
sudo nginx -t

# Reload config
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/soulmatch-error.log
```

### SSL Certificate

```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs soulmatch --lines 100

# Common issues:
# 1. Environment variables missing
nano /var/www/soulmatch/.env.local

# 2. Build failed
cd /var/www/soulmatch && npm run build

# 3. Port already in use
sudo lsof -i :3000
pm2 delete all
pm2 start npm --name "soulmatch" -- start
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# If not running, start it
pm2 start soulmatch

# Check Nginx config
sudo nginx -t

# Check logs
pm2 logs soulmatch
sudo tail /var/log/nginx/soulmatch-error.log
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate expiry
sudo certbot certificates
```

### Can't SSH into server

```bash
# From Hetzner console, use web console
# Then check SSH service:
sudo systemctl status ssh
sudo systemctl restart ssh
```

---

## Cost Comparison

| Expense | VPS Cost | Vercel Cost (at scale) |
|---------|----------|------------------------|
| Hosting | $4.50/mo | $20/mo |
| SSL | Free (Let's Encrypt) | Free |
| Bandwidth | Included | Limited |
| **Total** | **$4.50/mo** | **$20/mo** |

**Annual Savings:** $186/year by using VPS

---

## Next Steps

1. ✅ Server deployed and running
2. Setup monitoring (see MONITORING.md)
3. Configure backups
4. Setup staging environment (optional)
5. Configure CDN (optional, for performance)

---

## Support

**Issues?** Check:
- PM2 logs: `pm2 logs soulmatch`
- Nginx logs: `sudo tail -f /var/log/nginx/soulmatch-error.log`
- System logs: `sudo journalctl -xe`

**Need help?** Review troubleshooting section above or deployment documentation.

---

**Congratulations!** 🎉 Your application is now live on a VPS at minimal cost!
