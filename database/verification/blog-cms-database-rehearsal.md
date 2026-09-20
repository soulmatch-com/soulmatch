# Blog CMS database rehearsal report

## Environment

- Status: approved production **read-only preflight only**; no database write was performed.
- Local Supabase configuration/CLI: not available in this workspace.
- No migration, seed, verifier SQL execution, or runtime repository query was performed.

## Static readiness results

- CMS migration contract: pass — repository columns match `database/migrations/20260919_create_blog_cms.sql`.
- Legacy seed safety: pass — transaction wrapped, preflight slug-conflict abort, no overwrite/reset, nullable historical admin ownership.
- Deterministic generation: pass — generator `--check` matches all generated artifacts.
- Expected inventory: 3 posts, 6 translations (3 English, 3 Tamil), all published.
- URL, date, SEO, language, and Markdown-content parity: pass through generated manifest checks.
- Base and legacy verification SQL: read-only by static inspection.
- Feature flag: remains `BLOG_CMS_PUBLIC_ENABLED=false` by default.

## Runtime rehearsal status

Pending an approved SQL migration workflow/connection for the approved production target. The following were **not** run against any database:

1. CMS schema migration.
2. Base schema verifier.
3. Legacy seed/import.
4. Legacy-content verifier.
5. Second-run conflict test.
6. Public/admin repository database reads.

## Remaining approved-environment sequence

1. Provide an approved production SQL migration workflow/connection.
2. Apply the CMS migration.
3. Run `verify_blog_cms.sql`.
4. Execute the legacy seed.
5. Run `verify_blog_cms_existing_articles.sql`.
6. Confirm 3 posts, 3 English, 3 Tamil, and 6 translations.
7. Confirm second-run conflict abort leaves counts unchanged.
8. Perform manual admin and CMS-mode route checks before considering a feature-flag change.

## Approved Environment Rollout

- Target: **MyThirumanam Production Supabase** (explicitly approved for this CMS database rollout).
- Identity evidence: configured project reference `ggwzyfhvddhemzxsghmy` responded through its authenticated REST endpoint, and the existing application `admins` resource was reachable.
- Pre-migration CMS check: `blog_posts` and `blog_post_translations` both returned the PostgREST missing-resource result; no partial CMS tables or legacy CMS slugs were visible through the approved read-only preflight.
- Migration status: **NOT APPLIED**.
- Seed status: **NOT EXECUTED**.
- Blocker: this workspace has no Supabase CLI, `DATABASE_URL`/Postgres connection, or Supabase Management API credential. A service-role REST key cannot safely execute arbitrary DDL or the SQL seed.
- Public state: `BLOG_CMS_PUBLIC_ENABLED` remains false; public routes and sitemap remain code-backed.
