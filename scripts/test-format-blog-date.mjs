import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const { formatBlogDate } = await import('../src/lib/blog/format-blog-date.ts')
const listing = await readFile(new URL('../src/components/blog/BlogListing.tsx', import.meta.url), 'utf8')
const legacyArticle = await readFile(new URL('../src/components/blog/BlogArticlePage.tsx', import.meta.url), 'utf8')
const cmsArticle = await readFile(new URL('../src/components/blog/CmsBlogArticlePage.tsx', import.meta.url), 'utf8')
const seo = await readFile(new URL('../src/lib/blog/public-blog-seo.ts', import.meta.url), 'utf8')

test('formats the supplied ISO timestamp in English using Asia/Kolkata', () => {
  assert.equal(formatBlogDate('2026-09-20T03:54:59.75+00:00', 'en'), '20 September 2026')
})

test('formats Tamil dates with the platform Tamil locale', () => {
  const result = formatBlogDate('2026-09-20T03:54:59.75+00:00', 'ta')
  assert.match(result, /^20\s+செப்டம்பர்\s+2026$/)
})

test('accepts Date instances and applies the India timezone at date boundaries', () => {
  assert.equal(formatBlogDate(new Date('2026-09-19T20:00:00.000Z'), 'en'), '20 September 2026')
})

test('invalid or null-like values produce no visible invalid-date text', () => {
  assert.equal(formatBlogDate('not-a-date', 'en'), '')
  assert.equal(formatBlogDate(null, 'ta'), '')
})

test('all public blog visible date surfaces use the shared formatter', () => {
  assert.match(listing, /formatBlogDate\(article\.publishedAt, locale\)/)
  assert.match(legacyArticle, /formatBlogDate\(article\.publishedAt, article\.locale\)/)
  assert.match(cmsArticle, /formatBlogDate\(article\.publishedAt, article\.locale\)/)
  assert.doesNotMatch(listing, /\{article\.publishedAt\}<\/time>/)
  assert.doesNotMatch(cmsArticle, /\{article\.publishedAt\}<\/time>/)
})

test('SEO and structured-data dates remain machine-readable stored timestamps', () => {
  assert.match(seo, /datePublished: article\.publishedAt/)
  assert.match(seo, /dateModified: article\.updatedAt/)
  assert.doesNotMatch(seo, /formatBlogDate/)
})
