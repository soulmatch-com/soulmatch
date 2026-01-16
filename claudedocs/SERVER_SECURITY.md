# Server Security Hardening Guide

Essential security measures to protect your VPS deployment.

**⚠️ IMPORTANT:** Complete these steps BEFORE exposing your application to the public.

---

## Quick Security Checklist

- [ ] SSH key authentication enabled
- [ ] Password authentication disabled
- [ ] Root login disabled
- [ ] Firewall (UFW) configured
- [ ] Fail2ban installed
- [ ] Automatic security updates enabled
- [ ] Non-root user created
- [ ] Strong passwords set
- [ ] SSL certificate installed
- [ ] Security headers configured

---

## 1. SSH Hardening

### 1.1 Generate SSH Key (On Your Local Machine)

**Mac/Linux:**

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "your-email@example.com"

# Save to: /Users/yourname/.ssh/id_ed25519
# Set passphrase (recommended)

# Display public key
cat ~/.ssh/id_ed25519.pub
# Copy the output
```

**Windows (PowerShell):**

```powershell
# Generate SSH key pair
ssh-keygen -t ed25519 -C "your-email@example.com"

# Display public key
type $env:USERPROFILE\.ssh\id_ed25519.pub
# Copy the output
```

### 1.2 Add SSH Key to Server

**On Server:**

```bash
# Create .ssh directory (if not exists)
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
nano ~/.ssh/authorized_keys
# Paste your public key
# Save: Ctrl + X → Y → Enter

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### 1.3 Test SSH Key Login

**On Local Machine (NEW terminal):**

```bash
# Test connection
ssh soulmatch@YOUR_SERVER_IP

# Should login without password
```

### 1.4 Disable Password Authentication

**On Server (ONLY after SSH key works):**

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

**Find and modify these lines:**

```bash
# Change these values:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM no

# Add at the end:
AllowUsers soulmatch
```

**Save and apply:**

```bash
# Test config first
sudo sshd -t

# Restart SSH service
sudo systemctl restart ssh
```

⚠️ **WARNING:** Keep your current SSH session open! Test new connection in another terminal before closing.

---

## 2. Firewall Configuration

### 2.1 Install and Configure UFW

```bash
# Install UFW (if not installed)
sudo apt install ufw -y

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (CRITICAL - do first!)
sudo ufw allow OpenSSH

# Or if you changed SSH port:
sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
# Type 'y' to confirm

# Check status
sudo ufw status verbose
```

### 2.2 Advanced Firewall Rules

```bash
# Limit SSH connections (prevent brute force)
sudo ufw limit OpenSSH

# Allow specific IP only (if you have static IP)
sudo ufw allow from YOUR_HOME_IP to any port 22

# Block specific IP
sudo ufw deny from MALICIOUS_IP

# Delete rule
sudo ufw status numbered
sudo ufw delete NUMBER
```

---

## 3. Fail2ban - Intrusion Prevention

### 3.1 Install Fail2ban

```bash
# Install
sudo apt install fail2ban -y

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 3.2 Configure Fail2ban

```bash
# Create local config
sudo nano /etc/fail2ban/jail.local
```

**Add this configuration:**

```ini
[DEFAULT]
# Ban time: 1 hour
bantime = 3600
# Find time: 10 minutes
findtime = 600
# Max retries before ban
maxretry = 5
# Email notifications (optional)
destemail = your-email@example.com
sendername = Fail2ban-SoulMatch
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/soulmatch-error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/soulmatch-access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/soulmatch-access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/soulmatch-access.log
maxretry = 2
```

**Save and restart:**

```bash
# Restart Fail2ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status

# Check SSH jail status
sudo fail2ban-client status sshd
```

### 3.3 Fail2ban Commands

```bash
# Check banned IPs
sudo fail2ban-client status sshd

# Unban IP
sudo fail2ban-client set sshd unbanip IP_ADDRESS

