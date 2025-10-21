# SoulMatch Web - Deployment Guide

This guide provides step-by-step instructions for deploying SoulMatch Web to various hosting platforms with cost optimization.

## Table of Contents
- [Quick Start: Vercel Deployment (Recommended)](#quick-start-vercel-deployment)
- [Alternative: Netlify Deployment](#alternative-netlify-deployment)
- [Alternative: Self-Hosted VPS](#alternative-self-hosted-vps)
- [Environment Variables](#environment-variables)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Cost Monitoring](#cost-monitoring)

---

## Quick Start: Vercel Deployment

**Cost: FREE (up to 100GB bandwidth/month)**

### Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- All environment variables ready (see .env.example)

### Step 1: Prepare Repository

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Import Project to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Add New" → "Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### Step 3: Configure Environment Variables

In Vercel Dashboard → **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_SUPABASE_URL = <your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <your-anon-key>
SUPABASE_SERVICE_ROLE_KEY = <your-service-role-key>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = <your-cloud-name>
CLOUDINARY_API_KEY = <your-api-key>
CLOUDINARY_API_SECRET = <your-api-secret>
NEXT_PUBLIC_APP_URL = https://your-project.vercel.app
```

**Important:** Set these for **Production**, **Preview**, and **Development** environments.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Your app will be live at `https://your-project.vercel.app`

### Step 5: Update Supabase Redirect URLs

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://your-project.vercel.app/api/auth/callback
   ```
3. Update **Site URL**: `https://your-project.vercel.app`

### Step 6: Test Deployment

1. Visit `https://your-project.vercel.app`
2. Test signup/login flow
3. Test profile creation
4. Test image uploads

---

## Alternative: Netlify Deployment

**Cost: FREE (up to 100GB bandwidth/month)**

### Step 1: Install Netlify CLI (optional)

```bash
npm install -g netlify-cli
```

### Step 2: Deploy via CLI

```bash
# Login to Netlify
netlify login

# Initialize project
netlify init

# Deploy
netlify deploy --prod
```

### Step 3: Or Deploy via Dashboard

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Add new site" → "Import an existing project"**
3. Connect to GitHub
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Add environment variables (same as Vercel)
6. Deploy

---

## Alternative: Self-Hosted VPS

**Cost: ~$4-6/month (Hetzner, DigitalOcean, Vultr)**

### Recommended: Hetzner Cloud (Best Value)

**Server**: CX22 (2 vCPU, 4GB RAM) - €4.15/month

### Step 1: Create Server

1. Sign up at [https://www.hetzner.com](https://www.hetzner.com)
2. Create new server (Ubuntu 22.04 LTS)
3. Note your server IP address

### Step 2: Initial Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install Certbot (for SSL)
apt install certbot python3-certbot-nginx -y
```

### Step 3: Deploy Application

```bash
# Create app directory
mkdir -p /var/www/soulmatch
cd /var/www/soulmatch

# Clone repository
git clone https://github.com/your-username/soulmatch-web.git .

# Install dependencies
npm install

# Create .env.local with your variables
nano .env.local
# Paste your environment variables and save (Ctrl+X, Y, Enter)

# Build application
npm run build

# Start with PM2
pm2 start npm --name "soulmatch" -- start
pm2 startup
pm2 save
```

### Step 4: Configure Nginx

```bash
# Create Nginx config
nano /etc/nginx/sites-available/soulmatch

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/soulmatch /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL (free with Let's Encrypt)
certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 5: Setup Auto-Deployment (Optional)

```bash
# Create deployment script
nano /var/www/soulmatch/deploy.sh
```

```bash
#!/bin/bash
cd /var/www/soulmatch
git pull origin main
npm install
npm run build
pm2 restart soulmatch
```

```bash
chmod +x deploy.sh

# To deploy updates, just run:
./deploy.sh
```

---

## Environment Variables

All platforms require these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1...` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdefghijklmnop` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | `https://soulmatch.com` |

---

## Post-Deployment Configuration

### 1. Update Supabase Authentication URLs

Go to Supabase Dashboard → **Authentication → URL Configuration**:

```
Site URL: https://your-domain.com
Redirect URLs:
  - https://your-domain.com/api/auth/callback
  - http://localhost:3000/api/auth/callback (for local dev)
```

### 2. Update Cloudinary Settings

Go to Cloudinary Dashboard → **Settings → Security**:

- Add your domain to **Allowed fetch domains**
- Enable **Auto-upload mapping** (optional)

### 3. Setup Custom Domain (Optional)

**Vercel:**
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

**VPS:**
1. Point your domain's A record to your server IP
2. Update Nginx config with your domain
3. Run Certbot for SSL

---

## Cost Monitoring

### Free Tier Limits

**Vercel:**
- 100GB bandwidth/month
- 100 hours serverless execution/month
- Unlimited deployments

**Supabase:**
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users

**Cloudinary:**
- 25 credits/month (~25GB storage + transformations)

### How to Monitor Usage

**Vercel:**
- Dashboard → Analytics → Usage

**Supabase:**
- Dashboard → Settings → Usage

**Cloudinary:**
- Dashboard → Reports → Usage

### When to Upgrade

**Upgrade Supabase ($25/month) when:**
- Database > 500MB
- File storage > 1GB
- Users > 50K/month

**Upgrade Vercel ($20/month) when:**
- Bandwidth > 100GB/month
- Need team features
- Need advanced analytics

---

## Optimization Tips

### 1. Enable Cloudinary Auto-Optimization

In your upload API route, use:

```typescript
cloudinary.uploader.upload(file, {
  quality: 'auto:eco',
  fetch_format: 'auto',
  width: 800,
  crop: 'limit'
})
```

### 2. Implement Caching

Use TanStack Query for client-side caching:

```typescript
import { useQuery } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['profiles'],
  queryFn: fetchProfiles,
  staleTime: 1000 * 60 * 5, // 5 minutes
})
```

### 3. Optimize Images

Always use Next.js Image component:

```tsx
import Image from 'next/image'

<Image
  src={photo}
  width={200}
  height={200}
  quality={75}
  loading="lazy"
/>
```

### 4. Database Query Optimization

Only fetch needed fields:

```typescript
const { data } = await supabase
  .from('profiles')
  .select('id, name, photo, age')  // Don't use select('*')
  .limit(20)
```

---

## Troubleshooting

### Build Fails on Vercel

**Issue:** `Module not found` errors

**Solution:**
```bash
# Clear cache and rebuild locally
rm -rf .next node_modules
npm install
npm run build
```

### Authentication Redirect Issues

**Issue:** "Invalid redirect URL" after login

**Solution:**
- Verify redirect URL in Supabase matches exactly: `https://your-domain.com/api/auth/callback`
- Check `NEXT_PUBLIC_APP_URL` environment variable

### Images Not Loading

**Issue:** Images show broken or don't load

**Solution:**
- Verify Cloudinary credentials in environment variables
- Check `next.config.ts` has Cloudinary domain in `remotePatterns`
- Ensure images are public in Cloudinary

---

## Support

For deployment issues:
- Check Vercel logs: Dashboard → Deployments → View Function Logs
- Check Supabase logs: Dashboard → Logs → Database/API
- Review Next.js build output for errors

---

## Summary: Recommended Deployment Path

1. **Start:** Deploy to Vercel Free tier (0-6 months)
2. **Growth:** Stay on free tiers until limits hit
3. **Scale:** Upgrade Supabase to Pro first ($25/month)
4. **Optimize:** Implement caching, image optimization
5. **Scale more:** Consider VPS if traffic consistently high

**Estimated Timeline:**
- Month 1-6: $0/month (all free tiers)
- Month 6-12: $25/month (Supabase Pro only)
- Year 2+: $45-70/month (Supabase Pro + Vercel Pro or VPS)
