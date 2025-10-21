# Server Maintenance Guide

Complete guide for ongoing VPS maintenance, monitoring, and optimization.

---

## Daily Tasks (5 minutes)

### Morning Health Check

```bash
# Run monitoring script
~/monitor.sh

# Check for issues:
# - CPU > 80%
# - Memory > 80%
# - Disk > 80%
# - Application not running
```

### Check Application Logs

```bash
# View last 20 lines
pm2 logs soulmatch --lines 20

# Look for:
# - Error messages
# - 500 status codes
# - Database connection issues
# - Memory warnings
```

### Verify Uptime

```bash
# Check PM2 status
pm2 status

# Should show: status: online, uptime: X days
```

---

## Weekly Tasks (15-30 minutes)

### Update System Packages

```bash
# Update package lists
sudo apt update

# List upgradable packages
apt list --upgradable

# Upgrade packages
sudo apt upgrade -y

# Clean up
sudo apt autoremove -y
sudo apt autoclean
```

### Review Logs

```bash
# Application errors
pm2 logs soulmatch --err --lines 100

# Nginx errors
sudo tail -100 /var/log/nginx/soulmatch-error.log

# System logs
sudo journalctl -p err -S yesterday

# Failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Fail2ban bans
sudo fail2ban-client status sshd
```

### Check Disk Usage

```bash
# Overview
df -h

# Find large directories
sudo du -sh /var/* | sort -rh | head -10
sudo du -sh /var/log/* | sort -rh | head -10

# Clean if needed:
# PM2 logs
pm2 flush

# System logs (keep last 7 days)
sudo journalctl --vacuum-time=7d

# Nginx logs (rotate)
sudo logrotate /etc/logrotate.d/nginx
```

### Database Maintenance (Supabase)

```bash
# Check Supabase Dashboard:
# - Storage usage
# - Database size
# - Active connections
# - Query performance
```

### Backup Configuration

```bash
# Run backup script
~/backup.sh

# Download backup to local machine
scp soulmatch@YOUR_IP:~/backups/config-backup-*.tar.gz ~/Desktop/
```

---

## Monthly Tasks (1-2 hours)

### Security Audit

```bash
# Run Lynis security audit
sudo lynis audit system

# Review recommendations and implement critical ones

# Check for rootkits
sudo apt install rkhunter -y
sudo rkhunter --check

# Review user accounts
cat /etc/passwd | grep -v nologin
last -a

# Check SUID files
sudo find / -perm /4000 -type f -exec ls -ld {} \;

# Review cron jobs
crontab -l
sudo cat /etc/crontab
```

### SSL Certificate Check

```bash
# Check expiry
sudo certbot certificates

# Should auto-renew, but test:
sudo certbot renew --dry-run
```

### Performance Review

```bash
# Check average load
uptime

# Memory usage trend
free -h
ps aux --sort=-%mem | head -10

# Disk I/O
sudo apt install sysstat
iostat -x 1 5

# Network usage
sudo apt install vnstat
vnstat
```

### Update Dependencies

```bash
cd /var/www/soulmatch

# Check for outdated packages
npm outdated

# Update carefully (test first!)
# npm update
# npm audit fix

# Update PM2
sudo npm update -g pm2
```

### Rotate Secrets (Quarterly)

```bash
# Supabase: Generate new keys
# 1. Go to Supabase Dashboard
# 2. Settings → API → Generate new keys
# 3. Update .env.local
# 4. Restart application

# Cloudinary: Rotate API keys
# 1. Go to Cloudinary Settings
# 2. Security → API Keys → Regenerate
# 3. Update .env.local
# 4. Restart application
```

---

## Performance Optimization

### Monitor Application Performance

```bash
# PM2 monitoring
pm2 monit

# Check response times
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://your-domain.com

# Load test (careful!)
# sudo apt install apache2-utils
# ab -n 100 -c 10 https://your-domain.com/
```

### Optimize PM2

```bash
# Enable PM2 clustering (for multi-core)
pm2 delete soulmatch
pm2 start npm --name "soulmatch" -i max -- start

# Or specific number of instances:
# pm2 start npm --name "soulmatch" -i 2 -- start

# Monitor cluster
pm2 list
```

### Optimize Nginx

```bash
# Edit Nginx config
sudo nano /etc/nginx/nginx.conf
```

**Add performance settings:**

```nginx
# In http block:
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

# Cache settings
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;

# Connection pooling
keepalive_timeout 65;
keepalive_requests 100;

# File upload
client_max_body_size 10M;
client_body_buffer_size 128k;
```

