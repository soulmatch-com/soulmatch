-- Master read-only verifier. Run only after notification migrations 1-10 on an approved target.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('email_subscribers','notification_campaigns','notification_jobs','email_suppressions','notification_provider_events') ORDER BY c.relname;

SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('email_subscribers','notification_campaigns','notification_jobs','email_suppressions','notification_provider_events')
  AND grantee IN ('PUBLIC','anon','authenticated') ORDER BY table_name, grantee, privilege_type;

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE conrelid IN ('public.email_subscribers'::regclass,'public.notification_campaigns'::regclass,'public.notification_jobs'::regclass,'public.email_suppressions'::regclass,'public.notification_provider_events'::regclass)
ORDER BY conrelid::regclass::text, conname;

SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public'
  AND tablename IN ('email_subscribers','notification_campaigns','notification_jobs','email_suppressions','notification_provider_events') ORDER BY tablename,indexname;

SELECT routine_name, specific_name, security_type FROM information_schema.routines WHERE routine_schema='public'
  AND routine_name IN ('queue_notification_campaign','count_notification_campaign_recipients','claim_notification_jobs','record_notification_job_outcome','process_notification_provider_event','get_notification_campaign_delivery_summary') ORDER BY routine_name,specific_name;

SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_schema='public'
  AND routine_name IN ('queue_notification_campaign','count_notification_campaign_recipients','claim_notification_jobs','record_notification_job_outcome','process_notification_provider_event','get_notification_campaign_delivery_summary')
  AND grantee IN ('PUBLIC','anon','authenticated','service_role') ORDER BY routine_name,grantee,privilege_type;

SELECT pg_get_functiondef('public.queue_notification_campaign(uuid,uuid)'::regprocedure);
SELECT pg_get_functiondef('public.claim_notification_jobs(integer)'::regprocedure);
SELECT pg_get_functiondef('public.record_notification_job_outcome(uuid,text,integer,text,text,timestamp with time zone)'::regprocedure);
SELECT pg_get_functiondef('public.process_notification_provider_event(text,text,text,text,timestamp with time zone,text,text)'::regprocedure);
SELECT pg_get_functiondef('public.get_notification_campaign_delivery_summary(uuid)'::regprocedure);

SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_provider_events' AND column_name='raw_payload';
