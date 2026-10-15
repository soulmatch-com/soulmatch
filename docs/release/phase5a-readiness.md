# Phase 5A readiness gate

## Decision: Phase 5A.1 application-scope restore accepted; Phase 5A production reconciliation remains blocked

The accepted local schema is reachable only as an unlinked loopback runtime and has the workflow objects used by Phase 4E. However, its Supabase migration-history schema is absent. Therefore the current state is verifiable, but the historical execution ledger is unknown and the repository does not yet provide a reproducible whole-application baseline.

## Required approvals and blockers

1. Database owner approval for a captured baseline and its checksums.
2. A Supabase CLI-version-compatible, reviewed `migration repair`/baselining procedure; no direct ledger manipulation.
3. Explicit ordering and timestamped replacement strategy for 39 unversioned SQL files and legacy `database/migrations` dependencies.
4. Successful disposable-clone backup/restore and source-vs-catalogue comparison.
5. Review of financial function definitions, locks, grants, `SECURITY DEFINER` configuration, and immutable-ledger enforcement.
6. A full Supabase runtime restore rehearsal. The application dump was created and archive integrity checked, but restore into the disposable clone is currently blocked by insufficient local role privileges for Supabase-owned schemas (`supabase_admin` ownership and `realtime.log_min_messages`). The scoped `auth`/`public` attempt also requires bootstrap creation of `auth`; no local role/settings were changed to work around this.
7. A compatible backup artifact for `supabase db start --from-backup`. The Phase 5A custom archive was accepted by CLI 2.117.0 but produced a target whose local checks fail because the `postgres` role is absent; therefore CLI exit code 0 is not recovery evidence.

Phase 5A does not authorize production deployment. Once these blockers close, proceed to a separately approved staging baseline rehearsal, then a production change plan.

## Phase 5A.1 successful rehearsal

A clean unlinked Supabase CLI 2.117.0 runtime (PostgreSQL 17.6, port 56422) was initialized without a backup. Generated credentials authenticated and managed roles/extensions were present. A new custom archive limited to the source `public` schema was restored with `pg_restore --exit-on-error --no-owner`, excluding only the already initialized `public` schema creation TOC entry. Exit code was 0. Managed `auth`, `storage`, `realtime`, and other platform schemas were deliberately not restored.

Source/target public-schema dumps differ only in the standard target `public` schema comment and PostgreSQL's equivalent normalized `admins_role_check` rendering. Data checks matched: leads 14, quotations 21, bookings 14, tasks 0, vendor assignments 7, payments 6; payment and task activity orphan counts were zero. The four financial RPCs are SECURITY DEFINER with `search_path=""` on the target. This validates application-scope recovery, not full Supabase platform recovery.
