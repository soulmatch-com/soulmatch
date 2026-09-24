# Production notification schema inventory

Inspection date: 2026-09-24. Target: production Supabase project `ggwzyfhvddhemzxsghmy` (`ggwzyfhvddhemzxsghmy.supabase.co`).

This was a read-only inspection. No migration, RPC, queue, worker, provider, scheduler, or application-data mutation was performed.

## Inspection method and limit

The configured service-role REST API was used for table-presence checks, expected-column HEAD checks, safe aggregate counts, and anonymous-read probes. The API does not expose `supabase_migrations`, `information_schema`, or `pg_catalog`, and no direct production PostgreSQL catalog connection is configured. Therefore function bodies, function security attributes, constraints, indexes, triggers, RLS internals, grants, migration history, and data-compatibility duplicate counts are **not verified** by this inventory.

## Tables and safe aggregates

| Table | Classification | Safe aggregate state |
| --- | --- | --- |
| `email_subscribers` | PARTIAL — all expected columns observed; catalog constraints/security not verified | 1 row; subscribed/en: 1 |
| `notification_campaigns` | PARTIAL — all expected columns observed; catalog constraints/security not verified | 1 row; draft/en: 1 |
| `notification_jobs` | PARTIAL/OLDER — base worker columns observed; `delivery_status`, `delivery_updated_at`, and `delivered_at` absent | 0 rows |
| `email_suppressions` | PARTIAL — all expected columns observed; catalog constraints/security not verified | 0 rows |
| `notification_provider_events` | MISSING | n/a |

Anonymous REST reads were denied for every existing notification table. This is a positive external-access observation, but it does not substitute for catalog-level RLS, policy, grant, or RPC-execution verification.

## Functions

The REST schema exposes these notification RPC paths: `queue_notification_campaign`, `claim_notification_jobs`, `record_notification_job_outcome`, and `count_notification_campaign_recipients`.

Their signatures, bodies, owner, `SECURITY DEFINER` status, `search_path`, and execute grants are not exposed by REST and were not invoked. Consequently:

- `queue_notification_campaign(uuid, uuid)`: OTHER/UNKNOWN — its final ambiguity fix is not verified.
- `claim_notification_jobs(integer)`: OTHER/UNKNOWN — its final two ambiguity fixes are not verified.
- `record_notification_job_outcome(...)`: PRESENT/UNKNOWN VERSION.
- Provider-event processing and delivery-summary RPCs: NOT REFLECTED because migration 7 effects are absent.

## Migration-effect matrix

| Migration | Structural assessment |
| --- | --- |
| 1. `add_email_subscribers.sql` | PARTIALLY REFLECTED |
| 2. `add_notification_campaigns.sql` | PARTIALLY REFLECTED |
| 3. `add_notification_jobs.sql` | PARTIALLY REFLECTED |
| 4. `add_notification_worker_functions.sql` | PARTIALLY REFLECTED |
| 5. `add_email_suppressions.sql` | PARTIALLY REFLECTED |
| 6. `add_notification_queue_audit.sql` | PARTIALLY REFLECTED |
| 7. `add_notification_provider_events.sql` | NOT REFLECTED |
| 8. `fix_notification_queue_campaign_ambiguity.sql` | UNKNOWN |
| 9. `fix_notification_worker_claim_ambiguity.sql` | UNKNOWN |
| 10. `fix_notification_worker_claim_id_ambiguity.sql` | UNKNOWN |

“Partially reflected” means visible table fields or RPC paths exist. It does not prove historical migration application or final catalog-level correctness.

## Reconciliation plan — do not apply yet

1. Obtain separately approved, read-only PostgreSQL catalog access to this exact production project.
2. Inspect migration metadata, table definitions, constraints, indexes, triggers, policies, grants, and function definitions.
3. Run aggregate-only compatibility checks for normalized subscriber duplicates, campaign duplicates, job duplicates, active-suppression duplicates, and invalid enum-like values.
4. Create one new additive migration, proposed name: `reconcile_notification_production_schema.sql`.
5. The reconciliation migration should add the missing provider-event table and job delivery columns, then replace queue/worker RPCs only after confirming the actual unique-constraint name and current signatures. It must preserve existing subscriber and campaign rows.
6. Apply nothing until that migration and its preflight checks are reviewed and explicitly approved.

Migration 7 should be included in the consolidated reconciliation plan rather than applied blindly: its prerequisites look present through REST, but their catalog-level constraints and security posture are not verified. Corrective migrations 8–10 likewise require catalog confirmation before applying their function replacements.

## Rollout state

Production notification rollout is paused pending reconciliation planning. A local runtime configuration file containing the approved production Supabase API configuration was observed with `NOTIFICATION_SCHEDULER_ENABLED=true`. Deployment environment state was not read or changed, so production scheduler state is not verified; treat this as a hard rollout blocker until the authorized owner confirms the deployed value is disabled. No email or provider configuration action was taken.

## Phase 1K-B.1A catalog and scheduler safety blocker

The available production API credentials support only REST-level schema observations; the REST API rejected access to PostgreSQL catalog and migration-metadata schemas. This workspace has no separately approved direct PostgreSQL catalog connection or SQL-editor access path for the exact production project. It also has no authorized Vercel production-environment inspection capability. Consequently, the catalog-level RLS, policy, grant, trigger, index, constraint, and function-definition checks, along with the actual deployed scheduler value, remain unverified.

Before reconciliation planning continues, obtain both of the following read-only approvals/access paths for the exact production target:

- PostgreSQL catalog access, limited in use to `SELECT`/`SHOW` introspection queries.
- Production deployment-environment inspection sufficient to determine only whether `NOTIFICATION_SCHEDULER_ENABLED` is `true`, `false`, or absent.

If the deployed scheduler value is `true`, an authorized deployment owner must set it to `false` and redeploy if required before any reconciliation. This document does not authorize or perform that change.
