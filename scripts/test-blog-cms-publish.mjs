import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/lib/blog/admin-blog-repository.ts', import.meta.url), 'utf8')

test('publishBlogTranslation is server-only, requires an authenticated admin, and validates the locale', () => {
  assert.match(source, /import 'server-only'/)
  assert.match(source, /export async function publishBlogTranslation\(blogId: string, localeInput: unknown\)/)
  assert.match(source, /const admin = await authorize\(\)/)
  assert.match(source, /const locale = blogLocaleSchema\.parse\(localeInput\)/)
  assert.match(source, /updated_by: admin\.id/)
  assert.doesNotMatch(source, /publishBlogTranslation\([^)]*(?:updated_by|adminId|adminEmail)/)
})

test('publishBlogTranslation maps missing records and invalid publication input to safe domain errors', () => {
  assert.match(source, /BLOG_NOT_FOUND/, 'missing blogs use a safe domain error')
  assert.match(source, /TRANSLATION_NOT_FOUND/, 'missing locales do not fall back')
  assert.match(source, /blogPublishSchema\.parse/, 'existing publication validation is reused')
  assert.match(source, /NOT_READY_TO_PUBLISH/, 'incomplete translations are rejected safely')
  assert.match(source, /PUBLISH_FAILED/, 'database failures are mapped safely')
  assert.match(source, /'Unable to publish blog\.'/)
})

test('English or Tamil publication loads only the requested locale and changes only that translation', () => {
  assert.match(source, /find\(\(item\) => item\.locale === locale\)/)
  assert.match(source, /\.update\(\{ status: 'published' \}\)\.eq\('id', translation\.id\)/)
  assert.doesNotMatch(source, /blog_post_translations'\)\.update\(\{ status: 'published' \}\)\.eq\('post_id', blogId\)/)
  assert.match(source, /translations: \[\{ locale, title: translation\.title/)
})

test('a successful first publication makes the aggregate post published and returns typed publication data', () => {
  assert.match(source, /status: 'published' as const, updated_by: admin\.id/)
  assert.match(source, /current\.post\.published_at \? \{\} : \{ published_at: new Date\(\)\.toISOString\(\) \}/)
  assert.match(source, /blogId, locale, translationStatus: 'published' as const, postStatus: 'published' as const, publishedAt: post\.published_at/)
  assert.match(source, /translationStatus: 'published' as const/)
  assert.match(source, /postStatus: 'published' as const/)
})

test('a second-language or idempotent publish preserves the original first-publication timestamp', () => {
  const timestampUpdate = /current\.post\.published_at \? \{\} : \{ published_at: new Date\(\)\.toISOString\(\) \}/
  assert.match(source, timestampUpdate)
  assert.match(source, /if \(translation\.status !== 'published'\) \{/, 'already-published locales do not need a translation rewrite')
  assert.match(source, /const update = \{ status: 'published' as const, updated_by: admin\.id, \.\.\.\(current\.post\.published_at \? \{\} : \{ published_at: new Date\(\)\.toISOString\(\) \}\) \}/)
})
