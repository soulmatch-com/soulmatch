-- Read-only Phase 1H verifier. Do not execute DDL/DML from this file.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notification_campaigns'
  AND column_name IN ('queued_by', 'recipient_count', 'sent_count', 'failed_count', 'skipped_count');

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('count_notification_campaign_recipients', 'queue_notification_campaign');

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('count_notification_campaign_recipients', 'queue_notification_campaign')
ORDER BY routine_name, grantee, privilege_type;

SELECT pg_get_functiondef('public.count_notification_campaign_recipients(uuid)'::regprocedure);
SELECT pg_get_functiondef('public.queue_notification_campaign(uuid,uuid)'::regprocedure);
