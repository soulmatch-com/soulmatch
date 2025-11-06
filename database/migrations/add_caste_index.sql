-- Add Caste Index for Smart Profile Search
-- This migration adds performance indexes for the gender-religion-caste matching feature
-- Run this in Supabase SQL Editor before deploying the search page updates

-- Add caste index for individual caste filtering
CREATE INDEX IF NOT EXISTS idx_profiles_caste ON profiles(caste);

-- Add composite index for optimal performance with combined filters
-- This covers the most common search pattern: gender + religion + caste
CREATE INDEX IF NOT EXISTS idx_profiles_search_filters
ON profiles(gender, religion, caste, profile_status, is_verified)
WHERE profile_status = 'active' AND is_verified = true;

-- Verify indexes were created successfully
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
  AND indexname IN ('idx_profiles_caste', 'idx_profiles_search_filters')
ORDER BY indexname;

-- Test query performance with EXPLAIN ANALYZE
-- Uncomment to test (replace with actual test values):
/*
EXPLAIN ANALYZE
SELECT * FROM profiles
WHERE gender = 'female'
  AND religion = 'Hindu'
  AND caste = 'Brahmin'
  AND profile_status = 'active'
  AND is_verified = true
LIMIT 20;
*/
