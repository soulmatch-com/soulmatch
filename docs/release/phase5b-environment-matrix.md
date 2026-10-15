# Phase 5B environment matrix

| Variable group | Client/server | Required production | Purpose |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client/server | yes | public Supabase connection only |
| `SUPABASE_SERVICE_ROLE_KEY` | server | yes | server-only RLS-bypass client |
| `ADMIN_SESSION_SECRET` | server | yes | separate admin-cookie HMAC key |
| Upstash URL/token and rate-limit salts | server | yes | durable public-form/subscriber abuse protection |
| Turnstile secret/hostname; public site key | split | yes | enquiry bot protection |
| notification/provider/webhook/cron secrets | server | conditional | controlled delivery and webhooks |
| Cloudinary API secret | server | conditional | server upload signing |
| `NEXT_PUBLIC_APP_URL` | client/server | yes | canonical public origin |

Production must supply real HTTPS URLs and dedicated secrets through hosting configuration; no fallback to local endpoints is approved. Public `NEXT_PUBLIC_*` values are not authorization secrets.

Run `node scripts/phase5b-validate-production-env.mjs` only in an approved deployment environment. It prints variable names and validation state only, rejects localhost/non-HTTPS URLs, placeholders, missing mandatory values, and session/service-key reuse.
