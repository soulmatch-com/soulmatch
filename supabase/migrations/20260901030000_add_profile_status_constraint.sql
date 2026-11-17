-- Migration: Ensure profile_status has proper CHECK constraint
-- Date: 2025-10-08
-- Description: Add CHECK constraint to profile_status column to ensure valid values

-- First, check if constraint exists and drop it if needed (to recreate with correct name)
DO $$
BEGIN
    -- Drop existing constraint if it exists with different name
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'profiles'
        AND column_name = 'profile_status'
        AND constraint_name != 'profiles_profile_status_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_profile_status_check;
    END IF;
END $$;

-- Add CHECK constraint for profile_status
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_profile_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_profile_status_check
CHECK (profile_status IN ('incomplete', 'pending', 'active', 'suspended', 'deleted'));

-- Ensure profile_status has a default value
ALTER TABLE profiles
ALTER COLUMN profile_status SET DEFAULT 'incomplete';

-- Ensure profile_status is NOT NULL
ALTER TABLE profiles
ALTER COLUMN profile_status SET NOT NULL;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(profile_status);

-- Add comment for documentation
COMMENT ON COLUMN profiles.profile_status IS 'Current status of the profile: incomplete (not completed), pending (awaiting verification), active (verified and active), suspended (temporarily disabled), deleted (soft deleted)';

-- Show current profile status distribution
SELECT
    profile_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
GROUP BY profile_status
ORDER BY count DESC;
