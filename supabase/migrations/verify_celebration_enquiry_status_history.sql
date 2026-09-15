-- Read-only verification for add_celebration_enquiry_status_history.sql.
-- Does not mutate data.

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'celebration_enquiries'
  AND column_name IN ('status', 'status_updated_at', 'status_updated_by', 'legacy_status')
ORDER BY column_name;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.celebration_enquiries'::regclass
  AND conname IN (
    'celebration_enquiries_status_check',
    'celebration_enquiries_status_updated_by_fkey'
  )
ORDER BY conname;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'celebration_enquiry_status_history'
ORDER BY ordinal_position;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.celebration_enquiry_status_history'::regclass
  AND conname IN (
    'celebration_enquiry_status_history_pkey',
    'celebration_enquiry_status_history_enquiry_id_fkey',
    'celebration_enquiry_status_history_changed_by_fkey',
    'celebration_enquiry_status_history_from_status_check',
    'celebration_enquiry_status_history_to_status_check',
    'celebration_enquiry_status_history_remarks_check'
  )
ORDER BY conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('celebration_enquiries', 'celebration_enquiry_status_history')
  AND indexname IN (
    'idx_celebration_enquiries_status',
    'idx_celebration_enquiries_preferred_date',
    'idx_celebration_enquiries_status_preferred_date',
    'idx_celebration_enquiries_status_created_at',
    'idx_celebration_enquiry_status_history_enquiry_changed_at'
  )
ORDER BY tablename, indexname;

SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'celebration_enquiry_status_history'
ORDER BY policyname;

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('celebration_enquiries', 'celebration_enquiry_status_history')
ORDER BY table_name, grantee, privilege_type;

SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE specific_schema = 'public'
  AND routine_name IN ('update_celebration_enquiry_status', 'create_celebration_enquiry')
ORDER BY routine_name;

SELECT p.proname, pg_get_function_arguments(p.oid) AS arguments, pg_get_function_result(p.oid) AS result
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('update_celebration_enquiry_status', 'create_celebration_enquiry')
ORDER BY p.proname;

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('update_celebration_enquiry_status', 'create_celebration_enquiry')
ORDER BY routine_name, grantee, privilege_type;

SELECT pg_get_functiondef('public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT
)'::regprocedure) AS create_celebration_enquiry_definition;
