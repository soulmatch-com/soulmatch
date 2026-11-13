# Booking production readiness review

Reviewed on 13 November 2026. Scope: the booking dashboard, dialogs, shared UI changes, payment operations, and their dependency and regression checks.

The reviewed booking flows have passing production-build verification. Deployment configuration and the live production system were not accessed.

## Issues fixed

- **Payment retry safety:** committed payments close their dialog before refreshing totals. A read failure no longer invites another write. Uncertain requests retain their original payload and idempotency key; concurrent submissions are blocked.
- **Full adjustment replay:** refund and reversal APIs recover an exact committed operation when replay encounters the exhausted receipt balance. Matching includes booking, original receipt, operation type, key, amount, currency, reason, and payment date. Mismatched requests remain rejected.
- **Navigation:** returning to a tab through browser history no longer reopens a dismissed quick-action dialog.
- **Task loading:** superseded filter requests are aborted, option-loading errors are surfaced, and selecting all checklist templates is disabled when no templates are available.
- **Dependencies:** Next.js and its lint configuration are aligned at 16.4.6; Zod is 4.6.7. Compatible transitive security updates are recorded in the lockfile.
- **Regression infrastructure:** older checks now follow the tabbed interface and current labels. Fixtures supply their own checklist data. Vendor history assertions request explicit chronological ordering. Production browser tests retain production origin/auth checks and use a loopback rate-limit provider fixture.

## Verification

| Check | Result |
| --- | --- |
| Optimized production build | Passed |
| Application TypeScript | Passed |
| Playwright TypeScript | Passed |
| Booking browser scenarios against production builds | All 38 validated |
| Release, sitemap, and rate-limit checks | 25 passed |
| Production dependency audit | 0 reported vulnerabilities |
| Repository lint | 0 errors, 109 warnings |
| Whitespace/diff check | Passed |

The final broad browser run passed 37 scenarios. Its remaining keyboard test needed to await an enabled reversal button after totals refreshed; that corrected scenario passed twice in a focused production run. Coverage includes creation, completion, authorization, lifecycle recovery, payments, refunds, reversals, expenses, tasks, vendors, history, mobile layout, keyboard focus, lost responses, and duplicate-submit protection.

To reproduce the browser checks, provision a verified local test administrator with `node scripts/playwright-local-admin.mjs setup`, then run the booking spec files with `PLAYWRIGHT_PRODUCTION=1 npx playwright test`. The production harness performs its own build and serves on localhost:3001. Rebuild normally afterward: public environment values are embedded at build time.

## Remaining release considerations

- The repository still has 109 lint warnings; the lint command currently permits warnings.
- The full dependency audit still reports 7 moderate findings in the development lint toolchain. The production dependency audit is clean; no forced or incompatible overrides were introduced.
- Checks ran on Node 25.2.1, while the package declares Node 22.x. CI or staging should validate the declared deployment runtime.
- Real production origin, Supabase credentials, signing secrets, Upstash/Turnstile configuration, and deployed behavior require verification in the deployment environment. The local browser provider fixture does not validate connectivity to a real Upstash account.

No production database changes or deployment were performed.
