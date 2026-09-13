-- Success Stories Test Data
-- Insert sample success stories for testing

-- Note: Run this in Supabase SQL Editor after the main migration

-- Insert sample stories as unpublished test data. Publish manually only in an
-- explicitly approved development/test environment; never use as production testimonials.
INSERT INTO public.success_stories (
  couple_names,
  location,
  story_text,
  is_featured,
  is_published,
  display_order,
  submission_type,
  status,
  marriage_date
) VALUES
  (
    'Priya & Rahul',
    'Mumbai, Maharashtra',
    'Our families connected through MyThirumanam.in and we celebrated our wedding last month. The platform''s verification process and cultural matching helped our families trust the alliance. We are forever grateful for bringing our families together!',
    true,
    false,
    10,
    'admin',
    'approved',
    '2024-03-15'
  ),
  (
    'Anjali & Vikram',
    'Delhi, NCR',
    'After careful consideration, both families found the perfect match. The detailed family information and professional approach made the process smooth. Highly recommended by both families! Our journey from profiles to wedding was seamless.',
    true,
    false,
    9,
    'admin',
    'approved',
    '2024-02-20'
  ),
  (
    'Sneha & Arjun',
    'Bangalore, Karnataka',
    'MyThirumanam.in helped our families discover not just compatibility, but shared values and traditions. We''re now happily married with our parents'' complete blessings and support. The platform exceeded all our expectations!',
    true,
    false,
    8,
    'admin',
    'approved',
    '2024-01-10'
  ),
  (
    'Meera & Karthik',
    'Chennai, Tamil Nadu',
    'Finding a compatible partner through MyThirumanam.in was a blessing for both our families. The verification process gave us confidence, and the detailed profiles helped us make an informed decision. We couldn''t be happier!',
    true,
    false,
    7,
    'admin',
    'approved',
    '2023-12-05'
  ),
  (
    'Riya & Amit',
    'Pune, Maharashtra',
    'Our success story began with a simple profile match on MyThirumanam.in. The platform''s family-centric approach and cultural values matching made it easy for our parents to trust the process. We celebrated our wedding with both families'' joy!',
    true,
    false,
    6,
    'admin',
    'approved',
    '2023-11-22'
  ),
  (
    'Divya & Rajesh',
    'Hyderabad, Telangana',
    'We are grateful to MyThirumanam.in for helping us find each other. The detailed family background information and professional profiles gave our families the confidence to move forward. Our alliance is a testament to the platform''s effectiveness!',
    true,
    false,
    5,
    'admin',
    'approved',
    '2023-10-18'
  );

-- Insert some unpublished/draft stories
INSERT INTO public.success_stories (
  couple_names,
  location,
  story_text,
  is_featured,
  is_published,
  display_order,
  submission_type,
  status
) VALUES
  (
    'Kavya & Sanjay',
    'Kochi, Kerala',
    'Our families met through MyThirumanam.in and connected immediately. The platform made it easy to share our family values and traditions. Looking forward to our wedding next month!',
    false,
    false,
    0,
    'admin',
    'approved'
  ),
  (
    'Neha & Varun',
    'Ahmedabad, Gujarat',
    'Draft story - MyThirumanam.in helped us find the perfect match for our family. The verification process was thorough and gave us peace of mind. Wedding scheduled for next year!',
    false,
    false,
    0,
    'admin',
    'approved'
  );

-- Insert a pending user submission for testing approval workflow
INSERT INTO public.success_stories (
  couple_names,
  location,
  story_text,
  is_featured,
  is_published,
  display_order,
  submission_type,
  status
) VALUES
  (
    'Pooja & Rohit',
    'Jaipur, Rajasthan',
    'We just got married last week and wanted to share our success story! MyThirumanam.in helped our families find each other, and the journey was wonderful. Thank you for this amazing platform that values family traditions!',
    false,
    false,
    0,
    'user_submitted',
    'pending'
  );

-- Verification query
SELECT
  couple_names,
  location,
  is_featured,
  is_published,
  display_order,
  submission_type,
  status,
  created_at
FROM public.success_stories
ORDER BY display_order DESC, created_at DESC;

-- Count by status
SELECT
  status,
  submission_type,
  is_published,
  is_featured,
  COUNT(*) as count
FROM public.success_stories
GROUP BY status, submission_type, is_published, is_featured
ORDER BY count DESC;
