-- Migration: Ensure all profiles table constraints are properly set
-- Date: 2025-10-08
-- Description: Comprehensive migration to add all missing columns and constraints

-- ============================================================================
-- PART 1: Add is_verified columns
-- ============================================================================

-- Add is_verified column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Add verified_at timestamp column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add verified_by column (references admin user who verified)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- PART 2: Ensure profile_status constraint exists
-- ============================================================================

-- Drop old constraint if exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_profile_status_check;

-- Add CHECK constraint for profile_status
ALTER TABLE profiles
ADD CONSTRAINT profiles_profile_status_check
CHECK (profile_status IN ('incomplete', 'pending', 'active', 'suspended', 'deleted'));

-- Ensure profile_status has proper defaults and NOT NULL
ALTER TABLE profiles
ALTER COLUMN profile_status SET DEFAULT 'incomplete';

ALTER TABLE profiles
ALTER COLUMN profile_status SET NOT NULL;

-- ============================================================================
-- PART 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_at ON profiles(verified_at);

-- ============================================================================
-- PART 4: Add documentation comments
-- ============================================================================

COMMENT ON COLUMN profiles.profile_status IS 'Current status of the profile: incomplete (not completed), pending (awaiting verification), active (verified and active), suspended (temporarily disabled), deleted (soft deleted)';
COMMENT ON COLUMN profiles.is_verified IS 'Whether the profile has been verified by admin';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when profile was verified';
COMMENT ON COLUMN profiles.verified_by IS 'Admin user ID who verified the profile';

-- ============================================================================
-- PART 5: Data validation and cleanup (Optional)
-- ============================================================================

-- Update any NULL profile_status to 'incomplete'
UPDATE profiles
SET profile_status = 'incomplete'
WHERE profile_status IS NULL;

-- Update any invalid profile_status values to 'incomplete'
UPDATE profiles
SET profile_status = 'incomplete'
WHERE profile_status NOT IN ('incomplete', 'pending', 'active', 'suspended', 'deleted');

-- Optional: Update existing active profiles to be verified
-- Uncomment the line below if you want to mark all existing active profiles as verified
-- UPDATE profiles SET is_verified = TRUE WHERE profile_status = 'active';

-- ============================================================================
-- PART 6: Verification Query
-- ============================================================================

-- Show current profile status distribution
SELECT
    profile_status,
    is_verified,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
GROUP BY profile_status, is_verified
ORDER BY profile_status, is_verified;

-- Show profiles needing verification (for admin dashboard)
SELECT
    'Profiles Needing Verification' as category,
    COUNT(*) as count
FROM profiles
WHERE profile_status = 'pending'
   OR (profile_status = 'active' AND is_verified = false);
