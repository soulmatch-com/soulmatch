# Phase 5B risk register

| Risk | Severity | Owner | Release condition |
|---|---|---|---|
| Missing production `ADMIN_SESSION_SECRET` | high | platform owner | deployment environment validation |
| Admin-login abuse protection | medium | security owner | durable limiter/origin policy approved |
| CSP compatibility | medium | frontend/platform | report-only evidence then enforced policy |
| Production Supabase/RLS/grant drift | medium | database owner | approved read-only production inventory |
| Alerting for auth, rate-limit and payment RPC failures | medium | operations owner | dashboard/alert policy selected |
| Production-like authenticated mutation test needs trusted loopback TLS | medium | platform/security owner | provide a trusted local TLS endpoint or approved staging; do not bypass `Secure` admin cookies |

## Alert policy

| Signal | Threshold | Severity / owner | Context (redacted) |
|---|---|---|---|
| Login failure / limiter denial | 10 in 15 min per hashed network | high / security | route, hash prefix, status |
| Enquiry/catalogue/database failure | 5 in 10 min | high / operations | route, error class, dependency |
| Booking/vendor/task mutation failure | 3 in 10 min | medium / operations | route, operation, status |
| Payment/refund/reversal failure | any unexpected 5xx | critical / finance + operations | booking/payment IDs only, error class |
