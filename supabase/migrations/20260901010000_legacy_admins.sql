-- Create admins table for admin authentication
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

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- Enable Row Level Security (RLS)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admins can read admin table
CREATE POLICY "Admins can read admin table"
  ON admins
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only super_admins can insert new admins
CREATE POLICY "Super admins can insert admins"
  ON admins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Policy: Admins can update their own record
CREATE POLICY "Admins can update own record"
  ON admins
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Policy: Only super_admins can delete admins
CREATE POLICY "Super admins can delete admins"
  ON admins
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_admins_updated_at_trigger
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- Comments for documentation
COMMENT ON TABLE admins IS 'Stores admin user credentials and information';
COMMENT ON COLUMN admins.email IS 'Admin email address (unique)';
COMMENT ON COLUMN admins.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN admins.role IS 'Admin role: super_admin, admin, or moderator';
COMMENT ON COLUMN admins.is_active IS 'Whether the admin account is active';
