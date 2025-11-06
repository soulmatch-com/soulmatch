-- Success Stories Table Migration
-- This table stores family success stories for display on the homepage
-- Stories can be created by admins or submitted by users for approval

-- Create submission_type enum
DO $$ BEGIN
  CREATE TYPE submission_type AS ENUM ('admin', 'user_submitted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create story_status enum
DO $$ BEGIN
  CREATE TYPE story_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create success_stories table
CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Profile Links
  profile1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  profile2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Story Content
  couple_names TEXT NOT NULL,
  location TEXT NOT NULL,
  story_text TEXT NOT NULL CHECK (char_length(story_text) >= 50 AND char_length(story_text) <= 1000),

  -- Media
  couple_photo_url TEXT,
  wedding_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  marriage_date DATE,

  -- Display Controls
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Workflow Management
  submission_type submission_type DEFAULT 'admin',
  status story_status DEFAULT 'approved',

  -- Audit Fields
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT different_profiles CHECK (profile1_id IS NULL OR profile2_id IS NULL OR profile1_id != profile2_id),
  CONSTRAINT valid_couple_names CHECK (char_length(couple_names) >= 5 AND char_length(couple_names) <= 100),
  CONSTRAINT valid_location CHECK (char_length(location) >= 2 AND char_length(location) <= 100),
  CONSTRAINT max_wedding_photos CHECK (array_length(wedding_photos, 1) IS NULL OR array_length(wedding_photos, 1) <= 5)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_success_stories_profile1 ON public.success_stories(profile1_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_profile2 ON public.success_stories(profile2_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_published ON public.success_stories(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON public.success_stories(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_success_stories_display_order ON public.success_stories(display_order DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_success_stories_status ON public.success_stories(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_success_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_success_stories_updated_at ON public.success_stories;
CREATE TRIGGER trigger_success_stories_updated_at
  BEFORE UPDATE ON public.success_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_success_stories_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- Public can read published stories
DROP POLICY IF EXISTS "Public can view published success stories" ON public.success_stories;
CREATE POLICY "Public can view published success stories"
  ON public.success_stories
  FOR SELECT
  USING (is_published = true);

-- Authenticated users can submit their own stories
DROP POLICY IF EXISTS "Authenticated users can submit success stories" ON public.success_stories;
CREATE POLICY "Authenticated users can submit success stories"
  ON public.success_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submission_type = 'user_submitted'
    AND status = 'pending'
    AND submitted_by = auth.uid()
  );

-- Users can view their own submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.success_stories;
CREATE POLICY "Users can view their own submissions"
  ON public.success_stories
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Admins have full access (will be implemented via service role key)
-- Admin access is handled via the admin Supabase client with service role
DROP POLICY IF EXISTS "Service role has full access" ON public.success_stories;
CREATE POLICY "Service role has full access"
  ON public.success_stories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.success_stories TO anon;
GRANT SELECT, INSERT ON public.success_stories TO authenticated;
GRANT ALL ON public.success_stories TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.success_stories IS 'Stores family success stories for display on the homepage';
COMMENT ON COLUMN public.success_stories.profile1_id IS 'First partner profile (optional)';
COMMENT ON COLUMN public.success_stories.profile2_id IS 'Second partner profile (optional)';
COMMENT ON COLUMN public.success_stories.couple_names IS 'Display name for the couple (e.g., "Priya & Rahul")';
COMMENT ON COLUMN public.success_stories.story_text IS 'The testimonial text (50-1000 characters)';
COMMENT ON COLUMN public.success_stories.is_featured IS 'Featured stories appear first on homepage';
COMMENT ON COLUMN public.success_stories.display_order IS 'Manual sort order (higher = earlier display)';
COMMENT ON COLUMN public.success_stories.submission_type IS 'Whether created by admin or submitted by user';
COMMENT ON COLUMN public.success_stories.status IS 'Approval status for user submissions';
