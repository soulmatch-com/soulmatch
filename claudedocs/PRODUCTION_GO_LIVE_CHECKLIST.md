# MyThirumanam Production Go-Live Checklist

This checklist separates code readiness from operator-controlled production setup. Do not add launch-only features here, and do not store secret values in source control.

## Production Environment Variables

Required by current production code:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Production Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Production Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Production service-role key. Never expose to browser or Preview unless deliberately using the production DB. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Production Turnstile site key. Do not use Cloudflare test keys. |
| `TURNSTILE_SECRET_KEY` | Server only | Production Turnstile secret key. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Server only | `mythirumanam.in`; include `www.mythirumanam.in` only if requests can originate there before redirect. |
| `UPSTASH_REDIS_REST_URL` | Server only | Upstash Redis REST URL for enquiry rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | Upstash Redis REST token. |
| `CELEBRATION_RATE_LIMIT_SALT` | Server only | Strong random secret used to hash network identifiers. |
| `GMAIL_OAUTH_CLIENT_ID` | Server only | Google OAuth client for booking notifications. |
| `GMAIL_OAUTH_CLIENT_SECRET` | Server only | Google OAuth client secret. |
| `GMAIL_OAUTH_REFRESH_TOKEN` | Server only | Refresh token for the approved Gmail account. |
| `CELEBRATION_BOOKINGS_EMAIL` | Server only | Must be `bookings.mythirumanam@gmail.com` for production. Keep environment-configured. |
| `CELEBRATION_EMAIL_FROM` | Server only | Must be compatible with the authenticated Gmail account or an authorized Gmail send-as alias. |

Optional or feature-dependent:

| Variable | Scope | Safe production default |
| --- | --- | --- |
| `NEXT_PUBLIC_MYTHIRUMANAM_CONTACT_EMAIL` | Public | Configure only when an approved public contact email exists. |
| `NEXT_PUBLIC_MYTHIRUMANAM_PHONE_E164` | Public | Leave unset until an approved business phone number exists. |
| `NEXT_PUBLIC_MYTHIRUMANAM_WHATSAPP_E164` | Public | Leave unset until an approved WhatsApp number exists. |
| `SUCCESS_STORIES_PUBLICATION_APPROVED` | Server only | `false` unless production success stories are explicitly approved. This hides public success stories. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public | Required only for Cloudinary-backed upload flows. |
| `CLOUDINARY_API_KEY` | Server only | Required only for Cloudinary-backed upload flows. |
| `CLOUDINARY_API_SECRET` | Server only | Required only for Cloudinary-backed upload flows. |
| `ADMIN_SETUP_ENABLED` | Server only | `false`; production also returns 404 regardless. |
| `ADMIN_SETUP_EMAIL` | Server only | Do not configure when setup is disabled. |
| `ADMIN_SETUP_PASSWORD` | Server only | Do not configure when setup is disabled. |
| `NEXT_PUBLIC_ADMIN_API_URL` | Public | Optional admin module override; default is `/api/admin`. |

`NEXT_PUBLIC_APP_URL` is not currently read by application source, but if configured for deployment convention it must be `https://mythirumanam.in` in Production.

Use Vercel Production scope for production values. Development and Preview should use isolated non-production Supabase, Gmail, Turnstile, and Upstash resources unless production access is explicitly approved.

## Supabase Verification

Do not mutate an unidentified remote project. First identify the approved production Supabase project and confirm backup/recovery capability.

Required migration: `supabase/migrations/add_thirukadaiyur_celebrations.sql`.

Review before execution:

- Tables are `CREATE TABLE IF NOT EXISTS`.
- Service seed uses `ON CONFLICT (location, code) DO UPDATE`, so it updates existing catalogue rows and should not create duplicates.
- RPC is `SECURITY DEFINER`, uses `SET search_path = ''`, validates active service IDs, and inserts enquiry plus service relationships in one transaction.
- RPC execution is revoked from `PUBLIC`, `anon`, and `authenticated`; granted to `service_role` only.

