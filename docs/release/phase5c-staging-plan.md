# Phase 5C staging plan

Status: preparation only — no staging environment was accessed, created, changed, or deployed during this phase.

## Repository discovery

| Area | Evidence found | Status / gap |
| --- | --- | --- |
| Approved hosting direction | `vercel.json`, `DEPLOYMENT.md`, and the Phase 5B environment matrix identify Vercel as the intended platform. `vercel.json` targets `bom1`, Node 22, and enables builds from `main`. | No Vercel project/team identifier, staging project, deployment URL, or access authorization is stored in the repository. |
| Deployment automation | Vercel build configuration exists. `scripts/deploy.sh` is an older VPS/PM2 production-style script. | No staging deployment script, promotion workflow, approval gate, or CI/CD workflow was found. |
| Domain / TLS | Production naming references `mythirumanam.in`; `NEXT_PUBLIC_APP_URL` is configurable. | No staging DNS name, domain ownership record, certificate evidence, or TLS endpoint exists in the repository. |
| Supabase | `supabase/config.toml` is deliberately local-only (`mythirumanam-local`) and states the existing remote project is production. Migrations and a reconciliation plan exist. | No separate staging project reference, credentials, baseline comparison, ledger export, backup owner, or database-owner approval exists. |
| Redis / rate limiting | Upstash-compatible REST configuration and production fail-closed validation are implemented. | No staging Redis instance or isolated credentials are identified. |
| Secret management | Vercel environment-variable instructions and `.env.example` enumerate required configuration; `.env*` and local Supabase runtime state are ignored. | No secret-manager integration, environment scope mapping, rotation record, or staging secret approval is present. |
| Observability | Vercel function logs are referenced; `scripts/monitor.sh` is a VPS/PM2 host-health script. | No approved staging alerting, structured log sink, dashboards, retention policy, or redaction test is configured. |

## Phase 5C.1 reusable configuration

The staging deployment must reuse the application configuration already in the repository without changing production settings:

- `vercel.json`: Next.js build (`npm run build`), Node 22, `bom1` function region, ten-second function limit, and baseline response headers. It does not create a project, custom environment, or domain.
- `next.config.ts` and the production build command: retain the same approved production-mode build artifact for staging; do not introduce a staging-only behavior switch that weakens controls.
- `.env.example`: the authoritative inventory of runtime configuration, including Supabase, unique administrator-session secret, Upstash REST limiter, Turnstile, notification, Cloudinary, and application-origin settings.
- `scripts/phase5b-validate-production-env.mjs`: reusable, name/state-only validation. Run it in the staging deployment context only after variables are configured. It rejects missing/placeholders, non-HTTPS/localhost public URLs, and service-role/session-secret reuse.
- `src/proxy.ts`, `src/lib/admin-session.ts`, and the admin login route: reusable production-mode Origin, cache, cookie, and session-secret controls. `NODE_ENV=production` is required for acceptance testing.
- `supabase/config.toml`: local-only configuration; it must remain unlinked. It is not a staging target definition.

No repository CI workflow, Vercel project identifier, deployment hook, or remote environment binding was found. The platform owner must supply those external configuration facts through the approval record, not by adding credentials to the repository.

## Required target architecture

Use a Vercel staging project or an explicitly isolated Vercel environment, owned by the platform owner, with a fixed domain such as `staging.mythirumanam.in`. Do not use an arbitrary preview URL for final security acceptance: the fixed hostname must have a browser-trusted certificate and be the exact `NEXT_PUBLIC_APP_URL`.

