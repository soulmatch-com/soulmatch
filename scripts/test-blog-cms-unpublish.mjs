import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/lib/blog/admin-blog-repository.ts', import.meta.url), 'utf8')
const operation = source.slice(source.indexOf('export async function unpublishBlogTranslation'))

test('unpublishBlogTranslation is server-only, admin-authorized, and validates blog and locale input', () => {
  assert.match(source, /import 'server-only'/)
  assert.match(operation, /export async function unpublishBlogTranslation\(blogId: string, localeInput: unknown\)/)
  assert.match(operation, /const admin = await authorize\(\)/)
  assert.match(operation, /const locale = blogLocaleSchema\.parse\(localeInput\)/)
  assert.match(operation, /\^\[0-9a-f-\]\{36\}\$/i)
  assert.match(operation, /updated_by: admin\.id/)
})

test('unpublishBlogTranslation safely handles missing blogs and translations without language fallback', () => {
  assert.match(operation, /BLOG_NOT_FOUND/)
  assert.match(operation, /'Blog not found\.'/)
  assert.match(operation, /TRANSLATION_NOT_FOUND/)
  assert.match(operation, /'Blog translation not found\.'/)
  assert.match(operation, /find\(\(item\) => item\.locale === locale\)/)
})

test('unpublish changes only the requested translation status and preserves its content fields', () => {
  assert.match(operation, /if \(translation\.status !== 'draft'\) \{/)
  assert.match(operation, /\.update\(\{ status: 'draft' \}\)\.eq\('id', translation\.id\)/)
  assert.doesNotMatch(operation, /blog_post_translations'\)\.delete/)
  assert.doesNotMatch(operation, /\.update\(\{[^}]*?(?:title|excerpt|content|seo_title|meta_description)/)
})

test('unpublish derives aggregate post status from the other locale and reconciles idempotent calls', () => {
  assert.match(operation, /const postStatus: CmsBlogStatus = current\.translations\.some\(\(item\) => item\.id !== translation\.id && item\.status === 'published'\) \? 'published' : 'draft'/)
  assert.match(operation, /\.update\(\{ status: postStatus, updated_by: admin\.id \}\)\.eq\('id', blogId\)/)
  assert.match(operation, /translationStatus: 'draft' as const/)
  assert.match(operation, /postStatus, publishedAt: post\.published_at/)
})

test('unpublish preserves first-publication history and maps database failures safely', () => {
  assert.doesNotMatch(operation, /published_at:\s*(?:null|new Date)/)
  assert.match(operation, /UNPUBLISH_FAILED/)
  assert.match(operation, /'Unable to unpublish blog\.'/)
})
