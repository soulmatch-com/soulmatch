import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/lib/blog/public-blog-source.ts', import.meta.url), 'utf8')
const englishList = await readFile(new URL('../src/app/(en)/blog/page.tsx', import.meta.url), 'utf8')
const tamilList = await readFile(new URL('../src/app/ta/blog/page.tsx', import.meta.url), 'utf8')
const englishArticle = await readFile(new URL('../src/app/(en)/blog/[slug]/page.tsx', import.meta.url), 'utf8')
const tamilArticle = await readFile(new URL('../src/app/ta/blog/[slug]/page.tsx', import.meta.url), 'utf8')
const seo = await readFile(new URL('../src/lib/blog/public-blog-seo.ts', import.meta.url), 'utf8')
const cmsArticlePage = await readFile(new URL('../src/components/blog/CmsBlogArticlePage.tsx', import.meta.url), 'utf8')
const sitemap = await readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8')

test('the server-only source abstraction selects one source: code when off and CMS when on', () => {
  assert.match(source, /import 'server-only'/)
  assert.match(source, /if \(isPublicBlogCmsEnabled\(\)\) return getPublishedBlogPosts\(locale\)/)
  assert.match(source, /if \(isPublicBlogCmsEnabled\(\)\) \{\s*const article = await getPublishedBlogBySlug\(slug, locale\)/)
  assert.match(source, /getPublishedBlogArticles\(locale\)/)
  assert.match(source, /getPublishedBlogArticle\(locale, slug\)/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_BLOG_CMS_PUBLIC_ENABLED/)
})

test('English and Tamil lists use the source abstraction and preserve the existing listing component', () => {
  assert.match(englishList, /await getPublicBlogPosts\('en'\)/)
  assert.match(tamilList, /await getPublicBlogPosts\('ta'\)/)
  assert.match(englishList, /<BlogListing locale="en" articles=\{articles\} \/>/)
  assert.match(tamilList, /<BlogListing locale="ta" articles=\{articles\} \/>/)
  assert.doesNotMatch(englishList, /public-blog-repository/)
  assert.doesNotMatch(tamilList, /public-blog-repository/)
})

test('CMS article routes are server-rendered, locale-specific, and use notFound without cross-language fallback', () => {
  assert.match(englishArticle, /await getPublicBlogBySlug\(slug, 'en'\)/)
  assert.match(tamilArticle, /await getPublicBlogBySlug\(slug, 'ta'\)/)
  assert.match(englishArticle, /if \(!result\) notFound\(\)/)
  assert.match(tamilArticle, /if \(!result\) notFound\(\)/)
  assert.match(englishArticle, /<CmsBlogArticlePage article=\{result\.article\}/)
  assert.match(tamilArticle, /<CmsBlogArticlePage article=\{result\.article\}/)
})

test('CMS article rendering shares the safe MarkdownArticle renderer and does not expose admin fields', () => {
  assert.match(cmsArticlePage, /import \{ MarkdownArticle \}/)
  assert.match(cmsArticlePage, /<MarkdownArticle content=\{article\.content\} \/>/)
  assert.doesNotMatch(cmsArticlePage, /created_by|updated_by|adminId|adminEmail/)
})

test('CMS metadata uses stored article dates, canonical URL, Open Graph, and existing publisher identity', () => {
  assert.match(seo, /datePublished: article\.publishedAt/)
  assert.match(seo, /dateModified: article\.updatedAt/)
  assert.match(seo, /mainEntityOfPage: url/)
  assert.match(seo, /openGraph:/)
  assert.match(seo, /publisher: \{ '@type': 'Organization', name: 'MyThirumanam' \}/)
  assert.doesNotMatch(seo, /new Date\(/)
})

test('CMS canonical and hreflang metadata only advertise published locales with a conservative x-default', () => {
  assert.match(seo, /return locale === 'en' \? `\/blog\/\$\{slug\}` : `\/ta\/blog\/\$\{slug\}`/)
  assert.match(seo, /available\.en \? \{ en: englishUrl \} : \{\}/)
  assert.match(seo, /available\.ta \? \{ ta: tamilUrl \} : \{\}/)
  assert.match(seo, /available\.en \? \{ 'x-default': englishUrl \} : \{\}/)
})

test('feature-flag rollback keeps static code slugs when off and avoids CMS pre-rendering when on', () => {
  assert.match(source, /if \(isPublicBlogCmsEnabled\(\)\) return \[\] as Array<\{ slug: string \}>/)
  assert.match(source, /return getPublishedBlogArticles\(locale\)\.map/)
  assert.match(englishArticle, /getPublicBlogStaticSlugs\('en'\)/)
  assert.match(tamilArticle, /getPublicBlogStaticSlugs\('ta'\)/)
})

test('sitemap delegates to the same server-only source selector rather than querying either inventory directly', () => {
  assert.match(sitemap, /getPublicBlogEntriesForSitemap/)
  assert.doesNotMatch(sitemap, /getPublishedBlogEntriesForSitemap|public-blog-repository|content\/blog\/articles/)
})
