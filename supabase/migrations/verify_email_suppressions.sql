-- Read-only verification for email suppressions and queue eligibility.
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'email_suppressions' ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE conrelid = 'public.email_suppressions'::regclass ORDER BY conname;
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'email_suppressions' ORDER BY indexname;
SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'email_suppressions';
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'email_suppressions' AND grantee IN ('PUBLIC', 'anon', 'authenticated') ORDER BY grantee, privilege_type;
SELECT pg_get_functiondef('public.queue_notification_campaign(uuid,uuid)'::regprocedure) AS queue_function_definition;
