-- SoulMatch Database Schema - Phase 1
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  marital_status TEXT NOT NULL CHECK (marital_status IN ('never_married', 'divorced', 'widowed', 'awaiting_divorce')),
  religion TEXT,
  caste TEXT,
  sub_caste TEXT,
  mother_tongue TEXT,
  height_cm INTEGER,
  weight_kg INTEGER,
  complexion TEXT CHECK (complexion IN ('fair', 'wheatish', 'dark', 'very_fair')),
  blood_group TEXT,
  disability TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  profile_photo_url TEXT,
  about_me TEXT,
  hobbies TEXT[],
  profile_status TEXT DEFAULT 'incomplete' CHECK (profile_status IN ('incomplete', 'pending', 'active', 'suspended', 'deleted')),
  profile_completion_percentage INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(city, state, country);
CREATE INDEX IF NOT EXISTS idx_profiles_religion ON profiles(religion);
CREATE INDEX IF NOT EXISTS idx_profiles_marital_status ON profiles(marital_status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table

-- Public profiles are viewable by authenticated users
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (profile_status = 'active' OR user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_row profiles)
RETURNS INTEGER AS $$
DECLARE
  total_fields INTEGER := 15;
  filled_fields INTEGER := 0;
BEGIN
  -- Required fields
  IF profile_row.first_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.last_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.date_of_birth IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.gender IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.marital_status IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.city IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.state IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.profile_photo_url IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Optional but important fields
  IF profile_row.religion IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.caste IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.mother_tongue IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.height_cm IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.about_me IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.hobbies IS NOT NULL AND array_length(profile_row.hobbies, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.complexion IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  RETURN (filled_fields * 100) / total_fields;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update profile completion percentage
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion_percentage := calculate_profile_completion(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_profile_completion_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
