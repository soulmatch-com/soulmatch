-- Read-only verifier for fix_notification_worker_claim_id_ambiguity.sql.
SELECT p.oid::regprocedure AS function_signature,
       pg_get_function_result(p.oid) AS result_contract,
       p.prosecdef AS security_definer,
       p.proconfig AS function_config
FROM pg_proc AS p
WHERE p.oid = 'public.claim_notification_jobs(integer)'::regprocedure;

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'claim_notification_jobs'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;
