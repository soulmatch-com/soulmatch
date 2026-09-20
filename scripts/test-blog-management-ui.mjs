import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const list = await readFile(new URL('../src/app/(en)/admin/(protected)/blogs/page.tsx', import.meta.url), 'utf8')
const create = await readFile(new URL('../src/app/(en)/admin/(protected)/blogs/new/page.tsx', import.meta.url), 'utf8')
const form = await readFile(new URL('../src/components/admin/BlogEditorForm.tsx', import.meta.url), 'utf8')
const edit = await readFile(new URL('../src/app/(en)/admin/(protected)/blogs/[id]/edit/page.tsx', import.meta.url), 'utf8')
const createApi = await readFile(new URL('../src/lib/blog/admin-blog-api.ts', import.meta.url), 'utf8')

test('Blog Management is an admin-protected server list using the CMS repository', () => {
  assert.match(list, /await requireActiveAdmin\(\)/)
  assert.match(list, /getAdminBlogPosts\(\{ page, pageSize: 20, status, search \}\)/)
  assert.match(list, /href="\/admin\/blogs\/new"/)
  assert.doesNotMatch(list, /'use client'|fetch\(/)
})

test('Blog Management supports URL-backed search, status filtering, pagination, and empty states', () => {
  assert.match(list, /name="search"/)
  assert.match(list, /name="status"/)
  assert.match(list, /value="draft"/)
  assert.match(list, /value="published"/)
  assert.match(list, /Page \{result\.page\} of \{totalPages\}/)
  assert.match(list, /No blog posts yet\./)
  assert.match(list, /No blogs match your filters\./)
})

test('Blog Management renders aggregate and per-locale status without article Markdown bodies', () => {
  assert.match(list, /LocaleBadge label="EN" status=\{blog\.english\.status\}/)
  assert.match(list, /LocaleBadge label="TA" status=\{blog\.tamil\.status\}/)
  assert.match(list, /StatusBadge status=\{blog\.status\}/)
  assert.match(list, /blog\.english\.title \|\| blog\.tamil\.title \|\| 'Untitled Draft'/)
  assert.doesNotMatch(list, /blog\.english\.content|blog\.tamil\.content/)
})

test('Add Blog is protected and includes general, English, and Tamil draft fields', () => {
  assert.match(create, /await requireActiveAdmin\(\)/)
  assert.match(create, /Create an English, Tamil or bilingual blog draft\./)
  assert.match(form, /htmlFor="slug"/)
  assert.match(form, /TranslationSection locale="en"/)
  assert.match(form, /TranslationSection locale="ta"/)
  for (const label of ['Title', 'Excerpt', 'SEO Title', 'Meta Description', 'Content']) assert.match(form, new RegExp(`\\$\\{prefix\\} ${label}`))
})

test('Save Draft posts only business fields, handles safe errors, prevents duplicate submits, and redirects to edit', () => {
  assert.match(form, /if \(saving\) return/)
  assert.match(form, /fetch\(isEdit \? `\/api\/admin\/blogs\/\$\{blog\.id\}` : '\/api\/admin\/blogs', \{/)
  assert.match(form, /method: isEdit \? 'PATCH' : 'POST'/)
  assert.match(form, /translations: \[\{ locale: 'en', title: english\.title, excerpt: english\.excerpt/)
  assert.match(form, /\{ locale: 'ta', title: tamil\.title, excerpt: tamil\.excerpt/)
  assert.doesNotMatch(form, /(?:created_by|updated_by|adminId|adminEmail)/)
  assert.match(form, /const message = data\.message === 'Invalid blog details\.'/)
  assert.match(createApi, /DUPLICATE_SLUG: 'A blog with this slug already exists\.'/)
  assert.match(form, /router\.push\(`\/admin\/blogs\/\$\{data\.blogId\}\/edit\?created=1`\)/)
  assert.match(edit, /Draft created successfully\./)
  assert.match(edit, /await requireActiveAdmin\(\)/)
})