| Component | Staging requirement |
| --- | --- |
| Web application | Separate Vercel staging project/environment, pinned to an approved commit and production-mode build. Configure a protected manual deployment/promotion approval. |
| TLS and DNS | Domain owner creates DNS validation/record only after approval. Vercel-managed trusted TLS must cover the exact staging hostname. HSTS may be observed but must not be used to bypass certificate failures. |
| Supabase | A distinct staging Supabase project, separate organization/project identity, database, Auth settings, storage, backups, logs, and API keys. Configure only the staging hostname as site/redirect URL where applicable. Never copy production service-role credentials. |
| Redis | A distinct staging Upstash/Redis database, URL, token, and independently generated rate-limit salts. It must not share a namespace, credentials, or eviction risk with production. |
| Other integrations | Use synthetic/approved staging-only Cloudinary, Turnstile, email/provider, webhook, notification-worker, and cron credentials. Keep real customer recipients and live financial providers disabled unless a written test authorization explicitly enables them. |
| Cookies | `NODE_ENV=production`, HTTPS, `ADMIN_SESSION_SECRET` unique to staging, and the implementation’s `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, eight-hour cookie policy. No HTTP cookie replay or flag override is permitted. |
| Data | Approved synthetic fixtures only: active/inactive admins, catalogue records, test enquiry/lead/quotation/booking/vendor/task/payment/refund/reversal records, and protected PDFs. Fixtures must be identifiable and have an owner-approved scoped cleanup procedure. |
| Logs and monitoring | Use existing Vercel/Supabase/Upstash logs unless the operations owner approves another provider. Configure access-controlled views and redaction checks before test execution. |

## Secret and isolation gate

Before deployment, the platform owner must attest that every staging variable maps to the staging resource inventory. At minimum configure the variables checked by `scripts/phase5b-validate-production-env.mjs`, plus the applicable notification, Turnstile, Cloudinary, cron, and worker variables from `.env.example`. Generate unique staging values for all server-only keys and salts.

Required negative confirmation: no staging variable, DSN, project URL, token, service-role key, OAuth refresh token, webhook secret, database connection string, or storage credential points to production.

Run the existing validator in the approved staging deployment environment only; retain its name/state-only output as evidence. It rejects missing values, placeholders, localhost/non-HTTPS public URLs, and service-role/session-secret reuse.

### Staging environment-variable template

Store values only in the approved Vercel staging environment/secret facility. This is a key-only template; do not commit a populated file, resource ID, URL, token, or secret.

| Group | Required staging entries | Isolation rule |
| --- | --- | --- |
| Application | `NEXT_PUBLIC_APP_URL` | Exact approved `https://` staging hostname; must not equal production origin. |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | All originate in the separately identified staging Supabase project. Deny configuration if URL/project identity matches production. |
| Admin session | `ADMIN_SESSION_SECRET` | Fresh staging-only server secret; must differ from the staging service-role key and every production value. |
| Rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_LOGIN_RATE_LIMIT_SALT`, `CELEBRATION_RATE_LIMIT_SALT`, `NOTIFICATION_SUBSCRIBER_RATE_LIMIT_SALT` | Separate staging Redis database/credentials and unique staging salts. No shared URL, token, or namespace with production. |
| Bot protection | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` | Approved test/staging Turnstile configuration limited to the staging hostname. |
| Notification/worker | Provider credentials, `NOTIFICATION_UNSUBSCRIBE_SECRET`, `NOTIFICATION_WORKER_SECRET`, `CRON_SECRET`, `NOTIFICATION_PUBLIC_BASE_URL`, scheduler setting | Synthetic/test mailbox and staging-only webhook/OAuth secrets. Disable scheduled delivery unless explicitly approved. |
| Optional media | Cloudinary public name/API key/API secret | Separate staging account/folder/credentials approved by the media owner; do not reuse production write credentials. |
| Content/admin setup | publication gate and any local admin bootstrap variables | Use only named non-production administrators. Keep `ADMIN_SETUP_ENABLED=false` unless separately approved for a short, audited bootstrap window. |

The platform owner records a non-secret fingerprint or provider-side variable inventory for review. Security owner independently verifies that production endpoint strings and production project IDs are absent before the first deployment.

## Ownership, dependencies, and cost planning

