import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const setup = await readFile(new URL('SETUP.md', root), 'utf8')
const envExample = await readFile(new URL('.env.example', root), 'utf8')
const publicClient = await readFile(new URL('src/lib/supabase/client.ts', root), 'utf8')
const adminClient = await readFile(new URL('src/lib/supabase/admin.ts', root), 'utf8')

test('setup documentation contains placeholders rather than Supabase credential literals', () => {
  assert.match(setup, /NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>/)
  assert.match(setup, /SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>/)
  assert.doesNotMatch(setup, /eyJ[a-zA-Z0-9_-]{20,}/)
})

test('notification environment documentation keeps scheduler disabled and does not embed token-shaped credentials', () => {
  assert.match(envExample, /NOTIFICATION_SCHEDULER_ENABLED=false/)
  assert.doesNotMatch(envExample, /(re_|whsec_|eyJ)[A-Za-z0-9_-]{20,}/)
})

test('Supabase public and privileged credentials remain separated without JWT-specific parsing', () => {
  assert.match(publicClient, /NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  assert.doesNotMatch(publicClient, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(adminClient, /import 'server-only'/)
  assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(adminClient, /jwt\.decode|split\('\.'/i)
})
