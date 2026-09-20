import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const repository = await readFile(new URL('../src/lib/blog/public-blog-repository.ts', import.meta.url), 'utf8')
const types = await readFile(new URL('../src/lib/blog/public-blog-types.ts', import.meta.url), 'utf8')
const feature = await readFile(new URL('../src/lib/blog/public-blog-feature.ts', import.meta.url), 'utf8')
const englishBlog = await readFile(new URL('../src/app/(en)/blog/page.tsx', import.meta.url), 'utf8')
const tamilBlog = await readFile(new URL('../src/app/ta/blog/page.tsx', import.meta.url), 'utf8')
const sitemap = await readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8')
const listingSection = repository.slice(repository.indexOf('export async function getPublishedBlogPosts'), repository.indexOf('export async function getPublishedBlogBySlug'))

test('public CMS repository is server-only and defines narrow public result types', () => {
  assert.match(repository, /import 'server-only'/)
  for (const type of ['PublicBlogListItem', 'PublicBlogArticle', 'PublicBlogLocaleAvailability', 'PublicBlogSitemapEntry']) assert.match(types, new RegExp(`export type ${type}`))
  assert.doesNotMatch(types, /created_by|updated_by|admin_id|adminEmail/)
})

test('published listings select locale-specific published translations without Markdown bodies and order by first publication', () => {
  assert.match(repository, /export async function getPublishedBlogPosts/)
  assert.match(listingSection, /\.eq\('locale', locale\.data\)\.eq\('status', 'published'\)\.eq\('blog_posts\.status', 'published'\)/)
  assert.match(listingSection, /select\('locale, status, title, excerpt, updated_at, blog_posts!inner/)
  assert.doesNotMatch(listingSection, /content/)
  assert.match(listingSection, /\.order\('published_at', \{ ascending: false, foreignTable: 'blog_posts' \}\)/)
})

test('published article reads validate slug and locale and return no cross-language fallback for drafts or missing translations', () => {
  assert.match(repository, /export async function getPublishedBlogBySlug/)
  assert.match(repository, /blogSlugSchema\.safeParse\(slugInput\)/)
  assert.match(repository, /blogLocaleSchema\.safeParse\(localeInput\)/)
  assert.match(repository, /if \(!slug\.success \|\| !locale\.success\) return null/)
  assert.match(repository, /\.eq\('locale', locale\.data\)\.eq\('status', 'published'\)/)
  assert.match(repository, /if \(!data\) return null/)
  assert.doesNotMatch(repository, /fallback|locale === 'en' \?[^\n]*'ta'/)
})

test('locale availability and sitemap foundations derive only from published locale rows and stored updated_at', () => {
  assert.match(repository, /export async function getPublishedBlogLocales/)
  assert.match(repository, /return \{ en: locales\.has\('en'\), ta: locales\.has\('ta'\) \}/)
  assert.match(repository, /export async function getPublishedBlogEntriesForSitemap/)
  assert.match(repository, /updatedAt: row\.updated_at/)
  assert.doesNotMatch(repository, /new Date\(/)
})

test('the public CMS feature flag is server-only, deterministic, and disabled unless explicitly true', () => {
  assert.match(feature, /import 'server-only'/)
  assert.match(feature, /process\.env\.BLOG_CMS_PUBLIC_ENABLED === 'true'/)
  assert.doesNotMatch(feature, /NEXT_PUBLIC_BLOG_CMS_PUBLIC_ENABLED/)
})

test('live public routes retain code-source imports and sitemap uses only the server-side source abstraction', () => {
  assert.match(englishBlog, /@\/content\/blog\/articles/)
  assert.match(tamilBlog, /@\/content\/blog\/articles/)
  assert.match(sitemap, /getPublicBlogEntriesForSitemap/)
  assert.doesNotMatch(englishBlog, /public-blog-repository/)
  assert.doesNotMatch(tamilBlog, /public-blog-repository/)
  assert.doesNotMatch(sitemap, /public-blog-repository/)
})
