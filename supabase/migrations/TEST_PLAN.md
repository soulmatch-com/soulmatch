# Test Plan - Admin Dashboard Dynamic Data

## Overview
This document provides testing steps to verify the admin dashboard is correctly fetching and displaying dynamic data from the Supabase database.

## Prerequisites
1. Migration `ensure_profiles_constraints.sql` has been run
2. Admin user is created and can login at `/admin/login`
3. Some test profiles exist in the database

---

## Test 1: Database Migration Verification

### Steps:
1. Run the verification query in Supabase SQL Editor:
```sql
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('is_verified', 'verified_at', 'verified_by', 'profile_status')
ORDER BY column_name;
```

### Expected Results:
- `is_verified` - boolean, default false, not null
- `verified_at` - timestamp with time zone, nullable
- `verified_by` - uuid, nullable
- `profile_status` - text, default 'incomplete', not null

### ✅ Pass Criteria:
All columns exist with correct data types and defaults.

---

## Test 2: Profile Status Constraint

### Steps:
1. Try to insert an invalid profile_status in Supabase SQL Editor:
```sql
INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, marital_status, city, state, profile_status)
VALUES (
  gen_random_uuid(),
  'Test',
  'User',
  '1990-01-01',
  'male',
  'never_married',
  'Mumbai',
  'Maharashtra',
  'invalid_status'
);
```

### Expected Results:
- Query should FAIL with error: "violates check constraint"

### ✅ Pass Criteria:
Constraint prevents invalid profile_status values.

---

## Test 3: API Endpoint - Stats

### Steps:
1. Open browser DevTools (F12) → Network tab
2. Login to admin dashboard at `/admin/login`
3. Navigate to `/admin/dashboard`
4. Check the network request to `/api/admin/stats`

### Expected Results:
Response should contain:
```json
{
  "stats": {
    "totalUsers": <number>,
    "activeProfiles": <number>,
    "pendingVerification": <number>,
    "incompleteProfiles": <number>,
    "suspendedProfiles": <number>,
    "recentRegistrations": <number>
  },
  "latestUsers": [
    {
      "user_id": "...",
      "first_name": "...",
      "last_name": "...",
      "created_at": "...",
      "profile_status": "..."
    }
  ],
  "pendingProfiles": [
    {
      "id": "...",
      "user_id": "...",
      "first_name": "...",
      "last_name": "...",
      "profile_status": "...",
      "is_verified": false,
      "created_at": "..."
    }
  ]
}
```

### ✅ Pass Criteria:
- HTTP status 200
- All stats fields present with numeric values
- Arrays returned (may be empty)

---

## Test 4: Dashboard UI - Stats Cards

### Steps:
1. Login to admin dashboard
2. Verify all 4 stats cards are displayed

### Expected Results:
1. **Total Users** - Shows count with "X new in last 30 days"
2. **Active Profiles** - Shows count with "Verified and active"
3. **Pending Verification** - Shows count with "Awaiting verification"
4. **Incomplete Profiles** - Shows count with "Not yet completed"

### ✅ Pass Criteria:
- All 4 cards display numeric values (not static mock data)
- Numbers match database counts

---

## Test 5: Recent User Registrations

### Steps:
1. View "Recent User Registrations" section on dashboard
2. Check if real user data is displayed

### Expected Results:
- Up to 5 recent users listed
- Shows: Full name, status, time ago
- If no users: "No recent registrations"

### ✅ Pass Criteria:
Real data from database, not mock "User 1", "User 2", etc.

---

## Test 6: Profile Verification Queue

### Steps:
1. View "Profile Verification Queue" section
2. Check displayed profiles

### Expected Results:
- Shows profiles with `status = 'pending'` OR `status = 'active' AND is_verified = false`
- Each profile shows: Full name, status, "Pending" badge
- Active unverified profiles show "(Unverified)" label
- "View all X profiles →" button if more than 5

### ✅ Pass Criteria:
- Real pending profiles displayed
- Count matches `pendingVerification` stat
- Shows "No pending verifications" if none exist

---

## Test 7: Pending Verification Logic

### Setup Data:
Create test profiles in Supabase:
```sql
-- Create test user 1: pending status
INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, marital_status, city, state, profile_status, is_verified)
VALUES (gen_random_uuid(), 'John', 'Pending', '1990-01-01', 'male', 'never_married', 'Mumbai', 'Maharashtra', 'pending', false);

-- Create test user 2: active but not verified
INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, marital_status, city, state, profile_status, is_verified)
VALUES (gen_random_uuid(), 'Jane', 'Unverified', '1990-01-01', 'female', 'never_married', 'Delhi', 'Delhi', 'active', false);

-- Create test user 3: active and verified (should NOT appear in pending)
INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender, marital_status, city, state, profile_status, is_verified)
VALUES (gen_random_uuid(), 'Bob', 'Verified', '1990-01-01', 'male', 'never_married', 'Bangalore', 'Karnataka', 'active', true);
```

### Steps:
1. Refresh admin dashboard
2. Check "Pending Verification" count and list

### Expected Results:
- Count shows: 2
- List shows: "John Pending" and "Jane Unverified"
- Does NOT show: "Bob Verified"
- Jane's entry shows "(Unverified)" label

### ✅ Pass Criteria:
Only profiles needing verification are counted and displayed.

---

## Test 8: Active Profiles Count

### Steps:
1. Check "Active Profiles" card value
2. Compare with database query:
```sql
SELECT COUNT(*) FROM profiles
WHERE profile_status = 'active' AND is_verified = true;
```

### Expected Results:
Dashboard count matches database count.

### ✅ Pass Criteria:
Only verified AND active profiles are counted.

---

## Test 9: Loading State

### Steps:
1. Open DevTools → Network tab
2. Set network throttling to "Slow 3G"
3. Refresh dashboard
4. Observe loading state

### Expected Results:
- Shows "Loading..." message while fetching
- Dashboard renders after data loads

### ✅ Pass Criteria:
Smooth loading experience, no errors.

---

## Test 10: Error Handling

### Steps:
1. Temporarily break the API (e.g., wrong Supabase connection)
2. Refresh dashboard
3. Check browser console

### Expected Results:
- Error logged to console
- Dashboard shows empty state gracefully
- No application crash

### ✅ Pass Criteria:
Errors are handled without breaking the UI.

---

## Verification Checklist

After running all tests, verify:

- [ ] Migration ran successfully
- [ ] All columns and constraints exist
- [ ] API returns correct data structure
- [ ] Dashboard displays real data (not mock)
- [ ] Active profiles count = profiles with (status='active' AND is_verified=true)
- [ ] Pending verification count = profiles with (status='pending' OR (status='active' AND is_verified=false))
- [ ] Incomplete profiles count = profiles with (status='incomplete')
- [ ] Recent users list shows actual users
- [ ] Pending profiles list shows correct profiles
- [ ] Loading state works
- [ ] Error handling works

---

## Rollback Plan

If issues are found:

1. Check browser console for errors
2. Check Supabase logs for query errors
3. Verify migration ran completely
4. Run verification script: `verify_profiles_schema.sql`
5. If needed, rollback using instructions in README.md

---

## Support

For issues:
- Check `README.md` for detailed documentation
- Review error messages in browser console
- Check Supabase logs in Dashboard → Logs
- Verify RLS policies allow admin access
