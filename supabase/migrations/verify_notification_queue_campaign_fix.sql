-- Read-only verifier for fix_notification_queue_campaign_ambiguity.sql.
SELECT p.oid::regprocedure AS function_signature,
       pg_get_function_result(p.oid) AS result_contract,
       p.prosecdef AS security_definer,
       p.proconfig AS function_config
FROM pg_proc AS p
WHERE p.oid = 'public.queue_notification_campaign(uuid,uuid)'::regprocedure;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.notification_jobs'::regclass
  AND conname = 'notification_jobs_campaign_subscriber_channel_unique';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'notification_jobs'
  AND indexname IN ('notification_jobs_campaign_subscriber_channel_unique', 'notification_jobs_pending_retry_idx')
ORDER BY indexname;

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'queue_notification_campaign'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;