# View logs
sudo tail -f /var/log/fail2ban.log
```

---

## 4. Automatic Security Updates

### 4.1 Enable Unattended Upgrades

```bash
# Install
sudo apt install unattended-upgrades apt-listchanges -y

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades
# Select 'Yes'
```

### 4.2 Configure Update Settings

```bash
# Edit config
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

**Uncomment/modify these lines:**

```bash
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
Unattended-Upgrade::Mail "your-email@example.com";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
```

**Save and verify:**

```bash
# Test
sudo unattended-upgrades --dry-run --debug

# Check timer
sudo systemctl status unattended-upgrades
```

---

## 5. Additional Security Measures

### 5.1 Configure Nginx Security Headers

Already configured in main deployment guide, but verify:

```bash
sudo nano /etc/nginx/sites-available/soulmatch
```

**Ensure these headers exist:**

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:;" always;

# Hide Nginx version
server_tokens off;
```

### 5.2 Install Security Tools

```bash
# Install security scanner
sudo apt install lynis -y

# Run security audit
sudo lynis audit system

# Review recommendations
```

### 5.3 Setup Log Monitoring

```bash
# Install logwatch
sudo apt install logwatch -y

# Configure
sudo nano /etc/logwatch/conf/logwatch.conf
```

**Set:**

```bash
Output = mail
Format = html
MailTo = your-email@example.com
Detail = High
Range = yesterday
Service = All
```

### 5.4 Disable Unused Services

```bash
# List all services
sudo systemctl list-unit-files --type=service --state=enabled

# Disable unused services (examples)
sudo systemctl disable bluetooth.service
sudo systemctl disable cups.service
```

---

## 6. Environment Variables Security

### 6.1 Secure .env.local File

```bash
# Set restrictive permissions
cd /var/www/soulmatch
chmod 600 .env.local
chown soulmatch:soulmatch .env.local

# Verify
ls -la .env.local
# Should show: -rw------- 1 soulmatch soulmatch
```

### 6.2 Backup Environment Variables

```bash
# Create encrypted backup
cd ~
tar -czf env-backup.tar.gz /var/www/soulmatch/.env.local

# Encrypt with password
gpg -c env-backup.tar.gz
# Enter strong password

# Download to local machine
# Then delete from server
rm env-backup.tar.gz

# Keep only encrypted version
# Download this too, then delete from server
# scp soulmatch@YOUR_IP:~/env-backup.tar.gz.gpg ~/Desktop/
```

---

## 7. Database Security (Supabase)

Your database is hosted on Supabase, but ensure:

### 7.1 Supabase Security Checklist

- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Service role key only on server (not in client code)
- [ ] API keys rotated regularly
- [ ] Database backups enabled
- [ ] Suspicious activity monitoring enabled

### 7.2 Rotate Supabase Keys (If Compromised)

1. Go to Supabase Dashboard
2. Settings → API
3. Click "Generate new anon key"
4. Update server .env.local
5. Restart application: `pm2 restart soulmatch`

---

## 8. Monitoring & Alerting

### 8.1 Setup Server Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop iftop -y

# Create monitoring script
nano ~/monitor.sh
```

**Add:**

```bash
#!/bin/bash
echo "=== CPU Usage ==="
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

echo "=== Memory Usage ==="
free -h | grep Mem | awk '{print $3 "/" $2}'

echo "=== Disk Usage ==="
df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}'

echo "=== Active Connections ==="
ss -s
```

**Make executable:**

```bash
chmod +x ~/monitor.sh
./monitor.sh
```

### 8.2 Setup Email Alerts

```bash
# Install mail utility
sudo apt install mailutils -y

# Configure (use Gmail SMTP or your provider)
sudo nano /etc/ssmtp/ssmtp.conf
```

**Add:**

```bash
root=your-email@example.com
mailhub=smtp.gmail.com:587
AuthUser=your-email@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES
```

---

## 9. Backup Strategy

