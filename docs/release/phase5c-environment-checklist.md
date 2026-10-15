# Phase 5C environment and validation checklist

Status: not started. Complete each item with evidence, operator, timestamp, and approval/change reference. “Pass” requires actual approved staging evidence; local evidence is not a substitute.

## Authorization and isolation

- [ ] Platform owner identifies and authorizes the Vercel staging project/environment and deployment operator.
- [ ] Domain owner approves and records the staging hostname and DNS changes.
- [ ] Supabase database owner identifies and authorizes the separate staging project.
- [ ] Redis/Upstash owner identifies and authorizes a separate staging store.
- [ ] Security owner approves synthetic records and test financial/provider boundaries.
- [ ] Staging resource inventory confirms that no credential, URL, project ID, bucket, OAuth client, webhook, or database points to production.
- [ ] `NEXT_PUBLIC_APP_URL` is the exact HTTPS staging origin, not localhost or a production URL.
- [ ] All server-only secrets and rate-limit salts are unique to staging; `ADMIN_SESSION_SECRET` differs from the staging service-role key.
- [ ] Staging uses only synthetic/approved data and a scoped cleanup owner is named.
- [ ] Vercel project/environment, deployment commit, build ID, staging hostname, and non-secret resource IDs are recorded in the change record.
- [ ] Staging Vercel variables are entered only in the approved staging scope; no populated environment file is committed.
- [ ] Security owner verifies that no configured Supabase URL/project identity, Redis URL/token, storage credential, OAuth credential, or webhook target belongs to production.
- [ ] `node scripts/phase5b-validate-production-env.mjs` passes in the approved staging configuration; its redacted output is attached.

## Database readiness

- [ ] Target identity is captured: organization, project ref, URL, region, environment label, database, owner, and access path.
- [ ] Backup/recovery owner, retention, backup reference, and restore rehearsal are recorded.
- [ ] Current schema and migration ledger are exported read-only.
- [ ] Staging schema is compared with the approved Phase 5A baseline (including RLS, grants, functions, extensions, constraints, triggers, indexes, and critical row counts).
- [ ] Database owner approves the migration-history reconciliation procedure, if one is required.
- [ ] Exact forward-only migrations, lock impact, and recovery/compensating procedure are separately approved.
- [ ] No legacy migration is replayed merely because it is present in the repository.
- [ ] Post-change schema/ledger/RLS/grant/financial-RPC checks pass, or staging change is blocked.
- [ ] No schema deployment proceeds if target identity, backup/restore evidence, reconciliation procedure, or database-owner approval is missing.

## HTTPS and authentication

- [ ] Browser validates the full certificate chain for the exact hostname without an exception or TLS bypass.
- [ ] HTTP redirects to HTTPS as configured; no sensitive endpoint is tested with an insecure cookie workaround.
- [ ] Production-mode administrator login issues `mythirumanam_admin_session` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and expected lifetime.
- [ ] Normal administrator login and logout pass.
- [ ] Inactive administrator login is rejected.
- [ ] Authenticated booking operations pass using staging records.
- [ ] Payment, refund, and reversal authorization boundaries pass using staging records only.
- [ ] Protected quotation/PDF access works for an authorized admin and rejects anonymous/unauthorized access.
- [ ] Protected/admin responses, including failures, carry appropriate `Cache-Control: no-store`.
- [ ] Browser artifacts redact cookie values, credentials, fixture personal data, and financial details.

## Production-mode security regression

- [ ] Login limiter reaches its configured boundary and returns a rate-limit response; reset/expiry is observed without disabling the limiter.
- [ ] Explicit cross-origin admin mutation is rejected.
- [ ] Missing-Origin admin mutation is rejected in production mode.
- [ ] Untrusted forwarded-header changes do not create attacker-controlled rate-limit identities.
- [ ] Anonymous protected API and protected PDF requests are rejected.
- [ ] Booking/payment/refund/reversal accesses reject unauthenticated and unauthorized callers.
- [ ] CSP Report-Only header is emitted and compatible with required staging flows.
- [ ] CSP reports, if configured, are collected and reviewed; enforcement is not enabled without separate approval.
- [ ] Secure cookie is accepted and sent only by a browser over trusted HTTPS.

## Catalogue and public pages

- [ ] Staging Supabase connectivity succeeds with only staging configuration.
- [ ] Anon/RLS reads return the expected approved active catalogue; no privileged data is exposed.
- [ ] 60th, 70th, and 80th celebration pages render current catalogue data.
- [ ] Dynamic catalogue page behavior is observed after an approved fixture change.
- [ ] Catalogue retrieval failure reaches the intended safe recovery state without secret/error leakage.
- [ ] Public assets, responses, browser source, and logs reveal no server-only credentials.

## Monitoring and log redaction

- [ ] Existing approved logging surfaces are available to the designated operators; no unapproved provider is installed.
- [ ] Admin login failures can be found without passwords, session values, or secrets.
- [ ] Public enquiry failures can be found with sensitive fields redacted.
- [ ] Booking lifecycle and vendor/task errors can be found with appropriate identifiers/error classes.
- [ ] Payment/refund/reversal errors can be found without financial secrets or full sensitive payloads.
- [ ] Catalogue and database-connectivity failures can be found.
- [ ] Retention, access control, escalation owner, and alert/triage path are recorded.
- [ ] No unapproved monitoring/log-drain provider or integration was installed for staging.

## Representative smoke and cleanup

- [ ] Homepage and 60th/70th/80th pages pass.
- [ ] Public enquiry submission creates the expected CRM lead.
- [ ] Quotation creation and authorized PDF generation/access pass.
- [ ] Booking lifecycle, task management, and vendor coordination pass.
- [ ] Customer payment tracking and approved refund/reversal test paths pass.
- [ ] Admin authentication and authorization boundaries pass.
- [ ] Fixtures are cleaned up by scoped identifiers only; no reset or truncation is used.
- [ ] Database owner verifies post-cleanup integrity and record the result.

## Deployment runbook gates

- [ ] Platform owner verifies the production-mode build with the Vercel-configured `npm run build` process and records the staging deployment/build ID.
- [ ] Exact staging hostname has a browser-trusted certificate before authenticated testing begins.
- [ ] Preflight proves `NEXT_PUBLIC_APP_URL` equals the exact staging HTTPS origin.
- [ ] Platform owner has a prior approved staging deployment available for rollback.
- [ ] Rollback changes application deployment only unless the database owner has approved a separate forward-compensation or restore procedure.