| Resource | Owner / approver | Dependencies | Current published starting cost (USD, excluding taxes/overage) |
| --- | --- | --- | --- |
| Vercel staging project/environment | Platform owner; deployment approval by release owner | Vercel team access, source repository, staging secrets, domain verification | Vercel lists Hobby at $0/month and Pro at $20/month; Pro includes one custom environment and collaboration controls. Select only the plan approved for organizational use. [Vercel pricing](https://vercel.com/pricing) |
| Staging hostname/TLS | DNS/domain owner | Approved domain, DNS control, Vercel project | Vercel lists HTTPS certificates/TLS on its delivery network; domain registration/DNS costs are not established by this repository and require the domain owner’s quote. [Vercel pricing](https://vercel.com/pricing) |
| Staging Supabase project | Database owner; change approval by database owner | Separate project, Auth redirect/site URLs, backups and restore operator | Supabase lists Free at $0/month and Pro at $25/month; Pro includes daily backups with seven-day retention. The owner must choose a plan matching recovery requirements. [Supabase pricing](https://supabase.com/pricing) |
| Staging Upstash Redis | Redis/Upstash owner | Separate database, REST credentials, budget/cost alert | Upstash lists Free at $0/month (250 MB/500K commands); pay-as-you-go begins at $0.20/100K commands; Fixed 250 MB is $10/month. Set a provider budget before testing. [Upstash Redis pricing](https://upstash.com/pricing/redis) |
| Logging/monitoring | Operations/observability owner | Approved provider, controlled access, retention/redaction decision | Use Vercel/Supabase/Upstash built-in logs first. No additional-provider cost is assumed; any log drain, alerting add-on, or external monitoring needs separate approval and quote. |
| Test accounts/data | Application/security owner | Staging Supabase project; fixture owner | No third-party cost estimated; create only synthetic, non-production records after approval. |

Prices are reference estimates observed on 2026-10-14, not a procurement approval or full forecast. Compute, transfer, observability, email, storage, tax, domain, and provider overages can change the total.

## Provisioning and approval sequence

1. Platform owner confirms the Vercel team/project, DNS owner, candidate hostname, and authorization to create/configure staging resources.
2. Supabase database owner confirms the new staging project identity, backup/recovery owner, retention, and access method.
3. Security owner approves synthetic test identities, provider/financial test boundaries, secret handling, and the browser test operator.
4. Platform owner provisions the isolated resources and records non-secret identifiers in the change record.
5. Database owner completes the database gate below before any schema change.
6. Platform owner configures only staging secrets, deploys the approved commit after explicit authorization, and captures deployment identity.
7. Security/QA executes the HTTPS, security, catalogue, monitoring, and smoke evidence matrices in the checklist. Stop on an isolation, TLS, authorization, RLS, or financial-safeguard failure.
8. Fixture owner performs scoped cleanup; database owner verifies integrity and no production impact; approvers sign the readiness record.

## Staging deployment runbook — execute only after authorization

1. **Change record and preflight:** attach all approvals; record commit SHA, planned hostname, non-secret resource identities, maintenance/test window, fixture owner, rollback owner, and escalation contacts. Confirm no production target is in scope.
2. **Provision/configure externally:** platform, DNS, database, Redis, and security owners create or configure their approved isolated resources. Record only non-secret identities. Bind the hostname and wait for a browser-trusted certificate; do not accept certificate warnings.
3. **Configure Vercel staging variables:** platform owner enters the key/value inventory into the staging scope. Security owner validates isolation against the template, runs `node scripts/phase5b-validate-production-env.mjs` in the approved context, and retains redacted output.
4. **Database gate:** complete the database gate in this document before any staging schema action. If reconciliation is unresolved, deploy only code that does not require a schema change or stop, as determined by the database owner.
5. **Build and deploy:** platform owner deploys the approved commit with `npm install` and `npm run build` as configured by `vercel.json`; no automatic deployment is enabled by this runbook. Capture Vercel deployment/build ID and build logs.
6. **Readiness checks:** verify the exact HTTPS hostname, certificate chain, `NEXT_PUBLIC_APP_URL` alignment, application response, staging Supabase connectivity, Redis limiter availability, Turnstile test configuration, and absence of secret values in client responses/logs.
7. **Security and smoke execution:** execute the Phase 5C.1 test matrix below with approved synthetic fixtures only. Preserve headers/results with cookies, tokens, personal data, and financial details redacted.
8. **Monitoring and rollback:** observe Vercel/Supabase/Upstash logs for the test window and validate redaction. If a deployment is unsafe, platform owner rolls back to the prior approved staging deployment; database owner decides any compensating forward migration or approved restore. Never reset/truncate a database to roll back.
9. **Cleanup and closure:** fixture owner removes only identified staging fixtures; database owner checks integrity; release owner updates the test results and readiness decision.

### HTTPS security acceptance matrix

After only the above provisioning and authorization gates, verify in a real browser against the fixed staging hostname:

| Test | Expected result |
| --- | --- |
| TLS and cookie | Trusted certificate chain; login issues `HttpOnly; Secure; SameSite=Lax; Path=/` administrator cookie. No browser exception or HTTP replay. |
| Admin lifecycle | Approved active staging admin can log in/out; inactive staging admin is rejected. |
| Origin policy | Explicit cross-origin and missing-Origin administrator mutations are rejected in production mode. |
| Authorization | Anonymous and unauthorized booking/payment/refund/reversal/PDF requests are rejected; authorized synthetic workflows succeed. |
| Cache policy | Protected/admin successes and failures include `Cache-Control: no-store` as applicable. |
| CSP | `Content-Security-Policy-Report-Only` is present; required staging flow reports are reviewed without enabling enforcement. |
| Abuse controls | Login attempts reach the configured rate-limit response; recovery waits for normal expiry/reset, never disables the limiter. |

## Database gate — mandatory before staging schema deployment

No repository command is authorized to target a remote database by this plan. In particular, do not run `supabase db push`, `db reset`, `migration repair`, or ledger inserts until the following evidence and approval are recorded:

1. Confirm project reference, organization, URL, environment label, database name, region, and named database owner are the approved staging target.
2. Record backup schedule, recovery-point/restore owner, backup timestamp/checksum or provider reference, and successful restore rehearsal into an isolated disposable target.
3. Capture a schema-only staging inventory and migration ledger. Compare tables, columns/defaults, constraints, indexes, triggers, RLS policies, grants, function bodies/security attributes, extensions, and critical row counts against the approved baseline described in `phase5a-reconciliation-plan.md`.
4. Reconcile only from evidence. Existing unversioned legacy files must not be replayed or renamed blindly. Any `migration repair` may update the ledger only after the database state and exact approved versions are demonstrated.
5. Obtain written database-owner approval of the exact forward-only order, lock/transaction plan, rollback/compensating procedure, and migration-history reconciliation procedure.
6. Apply only a separately authorized migration set. Re-run inventory, ledger, RLS/grants, financial RPC, and application smoke checks afterwards.

If the ledger/baseline comparison or owner approval is unresolved, staging schema changes are blocked.

## Execution boundaries

This plan authorizes no production access, no production deployment, no production secrets, no database reset/truncation, no TLS exception, no Secure-cookie bypass, no RLS weakening, and no financial-RPC modification.
