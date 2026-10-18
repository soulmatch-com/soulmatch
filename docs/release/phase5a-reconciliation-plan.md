# Phase 5A reconciliation and deployment plan

No step below is authorized by Phase 5A. Do not run `supabase db push`, `db reset`, `migration repair`, or ledger inserts until the listed approval is recorded.

Supabase documents that `migration repair` updates only the migration tracking table and is appropriate only when the actual database state is already known; it does not run or revert SQL. This repository cannot make that determination from names alone, so any repair must follow a reviewed catalogue/source comparison and use the exact approved versions. See [Supabase migration diagnosis](https://supabase.com/docs/guides/deployment/database-migrations).

## Local: evidence and reproducible baseline

1. Run `node scripts/phase5a-audit-local-db.mjs`; preserve its JSON as evidence. It rejects non-loopback targets and makes no changes.
   Do not pass the Phase 5A custom `pg_dump` archive directly to CLI 2.117.0 `db start --from-backup`: it is accepted but leaves the disposable runtime without the `postgres` role. The verified compatible procedure is: initialize a clean unlinked runtime, create a `--schema=public` custom archive, then restore it with `pg_restore --exit-on-error --no-owner` while excluding only the target's pre-existing `SCHEMA public` TOC entry. Preserve ACL entries and compare them afterwards. This is application-scope recovery only.
2. Obtain an owner-approved, schema-only baseline from the accepted local reference, plus a separately checksummed data backup for rehearsal. Do not derive a baseline from production.
   The Phase 5A local dump checksum was `cb78031e9e7cc0dd9e1ae740d171472b86c14d9d1171bc2a2d6b74ab9eebbc41`; archive listing passed (994 entries). It is temporary local evidence, not a production backup.
3. Restore into a newly named disposable local database; apply only the approved baseline and explicitly ordered dependency migrations.
4. Run the audit against both databases and compare catalogue JSON: columns/defaults, constraints, indexes, triggers, RLS/policies, table/function grants, function body hashes and security settings.
5. Stop on any unapproved difference. A successful comparison becomes the candidate baseline manifest.

## Staging: controlled rehearsal

1. Identify the database owner and change approver; capture staging version, extension versions, current migration ledger, schema dump checksum and restore test.
2. Take and validate a backup. Confirm restore into a disposable staging clone, FK integrity, critical row counts, financial ledger/activity relationships, and application-critical queries.
3. Compare staging to the approved baseline. Generate a *forward-only* ordered migration set; include unversioned legacy prerequisites as newly approved timestamped migrations rather than renaming historic files.
4. Review locks for `ALTER TABLE`, validation of checks/non-null/FK constraints, concurrent-index needs, data backfills, grants/RLS changes, and irreversible operations.
5. Obtain signed approval for any supported `supabase migration repair`/baseline operation. Do not fabricate rows in `schema_migrations`.

## Production: future approved procedure

1. Fail closed unless the CLI target/project identity, owner, migration ledger, schema comparison, backup checksum and restore rehearsal all match approval.
2. Enable change window and monitoring. Take a recoverable backup and verify its integrity before migration.
3. Execute the reviewed, forward-only migration order in the approved transaction boundaries. Isolate nontransactional index operations; account for locks and long-running validation.
4. Re-run catalogue comparison, migration version check, RLS/policy/grant and function EXECUTE checks, then admin/public smoke tests.
5. On failure: stop forward execution, preserve logs, restore only under incident approval or issue a tested compensating forward migration. Do not assume rollback exists for data, constraint, grant, or financial-ledger changes.

## Special handling

Phase 1–4E includes existing-data alters, checks, unique indexes, FKs, trigger/function replacements and permission changes. The payment/refund/reversal migrations are irreversible in practice: recovery is backup-based or a reviewed compensating migration; immutable ledger rows must not be edited. The maintenance lead reconciliation is separate operational work and must never be bundled with a baseline repair.
