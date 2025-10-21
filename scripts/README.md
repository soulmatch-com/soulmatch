# Deployment Scripts

Automation scripts for VPS deployment and maintenance.

## Scripts Overview

### 1. `server-setup.sh` - Initial Server Setup

**Purpose:** Automates the complete initial setup of a fresh Ubuntu 22.04 VPS.

**What it does:**
- Updates system packages
- Creates non-root user
- Installs Node.js, PM2, Git, Nginx, Certbot
- Configures firewall (UFW)
- Installs and configures Fail2ban
- Enables automatic security updates
- Creates application directory
- Configures Nginx (if domain provided)
- Sets up SSL certificate (if domain provided)
- Hardens SSH configuration

**Usage:**

```bash
# On your VPS (as root)
wget https://raw.githubusercontent.com/YOUR_USERNAME/soulmatch-web/main/scripts/server-setup.sh
chmod +x server-setup.sh
sudo bash server-setup.sh
```

**Duration:** ~10-15 minutes

---

### 2. `deploy.sh` - Application Deployment

**Purpose:** Automates application updates and deployment.

**What it does:**
- Creates backup of current version
- Stops application
- Pulls latest code from GitHub
- Installs dependencies
- Builds application
- Restarts application
- Performs health check
- Cleans up old backups

**Usage:**

```bash
# On your VPS (as soulmatch user)
cd /var/www/soulmatch
bash scripts/deploy.sh
```

**When to use:**
- Deploying code updates
- After merging new features
- Regular production deployments

**Duration:** ~3-5 minutes

---

### 3. `monitor.sh` - Server Monitoring

**Purpose:** Displays comprehensive server and application status.

**What it shows:**
- System information (hostname, OS, uptime)
- CPU usage and load average
- Memory usage
- Disk usage
- Network connections
- PM2 application status
- Nginx status
- Fail2ban status
- Recent application logs
- Health summary with warnings

**Usage:**

```bash
# On your VPS
bash scripts/monitor.sh

# Or from anywhere:
~/monitor.sh  # (if copied to home directory)
```

**When to use:**
- Daily health checks
- Investigating issues
- Performance monitoring
- Before/after deployments

---

## Installation on Server

After deploying your application:

```bash
# Make scripts executable
cd /var/www/soulmatch/scripts
chmod +x deploy.sh monitor.sh

# Copy monitor script to home for easy access
cp monitor.sh ~/monitor.sh
```

## Automated Deployment Workflow

### Option 1: Manual Deployment

```bash
ssh soulmatch@your-server-ip
cd /var/www/soulmatch
bash scripts/deploy.sh
```

### Option 2: Remote Deployment

```bash
# From your local machine
ssh soulmatch@your-server-ip 'cd /var/www/soulmatch && bash scripts/deploy.sh'
```

### Option 3: GitHub Actions (Future Enhancement)

Create `.github/workflows/deploy.yml` for automatic deployments on push.

---

## Common Tasks

### Deploy Application
```bash
cd /var/www/soulmatch
bash scripts/deploy.sh
```

### Check Server Health
```bash
bash scripts/monitor.sh
```

### View Application Logs
```bash
pm2 logs soulmatch
```

### Restart Application
```bash
pm2 restart soulmatch
```

### Backup Configuration
```bash
~/backup.sh  # Created by server-setup.sh
```

---

## Troubleshooting

### Deploy Script Fails

**Build Error:**
```bash
# Check build locally first
cd /var/www/soulmatch
npm run build

# Check logs
cat /var/www/soulmatch/.next/build-errors.log
```

**Git Pull Error:**
```bash
# Check git status
git status

# Reset if needed (CAUTION: loses local changes)
git reset --hard origin/main
```

**PM2 Error:**
```bash
# Check PM2 status
pm2 status

# Restart PM2
pm2 restart all

# Delete and recreate
pm2 delete soulmatch
pm2 start npm --name "soulmatch" -- start
```

### Server Setup Script Issues

**SSH Connection Lost:**
- Use VPS provider's web console
- Check SSH service: `sudo systemctl status ssh`
- Check firewall: `sudo ufw status`

