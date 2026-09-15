import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, readdir } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('public API fails closed until environment content approval is explicit', async () => {
  const source = await read('src/app/api/success-stories/route.ts')
  assert.match(source, /SUCCESS_STORIES_PUBLICATION_APPROVED === 'true'/)
  assert.match(source, /stories: \[\], total: 0/)
  assert.match(source, /\.eq\('is_published', true\)/)
  assert.match(source, /\.eq\('status', 'approved'\)/)
})

test('homepage omits the complete section when no approved stories are returned', async () => {
  const source = await read('src/app/(en)/page.tsx')
  assert.doesNotMatch(source, /successStories|Success Stories/)
  assert.doesNotMatch(source, /No success stories available yet/)
  assert.doesNotMatch(source, /fallback stor|sample testimonial|demo testimonial/i)
})

test('test seed records are unpublished by default', async () => {
  const seed = await read('database/test_data/seed_success_stories.sql')
  assert.match(seed, /unpublished test data/)
  assert.doesNotMatch(seed, /\n\s+true,\r?\n\s+true,\r?\n\s+\d+,\r?\n\s+'admin',\r?\n\s+'approved'/)
})

test('test seed is excluded from migrations and deployment automation', async () => {
  const productionFiles = ['package.json', 'vercel.json', 'DEPLOYMENT.md', 'SETUP.md']
  for (const path of productionFiles) assert.doesNotMatch(await read(path), /seed_success_stories|database\/test_data/i)
  const migrations = await readdir(new URL('supabase/migrations/', root))
  for (const migration of migrations.filter((name) => name.endsWith('.sql'))) {
    assert.doesNotMatch(await read(`supabase/migrations/${migration}`), /seed_success_stories|database\/test_data/i)
  }
})

test('admin workflow retains explicit publish and unpublish control', async () => {
  const page = await read('src/app/admin/success-stories/page.tsx')
  const route = await read('src/app/api/admin/success-stories/[id]/route.ts')
  assert.match(page, /togglePublished/)
  assert.match(page, /is_published: !story\.is_published/)
  assert.match(route, /adminSuccessStoryUpdateSchema/)
  assert.match(route, /\.update\(updateData\)/)
})

test('public stories contain no fixed ratings or review structured data', async () => {
  const homepage = await read('src/app/(en)/page.tsx')
  const layout = await read('src/app/(en)/layout.tsx')
  for (const source of [homepage, layout]) {
    assert.doesNotMatch(source, /aggregateRating|reviewRating|ratingValue|Review/i)
    assert.doesNotMatch(source, /<Star[^>]*fill/i)
  }
})

test('celebrations homepage integration remains independent', async () => {
  const homepage = await read('src/app/(en)/celebrations/thirukadaiyur/page.tsx')
  assert.match(homepage, /Celebrate Life&apos;s Sacred Milestones at Thirukadaiyur/)
  assert.match(await read('src/components/celebrations/CelebrationCTA.tsx'), /'\/plan'/)
})
