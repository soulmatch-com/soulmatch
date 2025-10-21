# Pre-Deployment Checklist

Use this checklist before deploying to ensure everything is ready.

## Code Quality

- [x] Production build succeeds (`npm run build`)
- [x] No critical ESLint errors
- [x] TypeScript compilation successful
- [ ] All features tested locally
- [ ] No console.errors in production code
- [ ] All API routes working

## Configuration

- [x] `next.config.ts` optimized
- [x] `vercel.json` created
- [x] `.env.example` updated
- [ ] `.env.local` has all required variables
- [x] `.gitignore` configured (doesn't commit .env.local)
- [x] TanStack Query provider added

## Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` set
- [ ] `CLOUDINARY_API_KEY` set
- [ ] `CLOUDINARY_API_SECRET` set
- [ ] `NEXT_PUBLIC_APP_URL` ready to update

## Supabase Setup

- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] Profile completion function deployed
- [ ] Email templates configured
- [ ] Redirect URLs ready to update post-deployment

## Cloudinary Setup

- [ ] Account created
- [ ] API credentials obtained
- [ ] `soulmatch/profiles` folder exists (or will auto-create)
- [ ] Domain restrictions configured (optional)

## Git Repository

- [ ] All changes committed
- [ ] Pushed to main branch
- [ ] Repository is public or Vercel has access
- [ ] No sensitive data in commit history

## Deployment Platform (Vercel)

- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] Ready to import project
- [ ] Know where to add environment variables

## Post-Deployment Tasks

- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel
- [ ] Update Supabase redirect URLs
- [ ] Update Supabase site URL
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test profile creation
- [ ] Test image upload
- [ ] Test search functionality

## Monitoring Setup

- [ ] Vercel usage alerts configured
- [ ] Supabase usage monitoring enabled
- [ ] Cloudinary usage tracking enabled
- [ ] Error tracking setup (optional)

## Documentation

- [x] `DEPLOYMENT.md` created
- [x] `DEPLOYMENT_READY.md` created
- [x] Cost optimization guide created
- [x] README updated (if needed)

## Cost Management

- [x] Understand free tier limits
- [x] Know when to upgrade
- [x] Cost optimizations implemented
- [x] Monitoring strategy in place

---

## Quick Start: Deploy Now

If all boxes are checked above:

```bash
# 1. Commit and push
git add .
git commit -m "Ready for production deployment"
git push origin main

# 2. Go to Vercel
# - Visit vercel.com
# - Click "New Project"
# - Import your repository
# - Add environment variables
# - Deploy!

# 3. Update Supabase
# - Add your Vercel URL to redirect URLs
# - Update site URL

# 4. Test everything
# - Signup/Login
# - Profile creation
# - Image uploads
# - Search
```

---

## Estimated Deployment Time

- Git push: 1 minute
- Vercel import: 2 minutes
- Environment variables setup: 3 minutes
- First deployment: 2-3 minutes
- Supabase configuration: 2 minutes
- Testing: 5 minutes

**Total:** ~15 minutes to full production

---

## Need Help?

- Review: `DEPLOYMENT.md` for detailed steps
- Check: `DEPLOYMENT_READY.md` for what's been done
- Reference: `src/lib/cost-optimization.md` for optimization details
- Visit: Vercel docs at vercel.com/docs
- Visit: Supabase docs at supabase.com/docs

---

**Ready to deploy?** All optimizations are in place. You're set for $0/month hosting! 🚀
