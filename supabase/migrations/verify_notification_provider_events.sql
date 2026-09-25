-- Read-only Phase 1J verifier.
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('notification_jobs','notification_provider_events') ORDER BY table_name, ordinal_position;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN ('public.notification_jobs'::regclass,'public.notification_provider_events'::regclass);
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('notification_jobs','notification_provider_events');
SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE nspname='public' AND relname='notification_provider_events';
SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='notification_provider_events' AND grantee IN ('PUBLIC','anon','authenticated');
SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name IN ('process_notification_provider_event','get_notification_campaign_delivery_summary');
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_provider_events' AND column_name='raw_payload';
