# Phase 5B security audit

## Verified

- Service-role client is `server-only`; admin APIs consistently call `requireActiveAdmin`.
- Admin sessions are HTTP-only, `SameSite=Lax`, secure in production, expire in eight hours, and recheck active status against `admins`.
- Public enquiries enforce request-size limits, Zod validation, idempotency-key syntax, durable rate limiting and Turnstile fail-closed behavior.
- Payment routes use admin-only transactional RPCs rather than client inserts. Financial RPCs are SECURITY DEFINER with empty search path, restricted EXECUTE, row locking, idempotency and bounded corrections.
- Baseline headers now include HSTS, no-sniff, frame denial, strict referrer policy and disabled camera/microphone/geolocation.
- CSP is report-only: it permits the verified Next inline bootstrap, Cloudflare Turnstile, Supabase, Cloudinary, and local fonts/images; enforcement requires report review.
- Controlled production-mode runtime (loopback only) verified the Upstash REST `EVAL` token-bucket protocol against an isolated Redis-backed proxy. Eight invalid login attempts reached the application and the ninth was rejected with 429; changing untrusted `X-Forwarded-For` values did not create extra buckets.
- Production Origin checks reject an explicit cross-origin mutation and a missing-Origin mutation with 403. Anonymous protected API responses return 401 with `Cache-Control: no-store`.
- The public local anon role returned 27 active celebration services and the 60th celebration page rendered without its catalogue failure state.
- Next.js 16 was not discovering the root `middleware.ts` in this `src/app` project. The request boundary has been migrated to `src/proxy.ts`; the production functions manifest now registers `/_middleware`, and real HTTP requests exercise the Origin/cache policy.

## Findings

| Severity | Finding | Action |
|---|---|---|
| High resolved | Session HMAC could reuse service-role key | Production now requires `ADMIN_SESSION_SECRET`; development-only fallback retained for local compatibility. |
| Resolved locally | Forwarded headers and missing-Origin mutation policy | Only Vercel edge identity is trusted; production mutations require configured same Origin. |
| Medium | No reviewed CSP | Define/report-only CSP after confirming Next, Supabase, Cloudinary and Turnstile origins. |
| Low resolved | Admin/private response cache directives were ineffective because the request boundary was not included in the Next.js 16 artifact | Migrated to `src/proxy.ts`; protected anonymous and rejected cross-origin responses now return `Cache-Control: no-store`. |

Logs reviewed avoid direct secret output in application routes; retain only identifiers/error classes for operational failures.
