-- Migration: Add gothram and dosham fields to profiles table
-- Created: 2025-10-18
-- Description: Adds gothram, dosham status, and dosham details fields to support matrimonial profile requirements

-- Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gothram TEXT,
  ADD COLUMN IF NOT EXISTS dosham TEXT CHECK (dosham IN ('yes', 'no', 'dont_know')),
  ADD COLUMN IF NOT EXISTS dosham_details TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN profiles.gothram IS 'Family lineage/gotra information (optional)';
COMMENT ON COLUMN profiles.dosham IS 'Dosham/horoscope status: yes, no, or dont_know (optional)';
COMMENT ON COLUMN profiles.dosham_details IS 'Details about dosham if present (required when dosham is yes)';

-- Create index for dosham field (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_dosham ON profiles(dosham);

-- Note: The application layer handles validation that dosham_details is required when dosham='yes'
