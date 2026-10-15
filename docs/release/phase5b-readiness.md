# Phase 5B readiness

## Decision: Not Accepted for production release

Code/configuration controls are suitable for continued staging preparation, but production settings were not accessed and must be verified by the platform owner. Before release: set all required secrets, verify HTTPS origin and Supabase project identity, add admin-login abuse/CSRF controls, approve CSP, validate RLS/grants against production, and define operational alerts for authentication, public-form, and financial RPC failures.

No production deployment is authorized by this audit.

## Phase 5B.1 local controls

Admin login now uses the existing shared durable limiter when configured (production fails closed if its configuration is absent). Production cookie-authenticated admin mutations require the configured same Origin. Admin API responses receive `Cache-Control: no-store` through the Next.js 16 `src/proxy.ts` request boundary. A report-only CSP is enabled pending report review.

Phase 5B.2 changes the production policy to reject missing Origin on admin mutations: missing Origin cannot prove a cookie request is same-origin. Shared rate-limit identity trusts `x-vercel-forwarded-for` only when `VERCEL=1`; other hosts use a conservative shared bucket until a trusted proxy integration is approved.

Local evidence: the existing Playwright admin authentication suite passed 2/2 (normal session creation and inactive-account rejection). The environment validator accepted a complete synthetic HTTPS configuration and rejected localhost, missing limiter/Turnstile values, and session/service-key reuse. A controlled `NODE_ENV=production` loopback runtime using an isolated Redis-backed Upstash REST proxy verified: 8/8 allowed invalid login attempts followed by a 429 on attempt 9; one shared hashed bucket despite spoofed forwarding headers; 403 for explicit cross-origin and missing-Origin mutations; 401 plus `Cache-Control: no-store` for an anonymous protected request; report-only CSP emission; and local anon catalogue access (27 active services) with a rendered 60th page. Next.js 16 required migrating the inactive root `middleware.ts` convention to `src/proxy.ts`; the built functions manifest now registers the request boundary.

The controlled server is HTTP loopback, not a trusted TLS browser origin. Because production admin session cookies are correctly marked `Secure`, authenticated booking/payment mutations and protected PDF acknowledgements were not exercised in this runtime; manually replaying a secure cookie over HTTP would be an authentication bypass and was not attempted. Trusted local TLS or approved staging remains required before Phase 5B.2 local acceptance.

Catalogue-dependent pages were changed to dynamic rendering while retaining the one-hour server cache. This prevents a failed build-time anonymous catalogue request from baking an empty catalogue into a static page; runtime Supabase/RLS availability must still be verified in staging.
