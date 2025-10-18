-- Diagnostic Query for Pending Verification Issue
-- Run this in Supabase SQL Editor to check your data

-- ============================================================================
-- STEP 1: Check if is_verified column exists
-- ============================================================================
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_verified';
-- Expected: 1 row showing is_verified column details
-- If 0 rows: Column doesn't exist - you need to run the migration!

-- ============================================================================
-- STEP 2: Check profile_status values in your database
-- ============================================================================
SELECT profile_status, COUNT(*) as count
FROM profiles
GROUP BY profile_status
ORDER BY count DESC;
-- This shows what statuses actually exist in your database

-- ============================================================================
-- STEP 3: Check is_verified values (if column exists)
-- ============================================================================
-- Uncomment below if is_verified column exists:
-- SELECT
--     profile_status,
--     is_verified,
--     COUNT(*) as count
-- FROM profiles
-- GROUP BY profile_status, is_verified
-- ORDER BY profile_status, is_verified;

-- ============================================================================
-- STEP 4: Find profiles that should be "Pending Verification"
-- ============================================================================
-- If is_verified column EXISTS, run this:
-- SELECT
--     id,
--     first_name,
--     last_name,
--     profile_status,
--     is_verified,
--     created_at
-- FROM profiles
-- WHERE profile_status = 'pending'
--    OR (profile_status = 'active' AND is_verified = false)
-- ORDER BY created_at DESC
-- LIMIT 10;

-- If is_verified column DOES NOT EXIST, run this instead:
SELECT
    id,
    first_name,
    last_name,
    profile_status,
    created_at
FROM profiles
WHERE profile_status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: Check for any errors in profile_status values
-- ============================================================================
SELECT id, first_name, last_name, profile_status
FROM profiles
WHERE profile_status NOT IN ('incomplete', 'pending', 'active', 'suspended', 'deleted')
   OR profile_status IS NULL;
-- Expected: 0 rows
-- If any rows: These have invalid status values that need to be fixed

-- ============================================================================
-- RESULTS INTERPRETATION
-- ============================================================================
--
-- CASE 1: is_verified column doesn't exist
--   → You need to run: ensure_profiles_constraints.sql
--   → After running, pending count will only show status='pending' profiles
--
-- CASE 2: is_verified column exists but all values are NULL
--   → Migration partially ran
--   → Run this fix: UPDATE profiles SET is_verified = false WHERE is_verified IS NULL;
--
-- CASE 3: is_verified column exists with proper values
--   → Check if your pending profiles have status='pending'
--   → Check API logs for error messages
--   → Verify RLS policies allow reading is_verified column
--
-- CASE 4: Invalid profile_status values found
--   → Run data cleanup from migration script
--   → Or manually: UPDATE profiles SET profile_status = 'incomplete' WHERE profile_status NOT IN (...)
--