Verify actual production objects, not only migration history:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('celebration_services', 'celebration_enquiries', 'celebration_enquiry_services');

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'create_celebration_enquiry';

select code, name, is_active, display_order
from public.celebration_services
where location = 'thirukadaiyur'
order by display_order;

select count(*) as active_service_count
from public.celebration_services
where location = 'thirukadaiyur' and is_active = true;
```

Expected active service codes:

`vadhyar`, `pooja_materials`, `marriage_hall`, `temple_coordination`, `catering`, `decoration`, `photography`, `videography`, `nadaswaram`, `accommodation`, `transportation`, `invitations`, `return_gifts`, `complete_arrangement`.

Expected active service count: `14`.

Verify grants and RLS:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('celebration_services', 'celebration_enquiries', 'celebration_enquiry_services');

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('celebration_services', 'celebration_enquiries', 'celebration_enquiry_services')
order by table_name, grantee, privilege_type;

select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'create_celebration_enquiry'
order by grantee, privilege_type;
```

Expected RLS behavior:

- `celebration_services`: anon/authenticated can select active services only.
- `celebration_enquiries`: no public select/insert/update/delete access.
- `celebration_enquiry_services`: no public select/insert/update/delete access.
- `create_celebration_enquiry`: service-role execution works; anonymous browser clients cannot invoke it directly.

RPC contract checks:

- Valid service-role call creates one `celebration_enquiries` row and matching `celebration_enquiry_services` rows.
- Invalid, inactive, wrong-location, or malformed service UUIDs fail without partial rows.
- Empty service list is allowed only when `arrangement_preference = 'need-guidance'`.
- Duplicate service IDs do not create duplicate relationship rows.

## Turnstile Setup

1. In Cloudflare, create or select the production Turnstile widget.
2. Add `mythirumanam.in` as a production hostname.
3. Add `www.mythirumanam.in` only if requests may submit from `www` before redirect.
4. Copy the site key to `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
5. Copy the secret key to `TURNSTILE_SECRET_KEY`.
6. Set `TURNSTILE_ALLOWED_HOSTNAMES` to the accepted hostname list.
7. Add values to Vercel Production. Never place the secret in any `NEXT_PUBLIC_*` variable.

## Upstash Setup

1. Create or select the production Upstash Redis database.
2. Copy REST URL to `UPSTASH_REDIS_REST_URL`.
3. Copy REST token to `UPSTASH_REDIS_REST_TOKEN`.
4. Generate a strong random `CELEBRATION_RATE_LIMIT_SALT`.
5. Add all three values to Vercel Production.

The current rate limit is 5 submissions per 10 minutes.

## Gmail OAuth Setup

The implementation uses Gmail OAuth, not app passwords.

1. Use the approved Google account/environment for `bookings.mythirumanam@gmail.com`.
2. In Google Cloud Console, create or select the OAuth app.
3. Create an OAuth client suitable for the operator token-generation flow.
4. Authorize Gmail send scope for the approved account.
5. Exchange the authorization code for a refresh token.
6. Configure `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN` in Vercel Production.
7. Set `CELEBRATION_BOOKINGS_EMAIL` to `bookings.mythirumanam@gmail.com`.
8. Set `CELEBRATION_EMAIL_FROM` to the authenticated Gmail address or a Gmail-authorized send-as alias.

Notification flow:

DB persisted -> attempt internal email -> email failure logged -> enquiry response still succeeds.

Do not retry the RPC because email failed. The email body must not include DOB, Nakshatra, Rasi, API credentials, or debug data.

## Vercel And Domain Setup

Canonical production domain: `https://mythirumanam.in`.

1. Configure required Production environment variables.
2. Attach `mythirumanam.in` to the Production deployment.
3. Attach `www.mythirumanam.in` only as a redirect source.
4. Configure `https://www.mythirumanam.in/*` -> `https://mythirumanam.in/*`, preserving path and query where supported.
5. Confirm valid TLS certificates for all attached hosts.
6. Confirm HTTP redirects to HTTPS.

## Deployment Order

