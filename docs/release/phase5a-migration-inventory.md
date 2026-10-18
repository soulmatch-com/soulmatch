# Phase 5A migration inventory

Generated from the repository on 2026-10-14. This is an inventory, not an execution order.

## Findings

- 53 SQL files reside in `supabase/migrations`; only 14 use a Supabase CLI timestamp identifier.
- 8 legacy migration files reside in `database/migrations`; they are not CLI-tracked.
- 15 `verify_*.sql`/diagnostic files are read-only verification artifacts stored alongside migrations and must never be pushed as migrations.
- `20261009_phase1_admin_reliability.sql` has an eight-digit version and is nonstandard beside fourteen-digit versions. No duplicate timestamp version exists among timestamped files.
- The unversioned files have no safe inferred order. They include prerequisite profile, celebration, lead, notification, and corrective changes.

## Versioned workflow migrations

| File | SHA-256 | Effects / dependencies | Risk |
|---|---|---|---|
| `20261009_phase1_admin_reliability.sql` | `e70667f0a0d44d16268ccd9fd4823feb882ec7c7d977322a95633718c8f72bb8` | `admins`, admin RPCs/grants; depends on legacy profiles/admin data | alters/drops functions |
| `20261009120000_fix_celebration_enquiry_initial_status.sql` | `4b646b27a82ca3d6acbdf30d2be6158bd63bb77771681d6a9fc64a505937c31a` | enquiry status defaults/checks | existing-data constraint risk |
| `20261009130000_phase3_quotation_lifecycle.sql` | `7a32e6999447bab6a3701663683cecba2f91d80b3d24f4dbb3417bd0caea3fc0` | quotation lifecycle/activity/delivery, RLS, RPCs | alters quotation data/functions |
| `20261009140000_phase4a_booking_core.sql` | `76fe89fe55e6ead415e285b0e4a267f93fa230dcb2afa95be14bef48cbf72d53` | bookings, service/lead snapshots, activities, booking RPCs | FK/data backfill and locks |
| `20261009150000_phase4b_event_tasks.sql` | `cba8abd52006f9e7baeeec3d0e072bab02b2f9b5381338db2b0de66570961c4b` | task templates/tasks/activities, RLS and RPCs | new FKs/triggers |
| `20261009150100_phase4b_task_completion_actor_fix.sql` | `fc8983faeca98e9b80bde2197740bc4e5bd85d57f670bf87d4a04f97db7aae8e` | task completion actor checks | function/constraint drift risk |
| `20261009150200_phase4b_task_booking_eligibility.sql` | `c4378d23e6343d372b25adef8cc47cb5e6eb53c08933b50bb992d83b68892f28` | task booking eligibility trigger | trigger replacement |
| `20261009150300_phase4b_task_update_service.sql` | `d3dec1a22f576df0f1e09f0ef808694a32a889fcf00c586846ceca3f4db97835` | task update RPC/grants | privilege replacement |
| `20261010100000_phase4c_vendor_management.sql` | `9d4beaf80dbe604e276a79c1551d2d8e7b5ef158a55b16cab6c4ff4074628dca` | vendors, assignments/activities, RLS, RPCs | new FKs/triggers |
| `20261010100100_phase4c_vendor_confirmation_actor_fix.sql` | `d7a0253c9de77b4195ca82c66cebb78850740d69857ec64572d5aad7a152f905` | vendor confirmation actor checks | function drift risk |
| `20261011100000_phase4d_customer_payments.sql` | `0c0a0c15014e8d9524249dd34831defae075fe3f5b5f0652cba6c6af439bb4e6` | payment ledger/activities, summary and payment RPCs | financial integrity / locks |
| `20261011110000_phase4d_refunds_reversals.sql` | `c282c6b15df96b04bb6b0bb2e0ce2c71bb363c29e8f139345460c14fd1fc4057` | refund/reversal RPCs and grants | immutable-ledger correctness |
| `20261012100000_phase4e_admin_service_role_grants.sql` | `41ee8c4e075a8859348cf20957f5478a6c8e5125b9382d9b64a637965da36fca` | service-role admin grants | permission expansion |
| `20261012100100_phase4e_profile_service_role_grants.sql` | `96356059e0b607729b16a330a70b3ba48bad5c144cfc4db45290bdfce9d0d558` | service-role profile grant | permission expansion |

All listed checksums are SHA-256 values for the repository files inspected in this phase; the audit script inventories object evidence but does not alter ledger history.

## Unversioned dependency groups

| Group | Files | Required objects / concerns |
|---|---|---|
| Celebrations and profiles | `add_thirukadaiyur_celebrations`, profile fields/status/constraints, couple optionality, gothram/dosham, plan fields | `celebration_enquiries`, service selections, `profiles`; RLS and non-null checks |
| CRM | `add_admin_lead_management`, `add_enquiry_reference`, `add_expired_lead_status` | `leads`, `lead_activities`, enquiry FK/indexes and CRM RPCs |
| Notifications | `add_email_*`, `add_notification_*`, corrective `fix_notification_*` | subscriber/campaign/job/event tables, queue/claim RPCs, RLS/grants |
| Verification only | all `verify_*.sql`, `DIAGNOSTIC_QUERY.sql` | read-only; exclude from deployment migration directory |

Legacy database dependencies also include `database/schema.sql`, `database/update_profile_completion_function.sql`, `database/migrations/*.sql`, and `supabase/maintenance/reconcile_celebration_enquiry_leads.sql`. The maintenance reconciliation is not a migration and requires separate approval.

## Reconciliation matrix

| Migration group | Expected effects | Actual schema evidence | History status | Planned action |
|---|---|---|---|---|
| Legacy schema / 8 `database/migrations` | profiles, blog/CMS, notifications and quotation prerequisites | present-day public schema verified; provenance unknown | unknown | fold only reviewed dependencies into a new baseline manifest |
| Unversioned Supabase dependencies | celebrations, CRM, profiles, notification prerequisites/corrections | required workflow objects present | unknown | inventory and order by verified dependency graph; never replay in place |
| Phase 1 / enquiry fix | admin reliability, enquiry status | tables/functions present | unknown; 8-digit version nonstandard | owner decides whether a new canonical baseline supersedes it |
| Phase 3 | lifecycle, activity/delivery and RPCs | signatures present; body hashes captured | unknown | compare approved source bodies before ledger action |
| Phase 4A–C | booking/task/vendor tables, FKs, triggers and RPCs | 31 public tables, 18 triggers, 230 constraints | unknown | preserve as baseline effects; future changes forward-only |
| Phase 4D | append-only payment ledger, idempotency, refund/reversal functions | 6 payments; zero payment activity orphans; SECURITY DEFINER safe path | unknown | require financial-owner sign-off before any baseline/ledger action |
| Phase 4E | service-role grants | grants captured by audit | unknown | compare per-function/table ACLs in approved target |

## Checksummed verified present-day baseline

The application-owned reference is the `public` schema dump from the accepted source: SHA-256 `3a8b2bfd4e7f982dce9687c27859007518aa02e0fd57572dafdbf8258035bdba`. The matching application-scope custom archive SHA-256 is `913eec4467044276affc7d658fdd06a29d1a91fdce1343ef77984ac197e1beb6`. These are evidence of present-day schema/data, not historical migration records.
