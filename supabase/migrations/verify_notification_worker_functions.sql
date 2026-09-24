-- Read-only verification for notification worker functions.
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_notification_jobs', 'record_notification_job_outcome')
ORDER BY routine_name;

SELECT routine_name, parameter_name, data_type, parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name IN ('claim_notification_jobs', 'record_notification_job_outcome')
ORDER BY routine_name, ordinal_position;

SELECT grantee, routine_name, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_notification_jobs', 'record_notification_job_outcome')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
ORDER BY routine_name, grantee;