### 9.1 Application Code Backup

```bash
# Already in GitHub - ensure latest code is pushed
cd /var/www/soulmatch
git status
git push origin main
```

### 9.2 Server Configuration Backup

```bash
# Create backup script
nano ~/backup-config.sh
```

**Add:**

```bash
#!/bin/bash
BACKUP_DIR=~/backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup Nginx config
sudo cp /etc/nginx/sites-available/soulmatch $BACKUP_DIR/
sudo cp /etc/nginx/nginx.conf $BACKUP_DIR/

# Backup environment
cp /var/www/soulmatch/.env.local $BACKUP_DIR/

# Backup PM2 config
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/

# Create archive
cd ~/backups
tar -czf config-backup-$(date +%Y%m%d).tar.gz $(date +%Y%m%d)

echo "Backup completed: ~/backups/config-backup-$(date +%Y%m%d).tar.gz"
```

**Make executable and run:**

```bash
chmod +x ~/backup-config.sh
./backup-config.sh

# Download backup to local machine
scp soulmatch@YOUR_IP:~/backups/config-backup-*.tar.gz ~/Desktop/
```

---

## 10. Incident Response Plan

### 10.1 If Server is Compromised

**Immediate Actions:**

1. **Disconnect from internet:**
   ```bash
   sudo ufw deny outgoing
   sudo ufw deny incoming
   ```

2. **Check for backdoors:**
   ```bash
   sudo find / -name "*.php" -mtime -7
   sudo ps aux | grep -i "suspicious"
   ```

3. **Review logs:**
   ```bash
   sudo tail -100 /var/log/auth.log
   sudo tail -100 /var/log/nginx/soulmatch-access.log
   sudo fail2ban-client status
   ```

4. **Rotate credentials:**
   - Change server password
   - Rotate Supabase keys
   - Rotate Cloudinary keys
   - Change GitHub tokens

5. **Restore from backup or rebuild server**

---

## Security Audit Checklist

Run this monthly:

```bash
# Update all packages
sudo apt update && sudo apt upgrade -y

# Run security audit
sudo lynis audit system

# Check fail2ban
sudo fail2ban-client status

# Review recent logins
last -a | head -20

# Check for rootkits
sudo apt install rkhunter -y
sudo rkhunter --check

# Check open ports
sudo ss -tulpn

# Review large files
sudo find /var -type f -size +100M -exec ls -lh {} \;

# Check for SUID files
sudo find / -perm /4000 -type f -exec ls -ld {} \;
```

---

## Quick Security Commands

```bash
# Check who's logged in
who

# Check login history
last -a

# Check failed login attempts
sudo grep "Failed password" /var/log/auth.log

# Check sudo usage
sudo grep sudo /var/log/auth.log

# Check cron jobs
crontab -l
sudo cat /etc/crontab

# Check listening ports
sudo netstat -tulpn

# Check active connections
sudo ss -s
```

---

## Security Monitoring Tools (Optional)

For advanced monitoring:

```bash
# Install monitoring dashboard
# AIDE - Intrusion Detection
sudo apt install aide -y
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# AppArmor - Security Profiles
sudo apt install apparmor apparmor-utils -y
sudo aa-status

# Auditd - System Auditing
sudo apt install auditd -y
sudo systemctl start auditd
sudo systemctl enable auditd
```

---

## Summary

✅ **Essential Security (Must Do):**
1. SSH key authentication + disable password auth
2. UFW firewall enabled
3. Fail2ban configured
4. Auto security updates
5. SSL certificate installed
6. Non-root user only
7. Strong passwords

✅ **Recommended Security:**
8. Log monitoring
9. Regular backups
10. Security headers
11. Monthly audits

✅ **Advanced Security (Optional):**
12. Intrusion detection (AIDE)
13. Advanced monitoring tools
14. Email alerts
15. WAF (Web Application Firewall)

---

**Security is an ongoing process.** Review and update these measures regularly!
