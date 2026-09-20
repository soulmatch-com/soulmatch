import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../database/migrations/20260920_fix_blog_cms_admin_ownership_fk.sql', import.meta.url), 'utf8')
const verifier = await readFile(new URL('../database/verification/verify_blog_cms_admin_ownership_fk.sql', import.meta.url), 'utf8')
const repository = await readFile(new URL('../src/lib/blog/admin-blog-repository.ts', import.meta.url), 'utf8')
const auth = await readFile(new URL('../src/lib/admin-auth.ts', import.meta.url), 'utf8')

test('forward-only corrective migration aligns CMS ownership FKs with verified public.admins identities', () => {
  assert.match(migration, /begin;[\s\S]*commit;/i)
  assert.match(migration, /drop constraint if exists blog_posts_created_by_fkey/)
  assert.match(migration, /drop constraint if exists blog_posts_updated_by_fkey/)
  assert.match(migration, /foreign key \(created_by\) references public\.admins\(id\) on delete set null/)
  assert.match(migration, /foreign key \(updated_by\) references public\.admins\(id\) on delete set null/)
  assert.doesNotMatch(migration, /truncate|delete\s+from|drop table/i)
})

test('repository audit fields use the same verified admin identity returned by requireActiveAdmin', () => {
  assert.match(auth, /from\('admins'\)/)
  assert.match(repository, /created_by: admin\.id, updated_by: admin\.id/)
  assert.match(repository, /updated_by: admin\.id/)
  assert.doesNotMatch(repository, /created_by: input|updated_by: input/)
})

test('ownership verifier is read-only and checks both deployed constraint definitions', () => {
  assert.match(verifier, /pg_get_constraintdef/)
  assert.match(verifier, /blog_posts_created_by_fkey/)
  assert.match(verifier, /blog_posts_updated_by_fkey/)
  assert.doesNotMatch(verifier, /\b(?:insert|update|delete|truncate|alter|drop|create)\b/i)
})
