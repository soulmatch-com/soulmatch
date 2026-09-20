import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const files = {
  create: await readFile(new URL('../src/app/api/admin/blogs/route.ts', import.meta.url), 'utf8'),
  update: await readFile(new URL('../src/app/api/admin/blogs/[id]/route.ts', import.meta.url), 'utf8'),
  publish: await readFile(new URL('../src/app/api/admin/blogs/[id]/publish/route.ts', import.meta.url), 'utf8'),
  unpublish: await readFile(new URL('../src/app/api/admin/blogs/[id]/unpublish/route.ts', import.meta.url), 'utf8'),
  errors: await readFile(new URL('../src/lib/blog/admin-blog-api.ts', import.meta.url), 'utf8'),
}

test('all CMS mutation handlers are protected before they parse or mutate request data', () => {
  for (const source of [files.create, files.update, files.publish, files.unpublish]) {
    assert.match(source, /const authorization = await requireActiveAdmin\(\)/)
    assert.match(source, /if \('response' in authorization\) return authorization\.response/)
  }
})

test('create and update validate drafts and delegate to the repository without accepting trusted admin fields', () => {
  assert.match(files.create, /blogDraftSchema\.safeParse\(body\)/)
  assert.match(files.create, /createBlogDraft\(parsed\.data\)/)
  assert.match(files.create, /blogId: blog\.id/)
  assert.match(files.update, /blogIdSchema\.parse\(id\)/)
  assert.match(files.update, /blogDraftSchema\.safeParse\(body\)/)
  assert.match(files.update, /updateBlog\(blogId, parsed\.data\)/)
  for (const source of [files.create, files.update]) assert.doesNotMatch(source, /(?:created_by|updated_by|adminId|adminEmail)/)
})

test('publish exposes locale-specific publication through the repository only', () => {
  assert.match(files.publish, /blogLocaleSchema\.parse\(body\?\.locale\)/)
  assert.match(files.publish, /publishBlogTranslation\(blogId, locale\)/)
  assert.match(files.publish, /localeMessage\(locale, 'published'\)/)
  assert.doesNotMatch(files.publish, /\.from\('blog_posts'\)|\.from\('blog_post_translations'\)/)
})

test('unpublish exposes locale-specific non-destructive repository mutation only', () => {
  assert.match(files.unpublish, /blogLocaleSchema\.parse\(body\?\.locale\)/)
  assert.match(files.unpublish, /unpublishBlogTranslation\(blogId, locale\)/)
  assert.match(files.unpublish, /localeMessage\(locale, 'unpublished'\)/)
  assert.doesNotMatch(files.unpublish, /\.delete\(|\.from\('blog_posts'\)|\.from\('blog_post_translations'\)/)
})

test('mutation errors are mapped to safe HTTP responses without database details', () => {
  assert.match(files.errors, /BLOG_NOT_FOUND: 404/)
  assert.match(files.errors, /TRANSLATION_NOT_FOUND: 404/)
  assert.match(files.errors, /DUPLICATE_SLUG: 409/)
  assert.match(files.errors, /PUBLISHED_SLUG_LOCKED: 409/)
  assert.match(files.errors, /NOT_READY_TO_PUBLISH: 400/)
  assert.match(files.errors, /PUBLISH_FAILED: 500/)
  assert.match(files.errors, /UNPUBLISH_FAILED: 500/)
  assert.doesNotMatch(files.errors, /error\.message|SQLSTATE|constraint|service_role/)
})
