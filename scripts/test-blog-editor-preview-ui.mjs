import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const edit = await readFile(new URL('../src/app/(en)/admin/blogs/[id]/edit/page.tsx', import.meta.url), 'utf8')
const form = await readFile(new URL('../src/components/admin/BlogEditorForm.tsx', import.meta.url), 'utf8')
const preview = await readFile(new URL('../src/app/(en)/admin/blogs/[id]/preview/page.tsx', import.meta.url), 'utf8')

test('Edit Blog is admin-protected, server-loads its post, and pre-fills both locale forms', () => {
  assert.match(edit, /await requireActiveAdmin\(\)/)
  assert.match(edit, /await getAdminBlogById\(id\)/)
  assert.match(edit, /notFound\(\)/)
  assert.match(edit, /translationForm\(blog\.english\)/)
  assert.match(edit, /translationForm\(blog\.tamil\)/)
  assert.match(edit, /mode="edit"/)
  assert.match(edit, /Draft created successfully\./)
})

test('the shared editor supports create and edit modes with independent translation state', () => {
  assert.match(form, /mode\?: 'create' \| 'edit'/)
  assert.match(form, /blog\?\.english \?\? emptyTranslation/)
  assert.match(form, /blog\?\.tamil \?\? emptyTranslation/)
  assert.match(form, /value\.status === 'missing' \? 'Not Added'/)
  assert.match(form, /value\.status === 'published' \? 'Published' : 'Draft'/)
})

test('published history locks the slug while never-published drafts remain editable', () => {
  assert.match(form, /const slugLocked = Boolean\(blog\?\.publishedAt\)/)
  assert.match(form, /disabled=\{slugLocked\}/)
  assert.match(form, /The slug cannot be changed after publication because it is the public article URL\./)
})

test('editing uses PATCH only with editable CMS fields and refreshes after success', () => {
  assert.match(form, /method: isEdit \? 'PATCH' : 'POST'/)
  assert.match(form, /fetch\(isEdit \? `\/api\/admin\/blogs\/\$\{blog\.id\}`/)
  assert.doesNotMatch(form, /(?:created_by|updated_by|adminId|adminEmail|published_at)/)
  assert.match(form, /Changes saved successfully\./)
  assert.match(form, /Please check the highlighted fields\./)
  assert.match(form, /if \(saving\) return/)
  assert.match(form, /router\.refresh\(\)/)
})

test('preview links are locale-specific and remain unavailable for missing translations', () => {
  assert.match(form, /preview\?locale=en/)
  assert.match(form, /preview\?locale=ta/)
  assert.match(form, /value\.status !== 'missing' && meaningful\(value\)/)
  assert.match(form, /Save changes before previewing\./)
})

test('preview is admin-only, noindex/nofollow, locale-validated through the repository, and uses MarkdownArticle', () => {
  assert.match(preview, /await requireActiveAdmin\(\)/)
  assert.match(preview, /getAdminBlogPreview\(id, locale\)/)
  assert.match(preview, /notFound\(\)/)
  assert.match(preview, /robots: adminBlogPreviewRobots/)
  assert.match(preview, /<MarkdownArticle content=\{preview\.content\} \/>/)
  assert.match(preview, /href=\{`\/admin\/blogs\/\$\{preview\.id\}\/edit`\}/)
  assert.doesNotMatch(preview, /canonical|hreflang|alternates/)
})
