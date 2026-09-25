-- Read-only verifier. Apply order: email subscribers, campaigns, then jobs.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('notification_campaigns', 'notification_jobs')
ORDER BY table_name, ordinal_position;

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.notification_campaigns'::regclass, 'public.notification_jobs'::regclass)
ORDER BY conrelid::regclass::text, conname;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'notification_jobs' ORDER BY indexname;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('notification_campaigns', 'notification_jobs');

SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'notification_jobs'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated') ORDER BY grantee, privilege_type;

SELECT routine_name, routine_type FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'queue_notification_campaign';

SELECT tgname AS trigger_name, pg_get_triggerdef(oid) AS definition
FROM pg_trigger WHERE tgrelid = 'public.notification_jobs'::regclass AND NOT tgisinternal ORDER BY tgname;
