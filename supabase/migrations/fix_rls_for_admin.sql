-- Fix RLS Policies to Allow Admin Access
-- This allows admin users to view all profiles for the dashboard

-- ============================================================================
-- Option 1: Add Admin Policy (Recommended)
-- ============================================================================

-- Create a policy that allows authenticated users with admin role to see all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is in admins table or has admin role
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
    OR
    -- Or allow viewing their own profile
    user_id = auth.uid()
  );

-- ============================================================================
-- Option 2: Temporarily Disable RLS for Testing (NOT for production)
-- ============================================================================
-- Uncomment ONLY for testing, then re-enable after confirming it works:

-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- After confirming it works, re-enable:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Option 3: Grant service role access (if using service key)
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;

-- ============================================================================
-- Verification: Check current policies
-- ============================================================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';
