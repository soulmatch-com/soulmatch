-- Read-only verification for Plan V2 enquiry persistence.
-- Run against the approved Supabase project after applying the migration.

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'celebration_enquiries'
  AND column_name IN (
    'expected_guest_count',
    'plan_type',
    'plan_version',
    'special_requirements',
    'ceremony_duration'
  )
ORDER BY column_name;

SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.celebration_enquiries'::regclass
  AND conname IN (
    'celebration_enquiries_expected_guest_count_check',
    'celebration_enquiries_plan_type_check',
    'celebration_enquiries_plan_version_check',
    'celebration_enquiries_special_requirements_check'
    , 'celebration_enquiries_ceremony_duration_check'
  )
ORDER BY conname;

SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result_type,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'create_celebration_enquiry';

SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'create_celebration_enquiry'
ORDER BY grantee, privilege_type;

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'celebration_services',
    'celebration_enquiries',
    'celebration_enquiry_services'
  )
ORDER BY tablename, policyname;
