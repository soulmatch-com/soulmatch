# Local Supabase development

The existing remote Supabase project is **production**. Do not link this repository to it for normal development, and never run `supabase db reset --linked`, `supabase db push`, seeds, or ad-hoc SQL against it without separately approved production work.

## Local stack

This repository contains a local-only `supabase/config.toml`. It has no remote project reference or credentials. With the Supabase CLI and a running Docker-compatible runtime installed, start the isolated stack from the repository root:

```bash
supabase start
supabase status -o env
```

Use the local values printed by `supabase status -o env` in an untracked `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<local API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon or publishable key>
SUPABASE_SERVICE_ROLE_KEY=<local service-role or secret key>
NOTIFICATION_SCHEDULER_ENABLED=false
```

Local Supabase normally exposes its API at `http://127.0.0.1:54321`; always use the actual CLI output rather than copying credentials into a tracked file. Production Vercel variables continue to point at the remote production project and must not be changed for local development.

## Migration discovery

The notification schema is self-contained after a local Supabase stack is running. Apply these notification migrations to **local PostgreSQL only**, in this exact order:

1. `supabase/migrations/add_email_subscribers.sql`
2. `supabase/migrations/add_notification_campaigns.sql`
3. `supabase/migrations/add_notification_jobs.sql`
4. `supabase/migrations/add_notification_worker_functions.sql`
5. `supabase/migrations/add_email_suppressions.sql`
6. `supabase/migrations/add_notification_queue_audit.sql`
7. `supabase/migrations/add_notification_provider_events.sql`
8. `supabase/migrations/fix_notification_queue_campaign_ambiguity.sql`
9. `supabase/migrations/fix_notification_worker_claim_ambiguity.sql`
10. `supabase/migrations/fix_notification_worker_claim_id_ambiguity.sql`

The local rehearsal validated this exact sequence against an isolated loopback Supabase database. Run the matching individual `verify_*.sql` scripts (including the three corrective-migration verifiers) and `supabase/migrations/verify_notification_system.sql` through the **local** SQL client. All verifier scripts are read-only. Use `supabase/tests/notification-local-rehearsal.sql` for a rollback-only fake-data behavior check.

`fix_notification_queue_campaign_ambiguity.sql` replaces the Phase 1H queue RPC with the same external signature and result fields. It resolves an internal PL/pgSQL output-column ambiguity by naming the existing notification-job uniqueness constraint explicitly in `ON CONFLICT`; it does not alter historical migrations or weaken queue idempotency.

`fix_notification_worker_claim_ambiguity.sql` similarly replaces the worker claim RPC without changing its signature. It qualifies the CTE campaign reference explicitly so a function output column cannot conflict with it during job claiming.

`fix_notification_worker_claim_id_ambiguity.sql` completes that explicit qualification for the campaign transition CTE's `id` reference.

The repository also contains pre-existing application schema in `database/schema.sql`, `database/migrations/`, and `src/lib/database/migrations/`. Several legacy SQL files are not timestamped Supabase CLI migrations, so `supabase db reset --local` alone is not a complete clean-application bootstrap. Establish an approved, timestamped baseline for that legacy schema before claiming that the entire application can be recreated from Supabase CLI migrations. Do not infer an order for those unrelated legacy changes or pull production schema/data to fill the gap.

## Local test data

Use only clearly fake local test data. Never clone production customer, subscriber, enquiry, or profile data. Keep notification scheduling disabled and do not configure production Resend credentials in `.env.local`.

## Local prerequisites

Install the Supabase CLI using the approved developer-tooling method and start Docker (or another Docker-compatible runtime) before running `supabase start`. Do not use `supabase link` as part of this local setup.
