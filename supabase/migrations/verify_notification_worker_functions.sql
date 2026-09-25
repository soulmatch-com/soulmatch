-- Read-only verification for notification worker functions.
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_notification_jobs', 'record_notification_job_outcome')
ORDER BY routine_name;

SELECT routines.routine_name, parameters.parameter_name, parameters.data_type, parameters.parameter_mode
FROM information_schema.parameters AS parameters
JOIN information_schema.routines AS routines
  ON routines.specific_schema = parameters.specific_schema
  AND routines.specific_name = parameters.specific_name
WHERE parameters.specific_schema = 'public'
  AND routines.routine_name IN ('claim_notification_jobs', 'record_notification_job_outcome')
ORDER BY routines.routine_name, parameters.ordinal_position;

SELECT grantee, routine_name, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_notification_jobs', 'record_notification_job_outcome')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
ORDER BY routine_name, grantee;
