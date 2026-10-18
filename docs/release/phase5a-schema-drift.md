# Phase 5A schema drift report

## Verified local target

The target is an unlinked, loopback Supabase runtime (`127.0.0.1:54321`) configured by `supabase/config.toml` (`project_id = mythirumanam-local`). Credentials were validated by the audit command and are not recorded here.

## Catalogue evidence

| Item | Observed |
|---|---:|
| Public base tables | 31 |
| Public functions | 40 |
| Public indexes | 90 |
| Public RLS policies | 9 |
| `supabase_migrations` schema | absent |
| `supabase_migrations.schema_migrations` | absent |

This distinguishes a verified present schema from an unknown historical execution record. It does **not** establish that historical files ran in a particular order.

## Module comparison matrix

| Module | Actual comparison status | Evidence / discrepancy |
|---|---|---|
| Public celebrations | Equivalent but legacy-dependent | enquiry/service objects are present; their unversioned prerequisite ordering is unknown. |
| CRM | Equivalent but legacy-dependent | `admins`, `leads`, associations and CRM routines are present; no CLI ledger proves provenance. |
| Quotations | Exact-name coverage, definition provenance unknown | lifecycle/activity/delivery objects and functions present; function-body hashes are captured by the audit script. |
| Bookings | Exact-name coverage, definition provenance unknown | booking, snapshots, leads, activities and booking RPCs present. |
| Event planning | Exact-name coverage, definition provenance unknown | tasks/templates/activities and follow-up fixes present locally. |
| Vendors | Exact-name coverage, definition provenance unknown | vendor directory/assignments/activities and actor fix present locally. |
| Payments | Exact-name coverage, definition review required | ledger and activity objects exist; history absence prevents claiming source-text equivalence. |
| Legacy users | Unknown / requires baseline | profiles/auth dependencies live outside the timestamped workflow set. |

## Security and financial review

The audit captures table RLS state/policies, table grants for `anon`, `authenticated`, and `service_role`, function owner/security-definer/configuration, and definition MD5s. It exits nonzero if a required workflow object is absent, a tracked financial function is a `SECURITY DEFINER` function without an explicit `search_path`, or migration metadata is absent.

Financial functions require an approved source-vs-catalogue review before deployment: booking-row locking, idempotency before append, bounds on refunds/reversals, immutable-ledger trigger enforcement, actor validation, receipt linkage, restricted EXECUTE grants, and safe `SECURITY DEFINER` search paths. Name matching alone is explicitly insufficient.

## Blocking discrepancy

`supabase_migrations` is absent. Current object existence is verified, but applied-version history and exact source-definition equivalence are not. This is a **No-Go** for automated production migration or ledger repair until an owner approves a captured baseline and Supabase-supported repair procedure.

## Phase 5A.1 restore diagnosis

The CLI 2.117.0 `supabase db start --from-backup` command accepted the Phase 5A custom `pg_dump` archive and returned success in a separate unlinked project on port 55422. It did not produce a usable verification target: the database container stayed up, but its own local health checks and TCP attempts failed with `role "postgres" does not exist`. The source stays on 54322 and was not contacted by these attempts. This is a bootstrap/backup-format incompatibility, not a password failure. Do not use this archive with `db start --from-backup` as evidence of recovery.

Phase 5A.1 resolved this by starting a clean initialized Supabase runtime first, then restoring only the application-owned `public` archive. The initialized runtime retained platform roles/schemas; public schema, data, FK and financial-function checks passed.

The source audit remains blocking only for ledger absence: no required table/function is missing and no tracked financial SECURITY DEFINER function lacks its empty safe `search_path`. Phase 4D source definitions show booking-row locking, idempotency lookup before retry-sensitive validation, bounded refund/reversal use of the original receipt, and EXECUTE revoked from `PUBLIC`, `anon`, and `authenticated` before service-role grant.