**SSL Certificate Fails:**
- Verify DNS is pointing to server: `nslookup your-domain.com`
- Check Nginx config: `sudo nginx -t`
- Run Certbot manually: `sudo certbot --nginx -d your-domain.com`

### Monitor Script Shows High Usage

**High CPU:**
```bash
# Find CPU-intensive processes
top -o %CPU

# Check application performance
pm2 monit
```

**High Memory:**
```bash
# Check memory details
free -h
ps aux --sort=-%mem | head -10

# Restart application if needed
pm2 restart soulmatch
```

**High Disk Usage:**
```bash
# Find large files
sudo du -sh /var/* | sort -rh | head -10

# Clean up:
sudo apt autoremove -y
sudo apt autoclean
pm2 flush  # Clear PM2 logs
sudo journalctl --vacuum-time=7d  # Keep 7 days of logs
```

---

## Customization

### Modify Deploy Script

Edit `/var/www/soulmatch/scripts/deploy.sh`:

```bash
# Change backup retention (default: 5)
ls -t | tail -n +6 | xargs -r rm -rf
# To keep last 10:
ls -t | tail -n +11 | xargs -r rm -rf

# Add post-deployment tasks
# Example: Clear cache
pm2 restart soulmatch
curl http://localhost:3000/api/clear-cache

# Run database migrations
# npm run migrate
```

### Modify Monitor Script

Edit `/var/www/soulmatch/scripts/monitor.sh`:

```bash
# Adjust warning thresholds
# Change from 80% to 90%:
print_metric "Usage" "${cpu_usage}%" 90

# Add custom checks
# Example: Check specific endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $response -eq 200 ]; then
    echo "✓ App responding"
else
    echo "✗ App not responding"
fi
```

---

## Scheduled Tasks (Cron Jobs)

### Setup Automated Monitoring Alerts

```bash
# Edit crontab
crontab -e

# Add daily health check (sends email if issues found)
0 9 * * * /home/soulmatch/monitor.sh | grep "⚠" && echo "Server issues detected" | mail -s "Server Alert" your@email.com

# Backup every day at 2 AM
0 2 * * * /home/soulmatch/backup.sh

# Auto-deploy from main branch (if you trust it)
# 0 3 * * 0 cd /var/www/soulmatch && bash scripts/deploy.sh >> /var/log/auto-deploy.log 2>&1
```

---

## Best Practices

### Before Running Deploy Script

1. ✅ Test changes locally
2. ✅ Commit and push to GitHub
3. ✅ Check no one is actively using the app
4. ✅ Have rollback plan ready

### After Running Deploy Script

1. ✅ Run monitor script to verify health
2. ✅ Test critical functionality
3. ✅ Check logs for errors: `pm2 logs soulmatch`
4. ✅ Monitor for 10-15 minutes

### Regular Maintenance

- **Daily:** Run monitor script
- **Weekly:** Review logs, check security updates
- **Monthly:** Review backups, test restore process
- **Quarterly:** Security audit, update dependencies

---

## Security Notes

⚠️ **Important:**

- Never commit `.env.local` to GitHub
- Keep deployment scripts secure (they may contain paths/configs)
- Review scripts before running (especially from external sources)
- Use SSH keys, not passwords
- Keep backup of .env.local in secure location

---

## Additional Resources

- **Main Deployment Guide:** See `VPS_DEPLOYMENT_GUIDE.md`
- **Security Guide:** See `SERVER_SECURITY.md`
- **Vercel Deployment:** See `DEPLOYMENT.md`

---

## Quick Reference

```bash
# Essential Commands
pm2 status                    # Check app status
pm2 logs soulmatch            # View logs
pm2 restart soulmatch         # Restart app
pm2 monit                     # Live monitoring

sudo systemctl status nginx   # Check Nginx
sudo nginx -t                 # Test Nginx config
sudo systemctl reload nginx   # Reload Nginx

sudo ufw status               # Check firewall
sudo fail2ban-client status   # Check Fail2ban

./scripts/deploy.sh           # Deploy updates
./scripts/monitor.sh          # Health check
```

---

**Questions?** Review the full deployment guide or check troubleshooting sections.
