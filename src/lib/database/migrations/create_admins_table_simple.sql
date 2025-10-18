-- Simple admins table creation (without strict RLS for initial setup)
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- Enable RLS but with permissive policies for now
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access"
  ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon to read (for login verification)
CREATE POLICY "Allow anon to read for login"
  ON admins
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to insert (for initial setup only - remove after first admin created)
CREATE POLICY "Allow initial admin creation"
  ON admins
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update last_login_at
CREATE POLICY "Allow anon to update last_login"
  ON admins
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
