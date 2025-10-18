# Troubleshooting - Pending Verification Not Working

## Problem
You have profiles with `profile_status = 'pending'` and `is_verified = false`, but they're not showing in the admin dashboard.

---

## Step 1: Run Diagnostic Query

1. Open Supabase Dashboard → SQL Editor
2. Open `DIAGNOSTIC_QUERY.sql` in this folder
3. Run each section one by one
4. Note the results

---

## Step 2: Identify the Issue

### Issue A: "is_verified column doesn't exist"

**Symptoms:**
- Step 1 of diagnostic returns 0 rows
- Browser console shows: "column 'is_verified' does not exist"

**Solution:**
```sql
-- Run the full migration in Supabase SQL Editor:
-- Copy and paste contents of ensure_profiles_constraints.sql
```

After running migration:
- Refresh your admin dashboard
- Check browser console logs
- Pending profiles should now appear

---

### Issue B: "is_verified column has NULL values"

**Symptoms:**
- Column exists but values are NULL
- Step 3 shows NULL in is_verified column

**Solution:**
```sql
-- Fix NULL values:
UPDATE profiles
SET is_verified = false
WHERE is_verified IS NULL;

-- Mark existing active profiles as verified (optional):
UPDATE profiles
SET is_verified = true, verified_at = NOW()
WHERE profile_status = 'active';
```

---

### Issue C: "Profile status has wrong value"

**Symptoms:**
- Step 2 shows statuses other than: incomplete, pending, active, suspended, deleted
- Step 5 returns rows with invalid statuses

**Solution:**
```sql
-- Check what invalid values exist:
SELECT DISTINCT profile_status FROM profiles
WHERE profile_status NOT IN ('incomplete', 'pending', 'active', 'suspended', 'deleted');

-- Fix invalid values (adjust as needed):
UPDATE profiles
SET profile_status = 'incomplete'
WHERE profile_status NOT IN ('incomplete', 'pending', 'active', 'suspended', 'deleted')
   OR profile_status IS NULL;
```

---

### Issue D: "Pending profiles exist but not showing in API"

**Symptoms:**
- Diagnostic Step 4 returns rows
- API returns `pendingVerification: 0`
- Browser console shows errors

**Debug Steps:**

1. **Check API Logs:**
   - Open browser DevTools → Console
   - Look for errors from `/api/admin/stats`
   - Check what the API returns

2. **Test the Query Directly:**
```sql
-- Test the exact query the API uses:
SELECT COUNT(*)
FROM profiles
WHERE profile_status = 'pending'
   OR (profile_status = 'active' AND is_verified = false);
```

3. **Check RLS Policies:**
```sql
-- Check if RLS is blocking the query:
SELECT * FROM pg_policies
WHERE tablename = 'profiles';

-- Temporarily disable RLS to test (ONLY FOR DEBUGGING):
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Then try the API again
-- Remember to re-enable after testing:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

### Issue E: "API works but dashboard doesn't show profiles"

**Symptoms:**
- API returns correct data in Network tab
- Dashboard shows 0 or empty

**Debug Steps:**

1. **Check Browser Console:**
```javascript
// Open Console and check for errors
// Look for React errors or fetch errors
```

2. **Verify API Response:**
```javascript
// In Console tab, type:
fetch('/api/admin/stats')
  .then(r => r.json())
  .then(d => console.log(d))
```

Expected output:
```json
{
  "stats": {
    "pendingVerification": 2  // Should be > 0
  },
  "pendingProfiles": [
    {
      "id": "...",
      "first_name": "...",
      "profile_status": "pending",
      "is_verified": false
    }
  ]
}
```

3. **Check React State:**
   - Add temporary console.log in dashboard component
   - Check if `setPendingProfiles` is being called
   - Verify state is updating

---

## Step 3: Common Fixes

### Fix 1: Column Doesn't Exist - Run Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/ensure_profiles_constraints.sql
```

### Fix 2: Data Cleanup
```sql
-- Ensure all profiles have proper is_verified value:
UPDATE profiles
SET is_verified = COALESCE(is_verified, false)
WHERE is_verified IS NULL;

-- Ensure all profiles have valid status:
UPDATE profiles
SET profile_status = 'incomplete'
WHERE profile_status IS NULL
   OR profile_status NOT IN ('incomplete', 'pending', 'active', 'suspended', 'deleted');
```

### Fix 3: Create Test Data
```sql
-- Create test pending profile:
INSERT INTO profiles (
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  marital_status,
  city,
  state,
  profile_status,
  is_verified
) VALUES (
  gen_random_uuid(),
  'Test',
  'Pending',
  '1990-01-01',
  'male',
  'never_married',
  'Mumbai',
  'Maharashtra',
  'pending',
  false
);

-- Verify it appears:
SELECT * FROM profiles WHERE first_name = 'Test' AND last_name = 'Pending';
```

### Fix 4: Check API Logs
```bash
# In your terminal where Next.js is running:
# Look for console.log output from the API

# You should see:
# "is_verified column exists: true"
# "Stats: { totalUsers: X, pendingVerification: Y, ... }"

# If you see errors, they will help identify the issue
```

---

## Step 4: Verify the Fix

After applying fixes:

1. **Refresh Dashboard:**
   - Clear browser cache (Ctrl+Shift+R)
   - Login to admin dashboard
   - Check if pending profiles appear

2. **Check API Response:**
   - Open DevTools → Network tab
   - Refresh page
   - Find `/api/admin/stats` request
   - Verify response shows correct counts

3. **Run Diagnostic Query Again:**
   - Run DIAGNOSTIC_QUERY.sql
   - Verify all checks pass

---

## Step 5: Still Not Working?

### Enable Detailed Logging

Update the API temporarily to add more logs:

1. Check server logs (terminal where `npm run dev` is running)
2. Look for console.log messages from the API
3. Check for Supabase errors

### Common Issues & Solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| `pendingVerification: 0` but profiles exist | Column doesn't exist | Run migration |
| API returns error 500 | Query syntax error | Check server logs |
| Dashboard shows loading forever | API not responding | Check network tab |
| Empty pending list but count > 0 | Query mismatch | Check API query logic |
| All counts show 0 | RLS policies blocking | Check RLS policies |

---

## Quick Test Commands

```sql
-- 1. Check column exists:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_verified';

-- 2. Count pending profiles manually:
SELECT COUNT(*) FROM profiles WHERE profile_status = 'pending';

-- 3. List pending profiles:
SELECT id, first_name, last_name, profile_status, is_verified
FROM profiles
WHERE profile_status = 'pending'
LIMIT 5;

-- 4. Check if any profiles need verification:
SELECT COUNT(*) FROM profiles
WHERE profile_status = 'pending'
   OR (profile_status = 'active' AND COALESCE(is_verified, false) = false);
```

---

## Need More Help?

1. Run DIAGNOSTIC_QUERY.sql and save the output
2. Check browser console for errors
3. Check server logs for API errors
4. Verify migration ran successfully
5. Check Supabase logs in Dashboard → Logs

### What to Share When Asking for Help:
- Output of DIAGNOSTIC_QUERY.sql
- Browser console errors
- Server logs (from terminal)
- API response from Network tab
- Supabase logs

---

## Prevention

To avoid this issue in the future:

1. ✅ Always run migrations in proper order
2. ✅ Verify migration success before deploying code
3. ✅ Test with sample data before production
4. ✅ Check API logs during deployment
5. ✅ Keep database schema in sync with code
