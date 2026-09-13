-- Read-only verification for customer-facing enquiry references.
-- Run against the approved Supabase project after applying add_enquiry_reference.sql.

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'celebration_enquiries'
  AND column_name = 'enquiry_reference';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'celebration_enquiries'
  AND indexname = 'celebration_enquiries_enquiry_reference_unique';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'celebration_enquiry_reference_counters'
ORDER BY ordinal_position;

SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.celebration_enquiry_reference_counters'::regclass
ORDER BY conname;

SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.celebration_enquiries'::regclass
  AND NOT tgisinternal;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments, p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'assign_celebration_enquiry_reference';

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'celebration_enquiry_reference_counters'
ORDER BY grantee, privilege_type;

SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'celebration_enquiry_reference_counters';