**Test and reload:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Database Query Optimization

Check slow queries in Supabase:
- Dashboard → Database → Query Performance
- Identify slow queries
- Add indexes if needed
- Optimize SELECT statements

---

## Monitoring & Alerting

### Setup Email Alerts

```bash
# Install mail utility
sudo apt install ssmtp mailutils -y

# Configure SSMTP
sudo nano /etc/ssmtp/ssmtp.conf
```

**Add:**

```
root=your-email@gmail.com
mailhub=smtp.gmail.com:587
AuthUser=your-email@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES
FromLineOverride=YES
```

**Test:**

```bash
echo "Test email" | mail -s "Test Subject" your-email@gmail.com
```

### Setup Monitoring Alerts

```bash
# Create alert script
nano ~/alert.sh
```

**Add:**

```bash
#!/bin/bash

# Check disk usage
DISK=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK -gt 80 ]; then
    echo "Disk usage is ${DISK}%" | mail -s "ALERT: High Disk Usage" your-email@gmail.com
fi

# Check if app is running
if ! pm2 status | grep -q "soulmatch.*online"; then
    echo "Application is not running!" | mail -s "ALERT: App Down" your-email@gmail.com
    pm2 restart soulmatch
fi

# Check memory
MEM=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $MEM -gt 80 ]; then
    echo "Memory usage is ${MEM}%" | mail -s "ALERT: High Memory" your-email@gmail.com
fi
```

**Make executable and schedule:**

```bash
chmod +x ~/alert.sh

# Add to crontab (run every 30 minutes)
crontab -e
```

Add:

```
*/30 * * * * /home/soulmatch/alert.sh
```

### Third-Party Monitoring (Optional)

**Free Monitoring Services:**

1. **UptimeRobot** (uptimerobot.com)
   - 50 monitors free
   - 5-minute checks
   - Email/SMS alerts

2. **StatusCake** (statuscake.com)
   - Uptime monitoring
   - Page speed monitoring
   - Free tier available

3. **Hetrixtools** (hetrixtools.com)
   - Server monitoring
   - Uptime monitoring
   - Free tier: 15 monitors

**Setup Example (UptimeRobot):**

1. Sign up at uptimerobot.com
2. Add New Monitor
3. Type: HTTP(S)
4. URL: https://your-domain.com
5. Interval: 5 minutes
6. Alert Contacts: Your email
7. Save

---

## Backup & Restore

### Automated Backups

```bash
# Create backup script
nano ~/auto-backup.sh
```

**Add:**

```bash
#!/bin/bash
BACKUP_DIR=$HOME/backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Application files
cd /var/www/soulmatch
tar -czf $BACKUP_DIR/app-backup.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    .

# Configuration
sudo cp /etc/nginx/sites-available/soulmatch $BACKUP_DIR/
cp .env.local $BACKUP_DIR/
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/

# Keep last 7 backups
cd $HOME/backups
ls -t | tail -n +8 | xargs -r rm -rf

echo "Backup completed: $BACKUP_DIR"
```

**Schedule daily:**

```bash
chmod +x ~/auto-backup.sh
crontab -e
```

Add:

```
0 2 * * * /home/soulmatch/auto-backup.sh >> /home/soulmatch/backup.log 2>&1
```

### Restore from Backup

```bash
# Stop application
pm2 stop soulmatch

# Extract backup
cd /var/www/soulmatch
tar -xzf ~/backups/BACKUP_DATE/app-backup.tar.gz

# Restore .env.local
cp ~/backups/BACKUP_DATE/.env.local .

# Restore Nginx config
sudo cp ~/backups/BACKUP_DATE/soulmatch /etc/nginx/sites-available/
sudo nginx -t
sudo systemctl reload nginx

# Rebuild and start
npm install
npm run build
pm2 restart soulmatch
```

---

## Troubleshooting Common Issues

### Application Won't Start

```bash
# Check logs
pm2 logs soulmatch --err

# Common causes:
# 1. Port in use
sudo lsof -i :3000
sudo kill -9 PID

# 2. Environment variables
cat /var/www/soulmatch/.env.local

# 3. Build errors
cd /var/www/soulmatch
npm run build

# 4. Dependency issues
rm -rf node_modules package-lock.json
npm install
```

### High Memory Usage

```bash
# Find memory hog
ps aux --sort=-%mem | head -10

# If Node.js is the issue:
# Increase memory limit
pm2 delete soulmatch
pm2 start npm --name "soulmatch" --max-memory-restart 500M -- start

# Or restart periodically
# pm2 start npm --name "soulmatch" --cron-restart="0 3 * * *" -- start
```

