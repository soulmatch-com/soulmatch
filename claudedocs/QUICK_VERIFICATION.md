# Quick Verification Checklist

Run these checks to verify critical functionality.

## 1. ✅ Admin Database Table

**Check if `admins` table exists:**

```sql
-- Run in Supabase SQL Editor
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'admins'
);
```

**Expected:** `true`

**If false:**
```bash
# Apply the migration
# Copy content from: src/lib/database/migrations/create_admins_table.sql
# Paste into Supabase SQL Editor and run
```

---

## 2. ✅ Admin User Exists

**Check if any admin users exist:**

```sql
-- Run in Supabase SQL Editor
SELECT id, email, name, role, is_active, created_at
FROM admins
LIMIT 5;
```

**Expected:** At least 1 row with a super_admin

**If empty:**
```bash
# Create first admin
npx tsx src/scripts/create-admin.ts

# Or use SQL directly (get hash first)
npx tsx src/scripts/hash-password.ts
# Then insert into database
```

---

## 3. ✅ Database Migrations Applied

**Check all tables exist:**

```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected tables:**
- `admins` ✅
- `interests` ✅
- `notifications` ✅
- `profiles` ✅
- `success_stories` ✅

**If any missing, run migrations from:**
- `database/migrations/`
- `src/lib/database/migrations/`

---

## 4. ✅ Environment Variables

**Check `.env.local` has all required variables:**

```bash
# Run in terminal
node -e "
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'NEXT_PUBLIC_APP_URL'
];
require('dotenv').config({ path: '.env.local' });
required.forEach(key => {
  console.log(key + ':', process.env[key] ? '✅ Set' : '❌ Missing');
});
"
```

**Expected:** All ✅ Set

---

## 5. ✅ Build Succeeds

```bash
npm run build
```

**Expected:** No errors, successful build

**Common errors:**
- TypeScript errors → Fix type issues
- Missing env vars → Add to `.env.local`
- Import errors → Check paths

---

## 6. ✅ Admin Login Works

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:3000/admin/login

# Try to login with admin credentials
```

**Expected:** Successful login, redirect to dashboard

**If fails:**
- Check browser console for errors
- Check server logs
- Verify admin table exists
- Verify admin user exists and is_active = true

---

## 7. ✅ User Registration Works

```bash
# Open browser
open http://localhost:3000/signup

# Create test user
# Check email for verification
```

**Expected:**
- Email sent
- Verification link works
- Redirects to profile creation

---

## 8. ✅ Profile Creation Works

```bash
# After signup, should redirect to /profile/create

# Fill form
# Upload photo
# Submit
```

**Expected:**
- Photo uploads to Cloudinary
- Profile saves to database
- Redirects to dashboard

---

## 9. ✅ Interest System Works

```bash
# Login as user
# Go to /search
# Click "Send Interest" on a profile
```

**Expected:**
- Interest sent
- Notification created for receiver
- Notification bell shows count

---

## 10. ✅ Database RLS Working

**Check RLS is enabled:**

```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'interests', 'notifications', 'success_stories')
ORDER BY tablename;
```

**Expected:** All tables have `rowsecurity = true`

---

## Quick Status Check

Run this single query to get overview:

```sql
-- Run in Supabase SQL Editor
SELECT
  'profiles' as table_name, COUNT(*) as count
FROM profiles
UNION ALL
SELECT 'admins', COUNT(*) FROM admins
UNION ALL
SELECT 'interests', COUNT(*) FROM interests
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'success_stories', COUNT(*) FROM success_stories;
```

**Shows count of records in each table**

---

## Verification Script

**Create this file: `scripts/verify-setup.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔍 Verifying SoulMatch Setup...\n');

  // Check tables exist
  const tables = ['profiles', 'admins', 'interests', 'notifications', 'success_stories'];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: Table missing or error`);
    } else {
      console.log(`✅ ${table}: ${count} records`);
    }
  }

  // Check admin exists
  const { data: admins } = await supabase.from('admins').select('email, role').limit(1);

  if (admins && admins.length > 0) {
    console.log(`\n✅ Admin user exists: ${admins[0].email} (${admins[0].role})`);
  } else {
    console.log('\n⚠️  No admin users found. Create one with: npx tsx src/scripts/create-admin.ts');
  }

  console.log('\n✅ Verification complete!');
}

verify();
```

**Run with:**
```bash
npx tsx scripts/verify-setup.ts
```

---

## Priority Checks

**Do these first:**
1. ✅ Check admins table exists
2. ✅ Create at least one admin user
3. ✅ Test admin login
4. ✅ Build succeeds
5. ✅ Environment variables set

**Then verify:**
6. User registration flow
7. Profile creation
8. Interest system
9. Notifications
10. RLS policies

---

**Next:** See `GAPS_ANALYSIS.md` for comprehensive gap analysis
