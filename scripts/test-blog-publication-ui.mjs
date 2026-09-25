import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const edit = await readFile(new URL('../src/app/(en)/admin/(protected)/blogs/[id]/edit/page.tsx', import.meta.url), 'utf8')
const controls = await readFile(new URL('../src/components/admin/BlogPublicationControls.tsx', import.meta.url), 'utf8')
const editor = await readFile(new URL('../src/components/admin/BlogEditorForm.tsx', import.meta.url), 'utf8')

test('the server edit page passes actual aggregate and per-locale publication states to the publication UI', () => {
  assert.match(edit, /<BlogPublicationControls blogId=\{blog\.post\.id\} postStatus=\{blog\.post\.status\} publishedAt=\{blog\.post\.published_at\}/)
  assert.match(edit, /english=\{\{ exists: Boolean\(blog\.english\), status: blog\.english\?\.status \?\? 'missing' \}\}/)
  assert.match(edit, /tamil=\{\{ exists: Boolean\(blog\.tamil\), status: blog\.tamil\?\.status \?\? 'missing' \}\}/)
})

test('publication UI independently renders English and Tamil missing, draft, and published states', () => {
  assert.match(controls, /Not Added/)
  assert.match(controls, /Publish \$\{name\}/)
  assert.match(controls, /Unpublish \$\{name\}/)
  assert.match(controls, /\{localeRow\('en', english\)\}/)
  assert.match(controls, /\{localeRow\('ta', tamil\)\}/)
  assert.match(controls, /Post status: \{postStatus === 'published' \? 'Published' : 'Draft'\}/)
})

test('publish calls the locale-specific protected endpoint without client-provided admin identity', () => {
  assert.match(controls, /fetch\(`\/api\/admin\/blogs\/\$\{blogId\}\/\$\{action\}`, \{ method: 'POST'/)
  assert.match(controls, /body: JSON\.stringify\(\{ locale \}\)/)
  assert.doesNotMatch(controls, /(?:created_by|updated_by|adminId|adminEmail)/)
  assert.match(controls, /if \(loadingLocale\) return/)
  assert.match(controls, /Publishing\.\.\./)
  assert.match(controls, /router\.refresh\(\)/)
  assert.match(controls, /article is not ready to publish\. Please complete the required fields and save your changes first\./)
})

test('unpublish is locale-specific, non-destructive in its UI wording, and requires confirmation', () => {
  assert.match(controls, /setConfirmLocale\(locale\)/)
  assert.match(controls, /Unpublish \{confirmLocale \? localeName\(confirmLocale\) : ''\} article\?/) 
  assert.match(controls, /The content will remain saved\./)
  assert.match(controls, /onClick=\{\(\) => setConfirmLocale\(null\)\}/)
  assert.match(controls, /changePublication\(confirmLocale, 'unpublish'\)/)
  assert.match(controls, /Unpublishing\.\.\./)
})

test('first publication history is shown but not editable, and the existing form retains slug lock integration', () => {
  assert.match(controls, /First Published: \{formatDate\(publishedAt\)\}/)
  assert.doesNotMatch(controls, /setPublishedAt|input[^\n]*publishedAt/)
  assert.match(editor, /const slugLocked = Boolean\(blog\?\.publishedAt\)/)
  assert.match(editor, /disabled=\{slugLocked\}/)
})

test('the UI warns that CMS publication does not yet change the code-backed public blog', () => {
  assert.match(controls, /The current public blog remains code-backed until the public integration phase is completed\./)
})
