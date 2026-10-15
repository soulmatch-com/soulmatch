# Phase 5C readiness decision

Date: 2026-10-14  
Decision: **Not Accepted** for Phase 5C runtime/staging acceptance.

## What is accepted

Phase 5C.1 is **Prepared**: the repository was inspected without external access; reusable Vercel/Next.js/environment/security configuration, isolated resource requirements, key-only staging environment template, cost references, database gate, deployment runbook, HTTPS test matrix, and approval checklist are documented. This is planning acceptance only.

## Why runtime acceptance is blocked

1. No staging environment, owner, hostname, target inventory, access authorization, or approved deployment was confirmed.
2. No browser-trusted HTTPS endpoint exists in the available evidence; Secure-cookie behavior cannot be accepted from HTTP loopback tests.
3. Authenticated booking, payment/refund/reversal, and protected PDF tests remain outstanding under production-mode staging configuration.
4. Staging Supabase/RLS catalogue verification, database identity, backup/restore ownership, schema comparison, ledger review, and migration-history reconciliation approval are absent.
5. Staging monitoring, alert/triage ownership, and sensitive-data redaction checks are absent.
6. Representative end-to-end smoke tests and fixture cleanup cannot run before authorized deployment and approved test data exist.

## Phase 5C.1 resource decision

Required resources are: one approved Vercel staging project/environment, one fixed staging HTTPS hostname, one separate Supabase staging project, one separate Upstash Redis database, approved staging/test identities and external-service credentials, and approved log access. The repository provides configuration templates but no external resource identity, credential, or authorization.

Published reference pricing as of 2026-10-14: Vercel lists Hobby at $0/month and Pro at $20/month; Supabase lists Free at $0/month and Pro at $25/month; Upstash Redis lists Free at $0/month and Fixed 250 MB at $10/month, with pay-as-you-go usage pricing. These are not approved spend commitments and exclude taxes, domains, usage, and optional services. [Vercel](https://vercel.com/pricing), [Supabase](https://supabase.com/pricing), [Upstash](https://upstash.com/pricing/redis).

## Required approvals / credentials

| Owner | Required approval or controlled access |
| --- | --- |
| Platform/Vercel owner | Staging project/environment, deployer authorization, secret scope configuration, deployment approval, build/log access. |
| DNS/domain owner | Fixed staging hostname and DNS/TLS authorization. |
| Supabase database owner | Separate staging project identity, least-privilege access, backup/restore ownership, baseline/ledger comparison, and any migration reconciliation/migration approval. |
| Redis/Upstash owner | Separate staging store and scoped credentials. |
| Security owner | Test authorization, synthetic records, CSP report review, browser test operator, and financial/provider test limits. |
| Operations/observability owner | Approved log/monitoring access, retention, redaction verification, and incident escalation path. |

Execution order: platform/DNS/database/Redis/security owners authorize and identify isolated resources; database owner completes backup, baseline, ledger, and reconciliation gates; platform owner configures approved staging secrets and deploys the approved commit; security/QA completes HTTPS and production-mode tests; fixture and database owners clean up and verify integrity; release owner records the decision.

## Acceptance criteria for a future decision

Phase 5C may be accepted only when the completed checklist demonstrates: approved isolated deployment; trusted HTTPS; Secure-cookie browser validation; authenticated security regression; database integrity and approved migration treatment; public catalogue/RLS and failure recovery; monitoring/redaction; representative smoke tests; and scoped fixture cleanup. Any unresolved database history requires a block on staging schema changes, not a fabricated migration ledger.

No production deployment, production secret, unauthorized remote action, database reset/truncation, TLS exception, Secure-cookie bypass, RLS weakening, or financial RPC modification is authorized by this readiness decision.
