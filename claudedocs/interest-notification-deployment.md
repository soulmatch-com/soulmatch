# Interest & Notification Module - Deployment Guide

## Implementation Status: ✅ COMPLETE

All code has been successfully implemented. Follow this guide to deploy the feature.

---

## Step 1: Run Database Migrations

### 1.1 Execute Interests Table Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste contents from: `database/migrations/create_interests_table.sql`
3. Click **Run** to execute
4. Verify success: Check **Table Editor** → `interests` table exists

### 1.2 Execute Notifications Table Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste contents from: `database/migrations/create_notifications_table.sql`
3. Click **Run** to execute
4. Verify success: Check **Table Editor** → `notifications` table exists

### 1.3 Verify Database Setup

Run this verification query in SQL Editor:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('interests', 'notifications');

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('interest_notification_trigger', 'interest_status_notification_trigger');

-- Check RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('interests', 'notifications');
```

Expected results:
- ✅ 2 tables: `interests`, `notifications`
- ✅ 2 triggers: `interest_notification_trigger`, `interest_status_notification_trigger`
- ✅ 6 RLS policies (3 for interests, 3 for notifications)

---

## Step 2: Build & Test Locally

### 2.1 Build the Application

```bash
cd /var/www/html/project/soulmatch-web
npm run build
```

Expected output: Build completes without TypeScript errors

### 2.2 Start Development Server

```bash
npm run dev
```

Navigate to: `http://localhost:3000`

### 2.3 Manual Testing Checklist

**Test 1: Send Interest Flow**
- [ ] Login to the application
- [ ] Navigate to `/search`
- [ ] Click "Send Interest" button on any profile card
- [ ] Dialog opens with message textarea
- [ ] Enter optional message (optional)
- [ ] Click "Send Interest"
- [ ] Toast notification: "Interest sent successfully!"
- [ ] Check Supabase → `interests` table → New row created
- [ ] Check Supabase → `notifications` table → Notification created for receiver

**Test 2: Notification Bell**
- [ ] Dashboard header shows bell icon
- [ ] Unread count badge appears (red badge with count)
- [ ] Click bell icon
- [ ] Dropdown shows list of notifications
- [ ] Click notification → Marks as read
- [ ] Unread count decreases
- [ ] Click "Mark all as read" → All notifications marked as read

**Test 3: Interests Page**
- [ ] Navigate to `/interests`
- [ ] "Received" tab shows interests received
- [ ] "Sent" tab shows interests sent
- [ ] Click "Accept" on received interest → Status updates to "accepted"
- [ ] Sender receives notification about acceptance
- [ ] Click "Decline" on received interest → Status updates to "declined"

**Test 4: Edge Cases**
- [ ] Cannot send interest to yourself (error message)
- [ ] Cannot send duplicate interest (error message: "Interest already sent")
- [ ] RLS prevents viewing other users' interests
- [ ] RLS prevents viewing other users' notifications

---

## Step 3: Deploy to Production

### 3.1 Commit Changes

```bash
git add .
git commit -m "feat: implement interest and notification system

- Add interests and notifications database tables with RLS
- Create API routes for sending/managing interests
- Create notification bell component with real-time updates
- Add SendInterestButton to profile cards
- Create dedicated interests management page
- Add database triggers for automatic notifications

Implements profile interest workflow where users can:
- Send interest to profiles with optional message
- Receive notifications when interest is received
- Accept or decline interests
- View sent and received interests in dedicated page"

git push origin main
```

### 3.2 Vercel Deployment

If using Vercel (auto-deploys on push to main):
1. Push triggers automatic deployment
2. Wait for build to complete
3. Verify deployment at your production URL

If manual deployment needed:
```bash
npm run build
# Deploy build output to your hosting provider
```

### 3.3 Post-Deployment Verification

**Production Checklist**:
- [ ] Database migrations applied to production Supabase instance
- [ ] Application builds successfully
- [ ] No console errors on homepage
- [ ] Send interest flow works end-to-end
- [ ] Notifications appear in real-time
- [ ] Interests page loads correctly
- [ ] RLS policies enforce security

---

## Step 4: Monitoring & Maintenance

