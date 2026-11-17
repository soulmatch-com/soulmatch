-- Migration: Add is_verified column to profiles table
-- Date: 2025-10-08
-- Description: Add verification status tracking for user profiles

-- Add is_verified column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Add verified_at timestamp column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add verified_by column (references admin user who verified)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Create index for performance on verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_at ON profiles(verified_at);

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_verified IS 'Whether the profile has been verified by admin';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when profile was verified';
COMMENT ON COLUMN profiles.verified_by IS 'Admin user ID who verified the profile';

-- Update existing active profiles to be verified (optional - remove if not needed)
-- UPDATE profiles SET is_verified = TRUE WHERE profile_status = 'active';
