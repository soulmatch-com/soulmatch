# Quotation editor production readiness

Reviewed 13 November 2026. Application changes and the database migration are prepared; no production environment was changed.

## Required release order

1. Confirm the deployment uses Node 22.x and the existing quotation migrations, including `20261113100000_copy_quotation_single_lead.sql`, are installed.
2. Apply `supabase/migrations/20261113120000_atomic_quotation_descriptions.sql` through the normal database migration process **before deploying this application version**. The API now includes descriptions in the transaction payload; the old RPC definitions ignore that field.
3. Validate the actual deployment environment with `node scripts/phase5b-validate-production-env.mjs`. This review used local Supabase; production credentials and provider configuration were not available for verification.
4. Build and deploy the application using its production environment. The local `.next` artifact was built against local Supabase and must not be promoted to production.
5. In the deployed admin portal, edit and save a draft, reopen it to verify its descriptions and customer, preview/download its PDF, copy it, and check the approved quotation-to-booking flow. Open Quotation History and confirm that its read-only timeline contains only the current quotation's activity.

The migration replaces the existing create/update quotation function bodies without changing their signatures or table structures. It keeps lifecycle guards, row locking, item ordering and the single-lead trigger. Write RPC execution is restricted to the server role. Older application code remains compatible with these function definitions, so an application rollback can retain the migration.

## Review fixes

- Save descriptions, prices, notes, service order and lead links atomically. Removed the API's separate description-update requests, which could fail after the quotation was already saved.
- Abort abandoned quotation loads, prevent actions on failed loads and provide a retry action. Validate the requested quotation before installing its data in the editor.
- Load referenced inactive services so existing quotation rows retain their names, quantities and descriptions. Inactive services are excluded from Add Service and new-quotation selections.
- Load linked active customers outside the recent 200-lead selector window, preventing a normal save from silently removing an older customer link.
- Refresh the effective status and update timestamp after lifecycle actions. Synchronize the validity input when a quotation is reopened without resetting an unsaved date during an unrelated status refresh.
- Match price and service-count controls to the API limits. Disable copying while loading, after a load failure and during saves.
- Permit blob PDF frames in the existing report-only CSP. Frame denial and the other existing security headers remain in place.
- Make failure-test mocks intercept mutations only and scope alert assertions to application/dialog alerts rather than Next.js's production route announcer.

## Verification

| Check | Result |
| --- | --- |
| Production build and runtime on Node 22.23.5 | Passed |
| Production browser checks | 20 passed across the functional run and the corrected isolated security run |
| Application and Playwright TypeScript checks on Node 22 | Passed |
| ESLint for all changed TypeScript files | Passed without warnings |
| Repository-wide ESLint | 0 errors; 109 existing warnings outside these changes |
| Quotation lifecycle and launch-readiness script tests | 10 passed |
| Local SQL atomic-description suite | Passed; fixtures rolled back |
| Local SQL quotation-copy suite | Passed; fixtures rolled back |
| Whitespace/diff check | Passed |

The functional browser run covers authentication, terminal-state editing restrictions, lifecycle conflicts and failure recovery, copying, booking creation, PDF failure/retry and a real PDF download. It also verifies persisted service edits and ordering, inactive catalogue entries, retention of a linked lead older than 200 newer leads, and layouts at 1536, 1280, 1024, 768 and 390 pixels.

The security check verifies anonymous rejection and `no-store` responses for quotation endpoints, plus rejection of missing and untrusted Origin headers in production mode. The production harness uses a local rate-limit provider stand-in; live Upstash behavior is not certified by this run. The unrelated legacy admin user directory logged a local Supabase Auth lookup warning while its existing profile fallback returned successfully.

## Current quotation activity update

Quotation History now opens a read-only timeline for the current quotation using the existing authorized lifecycle endpoint. It shows creation from the stored creation timestamp, recorded status transitions, expiry/reopening and delivery records. Delivery activity and recipient details are combined by delivery ID so a handoff appears once. Automatically calculated expiry is explained separately and is not invented as an audit event. Prices, service edits, notes edits and copy origins are not reconstructed.

The dialog fetches fresh data on every opening, aborts abandoned requests, offers loading/error/retry states, keeps its header and close control visible on small screens, and restores keyboard focus to its trigger. The Lifecycle card retains status actions; it no longer duplicates the activity list. The new-quotation form links to All Quotations instead of showing activity before a quotation exists. No additional database migration is required for this activity update.

Verification for this update: all 18 selected production browser cases passed across the regression run and the focused rerun after the dialog resize correction; 3 timeline unit tests passed; Node 22 production builds, application/Playwright TypeScript and targeted ESLint passed. The browser cases cover current-quotation isolation, delivery deduplication, fresh activity on reopening, draft creation, calculated expiry, loading/retry, keyboard focus and dialog bounds at 320, 390 and 768 pixels. The public enquiry acceptance test was updated to inspect recorded deliveries in the timeline; that provider-dependent public submission flow was not rerun for this update.

To reproduce the browser checks under Node 22 with a verified local Supabase instance and the local admin test fixture:

```sh
PLAYWRIGHT_PRODUCTION=1 npx playwright test \
  e2e/quotation-activity.spec.ts \
  e2e/quotation-editor.spec.ts \
  e2e/quotation-security.spec.ts \
  e2e/quotation-copy.spec.ts \
  e2e/e2e-1-quotation-lifecycle-acceptance.spec.ts \
  e2e/e2e-1-booking-creation-acceptance.spec.ts \
  e2e/admin-auth.spec.ts \
  --grep-invert 'inactive administrators'
```

The inactive-admin test was excluded because its separate fixture was not provisioned for this review. SQL suites run against verified local Supabase only; do not run fixture suites against production. Quotation-list pagination and large-dataset performance were outside this editor review. Sending, combined search and notifications remain deferred as approved.
