#!/bin/bash

###############################################################################
# SoulMatch Web - Server Monitoring Script
# Displays current server health and application status
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_metric() {
    local label=$1
    local value=$2
    local threshold=$3
    local color=$GREEN

    # Simple threshold check (if value > threshold, show yellow/red)
    if [ ! -z "$threshold" ]; then
        current=$(echo $value | grep -oE '[0-9]+' | head -1)
        if [ $current -gt $threshold ]; then
            color=$RED
        elif [ $current -gt $(($threshold * 80 / 100)) ]; then
            color=$YELLOW
        fi
    fi

    printf "  %-20s ${color}%s${NC}\n" "$label:" "$value"
}

clear
echo ""
print_header "SoulMatch Server Status - $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# System Information
print_header "System Information"
print_metric "Hostname" "$(hostname)"
print_metric "OS" "$(lsb_release -d | cut -f2)"
print_metric "Kernel" "$(uname -r)"
print_metric "Uptime" "$(uptime -p | sed 's/up //')"
echo ""

# CPU Usage
print_header "CPU Usage"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
print_metric "Usage" "${cpu_usage}%" 80
print_metric "Load Average" "$(uptime | awk -F'load average:' '{print $2}' | xargs)"
echo ""

# Memory Usage
print_header "Memory Usage"
mem_total=$(free -h | grep Mem | awk '{print $2}')
mem_used=$(free -h | grep Mem | awk '{print $3}')
mem_percent=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')
print_metric "Used / Total" "$mem_used / $mem_total"
print_metric "Usage" "${mem_percent}%" 80
echo ""

# Disk Usage
print_header "Disk Usage"
disk_usage=$(df -h / | tail -1 | awk '{print $3 " / " $2}')
disk_percent=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
print_metric "Used / Total" "$disk_usage"
print_metric "Usage" "${disk_percent}%" 80
echo ""

# Network
print_header "Network"
if command -v ss &> /dev/null; then
    connections=$(ss -s | grep TCP | head -1)
    print_metric "Connections" "$connections"
fi
print_metric "Public IP" "$(curl -s ifconfig.me 2>/dev/null || echo 'N/A')"
echo ""

# PM2 Application Status
print_header "Application Status (PM2)"
if command -v pm2 &> /dev/null; then
    pm2 status 2>/dev/null || echo "  No PM2 processes running"
else
    echo "  PM2 not installed"
fi
echo ""

# Nginx Status
print_header "Nginx Status"
if systemctl is-active --quiet nginx; then
    print_metric "Status" "${GREEN}Running${NC}"
    print_metric "Active Connections" "$(ss -tn | grep :80 | wc -l) (HTTP) + $(ss -tn | grep :443 | wc -l) (HTTPS)"
else
    print_metric "Status" "${RED}Stopped${NC}"
fi
echo ""

# Fail2ban Status
print_header "Fail2ban Status"
if systemctl is-active --quiet fail2ban; then
    print_metric "Status" "${GREEN}Active${NC}"
    banned=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Total banned" | awk '{print $NF}')
    print_metric "Banned IPs (SSH)" "${banned:-0}"
else
    print_metric "Status" "${YELLOW}Not running${NC}"
fi
echo ""

# Recent Logs
print_header "Recent Application Logs (Last 5 lines)"
if command -v pm2 &> /dev/null; then
    pm2 logs soulmatch --lines 5 --nostream 2>/dev/null || echo "  No logs available"
else
    echo "  PM2 not installed"
fi
echo ""

# Disk I/O
print_header "Disk I/O"
if command -v iostat &> /dev/null; then
    iostat -d -x 1 2 | tail -1 | awk '{printf "  Read: %.1f MB/s  Write: %.1f MB/s\n", $6/1024, $7/1024}'
else
    echo "  iostat not available (install sysstat: sudo apt install sysstat)"
fi
echo ""

# Quick Health Summary
print_header "Health Summary"
warnings=0

# Check CPU
if [ $(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
    echo -e "  ${RED}⚠ High CPU usage${NC}"
    ((warnings++))
fi

# Check Memory
if [ $(echo "$mem_percent > 80" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
    echo -e "  ${RED}⚠ High memory usage${NC}"
    ((warnings++))
fi

# Check Disk
if [ $disk_percent -gt 80 ]; then
    echo -e "  ${RED}⚠ Low disk space${NC}"
    ((warnings++))
fi

# Check PM2
if ! pm2 status 2>/dev/null | grep -q "online"; then
    echo -e "  ${RED}⚠ Application not running${NC}"
    ((warnings++))
fi

if [ $warnings -eq 0 ]; then
    echo -e "  ${GREEN}✓ All systems operational${NC}"
fi
echo ""

# Footer
print_header "Quick Commands"
echo "  View live logs:     pm2 logs soulmatch"
echo "  Restart app:        pm2 restart soulmatch"
echo "  Monitor in detail:  pm2 monit"
echo "  Nginx logs:         sudo tail -f /var/log/nginx/soulmatch-error.log"
echo ""