1. Identify production Supabase project.
2. Backup/confirm recovery capability.
3. Review and apply required migration.
4. Verify tables/RPC/RLS/services.
5. Configure Turnstile production widget.
6. Configure Upstash.
7. Configure Gmail OAuth notification variables.
8. Configure required Vercel Production environment variables.
9. Attach `mythirumanam.in` domain.
10. Configure `www` redirect.
11. Deploy production branch.
12. Verify HTTPS.
13. Run manual page smoke checks.
14. Submit one controlled Celebration enquiry.
15. Verify DB persistence.
16. Verify selected service relationships.
17. Verify booking email.
18. Review production logs for sensitive information/errors.
19. Announce site publicly only after successful verification.

## Manual Page Smoke Checks

Check without browser automation:

- Home page loads, header/footer render, primary CTAs work.
- 60th Marriage, 70th Marriage, and 80th Marriage pages load with correct canonical route and planning CTA.
- About, Gallery, Terms, Privacy, and Contact pages load truthfully.
- Blog listing and published articles load if currently published.
- Matrimony gateway loads and routes to expected auth/account flow.
- Header navigation works on desktop.
- Mobile menu opens, links work, and closes cleanly.
- Footer links route correctly.
- `/plan` is reachable from internal CTAs, but remains noindex and absent from sitemap.

## Controlled Enquiry Test

Submit exactly one production test enquiry with clearly identifiable harmless test information suitable for later deletion.

Validate:

- Service list loads.
- Ceremony preselection works from ceremony pages.
- DOB/date rules reject invalid dates and allow valid dates.
- Terms/Privacy checkbox is required.
- Turnstile challenge completes.
- Submission succeeds once and returns an enquiry ID.

After submission:

```sql
select *
from public.celebration_enquiries
where id = '<returned-enquiry-id>';

select *
from public.celebration_enquiry_services
where enquiry_id = '<returned-enquiry-id>';
```

Confirm exactly one enquiry row and the expected service relationship rows. If cleanup is performed, use a deliberate admin/database procedure; do not add application hard-delete behavior for this test.

## Production Log Review

After the controlled test, verify logs do not contain:

- `SUPABASE_SERVICE_ROLE_KEY`
- Turnstile secret or token
- Gmail OAuth secrets
- Upstash token
- DOB
- Nakshatra/Rasi
- Full notes

Operational enquiry ID is acceptable.

## Rollback Considerations

- Keep the previous production deployment available in Vercel for immediate rollback.
- Confirm Supabase backup/recovery before applying the migration.
- If domain or TLS fails, keep public announcement paused and revert DNS/domain routing as needed.
- If Turnstile, Upstash, or Gmail is misconfigured, fix environment configuration and redeploy; do not weaken RLS or bypass bot/rate protections for launch.

## GO / NO-GO

GO only when all are true:

- Production build passes.
- `/plan` and `/ta/plan` if later implemented are noindex and absent from sitemap.
- Production Supabase tables, RPC, RLS, grants, and 14 active services are verified.
- Turnstile succeeds on the production hostname.
- Rate limiter is configured and accepts the controlled test.
- Controlled enquiry persists exactly once with expected selected-service rows.
- Booking email is received exactly once at `bookings.mythirumanam@gmail.com`.
- HTTPS and canonical domain are working.
- Production logs show no critical errors or sensitive data.

NO-GO if any are true:

- Production environment points at the wrong Supabase project.
- Required secrets are missing or exposed publicly.
- RLS/grants allow public access to private enquiry tables.
- RPC is missing or does not match the application contract.
- Active service catalogue is missing, duplicated, or not exactly the expected production set.
- Turnstile or Upstash fails in production.
- Controlled enquiry creates duplicates or fails persistence.
- Booking email is missing, duplicated, or contains sensitive DOB/Nakshatra/Rasi/debug data.
- Canonical HTTPS domain or `www` redirect is not correct.
- Production logs contain secrets or sensitive enquiry details.

Post-launch work, kept separate from go-live:

- Property Management
- Hotel/Hall public experience
- Approved Gallery photographs
- Business Call/WhatsApp
- WhatsApp automation
- Additional content