### SSL Certificate Issues

```bash
# Check expiry
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# If renewal fails:
# 1. Check DNS
nslookup your-domain.com

# 2. Check Nginx config
sudo nginx -t

# 3. Check firewall
sudo ufw status

# 4. Re-issue certificate
sudo certbot delete --cert-name your-domain.com
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Database Connection Issues

```bash
# Check Supabase status
curl https://status.supabase.com

# Verify credentials
nano /var/www/soulmatch/.env.local

# Test connection
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/" \
  -H "apikey: YOUR_ANON_KEY"

# If connection times out:
# Check firewall rules
# Verify Supabase project is active
```

### Slow Performance

```bash
# Check server load
uptime
top

# Check network latency
ping -c 5 google.com

# Check disk I/O
iostat -x 1 5

# Check application response
curl -o /dev/null -s -w "Time: %{time_total}s\n" http://localhost:3000

# Optimize if needed:
# - Enable Nginx caching
# - Use PM2 cluster mode
# - Optimize database queries
# - Add CDN (Cloudflare)
```

---

## Performance Metrics to Track

### Application Metrics

- **Uptime:** Target 99.9%
- **Response Time:** < 500ms average
- **Error Rate:** < 0.1%
- **Memory Usage:** < 70%
- **CPU Usage:** < 60% average

### Server Metrics

- **Disk Usage:** < 70%
- **Load Average:** < Number of CPU cores
- **Network I/O:** Monitor for spikes
- **Failed Login Attempts:** Review weekly

### Database Metrics (Supabase)

- **Database Size:** Monitor growth
- **Active Connections:** < 20 concurrent
- **Query Performance:** No queries > 1s
- **Storage Usage:** Plan for growth

---

## Scaling Considerations

### When to Upgrade Server

Upgrade if consistently experiencing:
- CPU > 80% for extended periods
- Memory > 80%
- Disk > 80%
- Response times > 1 second
- Frequent application restarts

### Vertical Scaling (Bigger Server)

**From Hetzner CX22 to CX32:**
- 4 vCPU, 8GB RAM
- Cost: ~€9/month
- 2x performance

**Migration:**
1. Create new server
2. Run setup script
3. Deploy application
4. Test thoroughly
5. Update DNS
6. Decommission old server

### Horizontal Scaling (Multiple Servers)

Consider when:
- Single server can't handle load
- Need redundancy
- Traffic > 10,000 users/day

**Options:**
- Load balancer + multiple app servers
- Separate static file server (CDN)
- Database read replicas

---

## Cost Optimization

### Monitor Costs

**Monthly Review:**
- Server: Hetzner €4.15/month
- Supabase: Check dashboard usage
- Cloudinary: Check credits used
- Domain: Annual renewal
- SSL: Free (Let's Encrypt)

### Reduce Costs

1. **Image Optimization:** Use Next.js Image + Cloudinary auto-optimization
2. **Caching:** Enable Nginx caching to reduce compute
3. **Database:** Use indexes, optimize queries
4. **CDN:** Use Cloudflare (free tier) for static assets
5. **Monitoring:** Use free tier services

### Cost Alerts

Set up budget alerts:
- Supabase: Alert at 80% of free tier
- Cloudinary: Alert at 20 credits
- Server: Monitor CPU/memory to avoid upgrades

---

## Quick Reference

### Daily Commands

```bash
~/monitor.sh                   # Health check
pm2 logs soulmatch --lines 20  # Check logs
pm2 status                     # App status
```

### Weekly Commands

```bash
sudo apt update && sudo apt upgrade -y  # Update packages
~/backup.sh                             # Backup
df -h                                   # Disk usage
```

### Emergency Commands

```bash
pm2 restart soulmatch          # Restart app
pm2 logs soulmatch --err       # Error logs
sudo systemctl restart nginx   # Restart web server
sudo systemctl status nginx    # Check Nginx
sudo ufw status                # Check firewall
```

---

## Maintenance Checklist

**Daily:**
- [ ] Run health check
- [ ] Review application logs
- [ ] Verify uptime

**Weekly:**
- [ ] Update system packages
- [ ] Review error logs
- [ ] Check disk usage
- [ ] Run backup

**Monthly:**
- [ ] Security audit
- [ ] SSL certificate check
- [ ] Performance review
- [ ] Update dependencies

**Quarterly:**
- [ ] Rotate secrets/keys
- [ ] Test disaster recovery
- [ ] Review costs
- [ ] Capacity planning

---

**Remember:** Consistent maintenance prevents major issues!
