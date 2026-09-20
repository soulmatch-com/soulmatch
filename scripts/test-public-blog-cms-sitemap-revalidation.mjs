import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sitemap = await readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8')
const source = await readFile(new URL('../src/lib/blog/public-blog-source.ts', import.meta.url), 'utf8')
const revalidation = await readFile(new URL('../src/lib/blog/public-blog-revalidation.ts', import.meta.url), 'utf8')
const repository = await readFile(new URL('../src/lib/blog/admin-blog-repository.ts', import.meta.url), 'utf8')

test('sitemap preserves intentional static routes and keeps /plan excluded', () => {
  for (const path of ["'/'", "'/60th-marriage'", "'/70th-marriage'", "'/80th-marriage'", "'/about'", "'/gallery'", "'/contact'", "'/blog'", "'/ta/blog'"]) assert.ok(sitemap.includes(path))
  assert.doesNotMatch(sitemap, /'\/plan'/)
})

test('sitemap uses the shared public source selector and never queries CMS directly', () => {
  assert.match(sitemap, /await getPublicBlogEntriesForSitemap\(\)/)
  assert.doesNotMatch(sitemap, /BLOG_CMS_PUBLIC_ENABLED|public-blog-repository|content\/blog\/articles/)
  assert.match(source, /if \(isPublicBlogCmsEnabled\(\)\) \{\s*const entries = await getPublishedBlogEntriesForSitemap\(\)/)
  assert.match(source, /getPublishedBlogArticles\(locale\)/)
})

test('CMS sitemap entries are locale-specific, use stored updatedAt, and cannot mix legacy records', () => {
  assert.match(source, /path: getPublicBlogPath\(entry\.locale, entry\.slug\)/)
  assert.match(source, /updatedAt: entry\.updatedAt/)
  assert.match(source, /if \(isPublicBlogCmsEnabled\(\)\) \{[\s\S]*?return entries\.map[\s\S]*?\n  \}/)
  assert.doesNotMatch(source, /new Date\(/)
})

test('an enabled CMS sitemap read failure cannot silently fall back to legacy article entries', () => {
  const cmsSection = source.slice(source.indexOf('export async function getPublicBlogEntriesForSitemap'), source.indexOf('export async function getPublicBlogStaticSlugs'))
  assert.match(cmsSection, /if \(isPublicBlogCmsEnabled\(\)\)/)
  assert.doesNotMatch(cmsSection, /\b(?:catch|try)\b/)
})

test('sitemap de-duplicates static and article URLs without synthetic lastModified values', () => {
  assert.match(sitemap, /const seen = new Set<string>\(\)/)
  assert.match(sitemap, /if \(seen\.has\(url\)\) return \[\]/)
  assert.match(sitemap, /\.\.\.\(updatedAt \? \{ lastModified: updatedAt \} : \{\}\)/)
  assert.doesNotMatch(sitemap, /new Date\(/)
})

test('CMS revalidation is server-only, feature-flagged, and includes the locale index/article/sitemap', () => {
  assert.match(revalidation, /import 'server-only'/)
  assert.match(revalidation, /if \(!isPublicBlogCmsEnabled\(\)\) return/)
  assert.match(revalidation, /locale === 'en' \? '\/blog' : '\/ta\/blog'/)
  assert.match(revalidation, /articlePath\(locale, slug\)/)
  assert.match(revalidation, /'\/sitemap\.xml'/)
  assert.match(revalidation, /revalidatePath\(path\)/)
})

test('counterpart articles are invalidated only when needed for reciprocal hreflang', () => {
  assert.match(revalidation, /counterpartPublished \? \[articlePath\(counterpart, slug\)\] : \[\]/)
  assert.match(repository, /counterpartPublished: current\.translations\.some\(\(item\) => item\.locale !== locale && item\.status === 'published'\)/)
  assert.match(repository, /counterpartPublished: current\.translations\.some\(\(item\) => item\.id !== translation\.id && item\.status === 'published'\)/)
})

test('only published translation edits trigger CMS public invalidation; draft creation does not', () => {
  const createSection = repository.slice(repository.indexOf('export async function createBlogDraft'), repository.indexOf('export async function updateBlog'))
  const updateSection = repository.slice(repository.indexOf('export async function updateBlog'), repository.indexOf('export async function publishBlogTranslation'))
  assert.doesNotMatch(createSection, /revalidatePublishedCmsBlog/)
  assert.match(updateSection, /if \(existing\?\.status === 'published'\)/)
  assert.match(updateSection, /revalidatePublishedCmsBlog\(/)
})

test('publish and unpublish invoke server-side public revalidation only after successful persistence', () => {
  const publishSection = repository.slice(repository.indexOf('export async function publishBlogTranslation'), repository.indexOf('export async function unpublishBlogTranslation'))
  const unpublishSection = repository.slice(repository.indexOf('export async function unpublishBlogTranslation'))
  assert.ok(publishSection.indexOf('if (error || !post) throw') < publishSection.indexOf('revalidatePublishedCmsBlog'))
  assert.ok(unpublishSection.indexOf('if (error || !post) throw') < unpublishSection.indexOf('revalidatePublishedCmsBlog'))
  assert.match(revalidation, /console\.error\('CMS public blog revalidation failed'\)/)
})
