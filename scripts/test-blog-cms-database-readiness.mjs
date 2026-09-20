import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../database/migrations/20260919_create_blog_cms.sql', import.meta.url), 'utf8')
const seed = await readFile(new URL('../database/seeds/20260919_blog_cms_existing_articles.sql', import.meta.url), 'utf8')
const baseVerifier = await readFile(new URL('../database/verification/verify_blog_cms.sql', import.meta.url), 'utf8')
const legacyVerifier = await readFile(new URL('../database/verification/verify_blog_cms_existing_articles.sql', import.meta.url), 'utf8')
const report = await readFile(new URL('../database/verification/blog-cms-database-rehearsal.md', import.meta.url), 'utf8')
const adminRepository = await readFile(new URL('../src/lib/blog/admin-blog-repository.ts', import.meta.url), 'utf8')
const publicRepository = await readFile(new URL('../src/lib/blog/public-blog-repository.ts', import.meta.url), 'utf8')
const feature = await readFile(new URL('../src/lib/blog/public-blog-feature.ts', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('./generated/blog-cms-migration-manifest.json', import.meta.url), 'utf8'))

test('migration contains every post and translation column used by the repositories', () => {
  for (const column of ['id', 'slug', 'status', 'featured_image_url', 'featured_image_alt', 'published_at', 'created_by', 'updated_by', 'created_at', 'updated_at']) assert.match(migration, new RegExp(`\\b${column}\\b`))
  for (const column of ['id', 'post_id', 'locale', 'status', 'title', 'excerpt', 'content', 'seo_title', 'meta_description', 'published_at', 'created_at', 'updated_at']) assert.match(migration, new RegExp(`\\b${column}\\b`))
  assert.match(migration, /created_by uuid references auth\.users\(id\)/)
  assert.match(migration, /updated_by uuid references auth\.users\(id\)/)
  assert.match(migration, /unique \(post_id, locale\)/)
  assert.match(migration, /slug text not null unique/)
  assert.match(adminRepository, /blog_posts/)
  assert.match(publicRepository, /blog_post_translations/)
})

test('migration supports aggregate post and locale publication statuses plus repository indexes/RLS/grants', () => {
  assert.match(migration, /blog_posts[\s\S]*?status text not null default 'draft' check \(status in \('draft', 'published'\)\)/)
  assert.match(migration, /blog_post_translations[\s\S]*?status text not null default 'draft' check \(status in \('draft', 'published'\)\)/)
  assert.match(migration, /blog_posts_status_published_at_idx/)
  assert.match(migration, /blog_post_translations_locale_status_published_at_idx/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /grant select, insert, update, delete on public\.blog_posts, public\.blog_post_translations to service_role/)
})

test('legacy seed is transaction-safe, conflict-safe, preserves nullable admin ownership, and expects the generated inventory', () => {
  assert.match(seed, /BEGIN;[\s\S]*?COMMIT;/)
  assert.match(seed, /RAISE EXCEPTION 'Legacy blog CMS import conflict/)
  assert.doesNotMatch(seed, /\b(?:TRUNCATE|DELETE\s+FROM|UPDATE\s+public\.)\b/i)
  assert.doesNotMatch(seed, /created_by|updated_by/)
  assert.equal(manifest.length, 3)
  assert.equal(manifest.flatMap((post) => post.locales).length, 6)
  for (const post of manifest) assert.ok(seed.includes(`'${post.slug}'`))
})

test('both verification artifacts are read-only and represent counts, locales, uniqueness, RLS, and grants', () => {
  for (const verifier of [baseVerifier, legacyVerifier]) assert.doesNotMatch(verifier, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/i)
  assert.match(baseVerifier, /information_schema\.tables/)
  assert.match(baseVerifier, /pg_indexes/)
  assert.match(baseVerifier, /pg_constraint/)
  assert.match(baseVerifier, /role_table_grants/)
  assert.match(legacyVerifier, /imported_post_count/)
  assert.match(legacyVerifier, /imported_translation_count/)
  assert.match(legacyVerifier, /invalid_post_publication_count/)
  assert.match(legacyVerifier, /duplicate_translation_count/)
})

test('public CMS flag remains server-only and disabled unless exactly true', () => {
  assert.match(feature, /import 'server-only'/)
  assert.match(feature, /process\.env\.BLOG_CMS_PUBLIC_ENABLED === 'true'/)
  assert.doesNotMatch(feature, /NEXT_PUBLIC_BLOG_CMS_PUBLIC_ENABLED/)
})

test('rehearsal report marks runtime database writes as pending and excludes credentials', () => {
  assert.match(report, /no database write was performed/)
  assert.match(report, /no Supabase CLI, `DATABASE_URL`\/Postgres connection, or Supabase Management API credential/)
  assert.match(report, /Runtime rehearsal status[\s\S]*Pending an approved SQL migration workflow\/connection/)
  assert.doesNotMatch(report, /SUPABASE_SERVICE_ROLE_KEY\s*=|postgresql:\/\/|eyJ[a-zA-Z0-9_-]{20,}/)
})

test('approved production rollout notes the verified project reference, read-only preflight, and safe SQL-execution blocker', () => {
  assert.match(report, /MyThirumanam Production Supabase/)
  assert.match(report, /ggwzyfhvddhemzxsghmy/)
  assert.match(report, /blog_posts.*blog_post_translations.*missing-resource/s)
  assert.match(report, /Migration status: \*\*NOT APPLIED\*\*/)
  assert.match(report, /no Supabase CLI, `DATABASE_URL`\/Postgres connection, or Supabase Management API credential/)
})
