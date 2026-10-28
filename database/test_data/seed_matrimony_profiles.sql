-- Matrimony profile test data
--
-- Use only in a local, staging, or other non-production Supabase project.
-- This script creates matching auth.users rows because profiles.user_id has a
-- foreign-key constraint to auth.users(id). It is safe to run more than once.

DO $$
DECLARE
  -- Local Supabase projects commonly have no auth.instances row, and
  -- auth.users does not enforce an instance foreign key. This is the
  -- conventional local instance UUID used by Supabase seed data.
  auth_instance_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES
    ('10000000-0000-4000-8000-000000000001', auth_instance_id, 'authenticated', 'authenticated', 'demo.arjun@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Arjun Kumar"}', now() - interval '12 days', now()),
    ('10000000-0000-4000-8000-000000000002', auth_instance_id, 'authenticated', 'authenticated', 'demo.meera@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Meera Iyer"}', now() - interval '10 days', now()),
    ('10000000-0000-4000-8000-000000000003', auth_instance_id, 'authenticated', 'authenticated', 'demo.karthik@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Karthik Raman"}', now() - interval '8 days', now()),
    ('10000000-0000-4000-8000-000000000004', auth_instance_id, 'authenticated', 'authenticated', 'demo.divya@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Divya Nair"}', now() - interval '6 days', now()),
    ('10000000-0000-4000-8000-000000000005', auth_instance_id, 'authenticated', 'authenticated', 'demo.vignesh@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Vignesh Balaji"}', now() - interval '4 days', now()),
    ('10000000-0000-4000-8000-000000000006', auth_instance_id, 'authenticated', 'authenticated', 'demo.priya@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Priya Suresh"}', now() - interval '2 days', now())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = EXCLUDED.updated_at;
END $$;

INSERT INTO public.profiles (
  user_id, first_name, last_name, date_of_birth, gender, marital_status,
  religion, caste, sub_caste, mother_tongue, height_cm, complexion,
  city, state, country, about_me, hobbies, profile_status, is_verified,
  created_at, updated_at
) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Arjun', 'Kumar', '1994-06-18', 'male', 'never_married', 'Hindu', 'Iyer', 'Vadama', 'Tamil', 178, 'wheatish', 'Chennai', 'Tamil Nadu', 'India', 'Product designer who enjoys Carnatic music, weekend cycling, and time with family.', ARRAY['Cycling', 'Carnatic music', 'Travel'], 'active', true, now() - interval '12 days', now()),
  ('10000000-0000-4000-8000-000000000002', 'Meera', 'Iyer', '1996-01-29', 'female', 'never_married', 'Hindu', 'Iyer', 'Brahacharanam', 'Tamil', 162, 'fair', 'Coimbatore', 'Tamil Nadu', 'India', 'Software engineer, reader, and home baker looking for a kind, family-oriented partner.', ARRAY['Reading', 'Baking', 'Yoga'], 'active', true, now() - interval '10 days', now()),
  ('10000000-0000-4000-8000-000000000003', 'Karthik', 'Raman', '1991-09-12', 'male', 'never_married', 'Hindu', 'Brahmin', 'Vathima', 'Tamil', 174, 'wheatish', 'Bengaluru', 'Karnataka', 'India', 'Finance professional who values humour, meaningful conversations, and traditions.', ARRAY['Badminton', 'Films', 'Cooking'], 'pending', false, now() - interval '8 days', now()),
  ('10000000-0000-4000-8000-000000000004', 'Divya', 'Nair', '1995-03-07', 'female', 'never_married', 'Hindu', 'Nair', NULL, 'Malayalam', 160, 'wheatish', 'Kochi', 'Kerala', 'India', 'Architect with a love for art, classical dance, and exploring new places.', ARRAY['Bharatanatyam', 'Sketching', 'Travel'], 'pending', false, now() - interval '6 days', now()),
  ('10000000-0000-4000-8000-000000000005', 'Vignesh', 'Balaji', '1992-11-25', 'male', 'divorced', 'Hindu', 'Mudaliar', NULL, 'Tamil', 176, 'dark', 'Madurai', 'Tamil Nadu', 'India', 'Entrepreneur and avid reader. Seeking a respectful partnership built on trust.', ARRAY['Reading', 'Cricket', 'Volunteering'], 'incomplete', false, now() - interval '4 days', now()),
  ('10000000-0000-4000-8000-000000000006', 'Priya', 'Suresh', '1997-07-03', 'female', 'never_married', 'Hindu', 'Pillai', NULL, 'Tamil', 165, 'very_fair', 'Chennai', 'Tamil Nadu', 'India', 'Teacher who enjoys gardening, family gatherings, and learning new recipes.', ARRAY['Gardening', 'Cooking', 'Music'], 'suspended', false, now() - interval '2 days', now())
ON CONFLICT (user_id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    marital_status = EXCLUDED.marital_status,
    religion = EXCLUDED.religion,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    mother_tongue = EXCLUDED.mother_tongue,
    height_cm = EXCLUDED.height_cm,
    complexion = EXCLUDED.complexion,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    about_me = EXCLUDED.about_me,
    hobbies = EXCLUDED.hobbies,
    profile_status = EXCLUDED.profile_status,
    is_verified = EXCLUDED.is_verified,
    updated_at = EXCLUDED.updated_at;

-- Confirm the seed data is visible to the admin profile list.
SELECT first_name, last_name, profile_status, is_verified, city, state
FROM public.profiles
WHERE user_id BETWEEN '10000000-0000-4000-8000-000000000001'::uuid
                  AND '10000000-0000-4000-8000-000000000006'::uuid
ORDER BY created_at;