### 4.1 Monitor Database Performance

Check these metrics in Supabase Dashboard:

**Database → Performance**:
- Query execution times for `interests` and `notifications` tables
- Index usage on frequently queried columns

**Database → Logs**:
- Any RLS policy errors
- Trigger execution failures

### 4.2 API Endpoint Monitoring

Monitor these endpoints for errors:
- `POST /api/interests/send`
- `GET /api/interests`
- `PATCH /api/interests/[id]`
- `GET /api/notifications`
- `PATCH /api/notifications/[id]/read`
- `POST /api/notifications/mark-all-read`

### 4.3 User Feedback

Collect feedback on:
- Interest sending UX
- Notification delivery timing (30-second polling may need adjustment)
- Interests page usability

---

## Troubleshooting

### Issue: "Interest already sent" error when it shouldn't exist

**Solution**:
```sql
-- Check for existing interest
SELECT * FROM interests
WHERE sender_profile_id = 'YOUR_PROFILE_ID'
  AND receiver_profile_id = 'TARGET_PROFILE_ID';

-- If duplicate found incorrectly, delete it
DELETE FROM interests WHERE id = 'INTEREST_ID';
```

### Issue: Notifications not appearing

**Checklist**:
- [ ] Trigger functions created successfully
- [ ] User has permission to read from notifications table
- [ ] RLS policies allow user to see their notifications
- [ ] Check browser console for API errors

**Debug query**:
```sql
-- Check notifications for user
SELECT * FROM notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

### Issue: RLS preventing legitimate access

**Check policies**:
```sql
-- View all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('interests', 'notifications');
```

### Issue: Build errors

**Common fixes**:
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check TypeScript errors: `npx tsc --noEmit`

---

## Future Enhancements

### Phase 1: Real-time Notifications (Optional)

**Supabase Realtime Integration**:
```typescript
// Replace polling with real-time subscriptions
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // Update notifications state
    setNotifications(prev => [payload.new, ...prev])
    setUnreadCount(prev => prev + 1)
  })
  .subscribe()
```

### Phase 2: Email Notifications (Optional)

**Integration Points**:
- Send email when interest received (daily digest)
- Send email when interest accepted/declined
- User preferences for email notifications

**Implementation**:
- Use Supabase Edge Functions or Resend/SendGrid
- Add email preferences to user settings

### Phase 3: Push Notifications (Optional)

**Web Push API Integration**:
- Request notification permissions
- Subscribe to push service
- Send push notifications for critical events

---

## File Summary

**Created Files** (18 total):

**Database Migrations** (2):
- `database/migrations/create_interests_table.sql`
- `database/migrations/create_notifications_table.sql`

**Type Definitions** (1):
- `src/types/database.types.ts` (updated)

**API Routes** (6):
- `src/app/api/interests/send/route.ts`
- `src/app/api/interests/route.ts`
- `src/app/api/interests/[id]/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/[id]/read/route.ts`
- `src/app/api/notifications/mark-all-read/route.ts`

**Components** (3):
- `src/components/interests/SendInterestButton.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/dashboard/DashboardHeader.tsx`

**Pages** (1):
- `src/app/(dashboard)/interests/page.tsx`

**Layouts** (1):
- `src/app/(dashboard)/layout.tsx` (updated)

**Search Page** (1):
- `src/app/(dashboard)/search/page.tsx` (updated)

---

## Support & Resources

**Documentation**:
- Workflow: `claudedocs/interest-notification-workflow.md`
- Deployment: `claudedocs/interest-notification-deployment.md` (this file)

**Supabase Resources**:
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- Triggers: https://supabase.com/docs/guides/database/postgres/triggers
- Realtime: https://supabase.com/docs/guides/realtime

**Next.js Resources**:
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components

---

## Deployment Completion Checklist

- [ ] Database migrations executed successfully
- [ ] Application builds without errors
- [ ] All manual tests passed
- [ ] Code committed and pushed to repository
- [ ] Production deployment successful
- [ ] Post-deployment verification completed
- [ ] Monitoring configured
- [ ] Team notified of new feature

**Status**: Ready for deployment 🚀
