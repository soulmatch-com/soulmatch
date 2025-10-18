-- Schema Verification Script for profiles table
-- Run this to verify the profiles table has all required columns

-- Check if profiles table exists and list all columns
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'profiles'
ORDER BY
    ordinal_position;

-- Check indexes on profiles table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'profiles'
ORDER BY
    indexname;

-- Check constraints on profiles table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM
    pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
WHERE
    n.nspname = 'public'
    AND cl.relname = 'profiles'
ORDER BY
    conname;

-- Get sample profile data counts by status
SELECT
    profile_status,
    is_verified,
    COUNT(*) as count
FROM
    profiles
GROUP BY
    profile_status, is_verified
ORDER BY
    profile_status, is_verified;

-- Check for profiles without verification status
SELECT
    COUNT(*) as unverified_active_profiles
FROM
    profiles
WHERE
    profile_status = 'active'
    AND is_verified = FALSE;
