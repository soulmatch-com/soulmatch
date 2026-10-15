import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
const root = new URL('../', import.meta.url); const read = (path) => readFile(new URL(path, root), 'utf8')
test('Phase 3 migration enforces transitions, audit, manual delivery, and terminal edits', async () => {
  const migration = await read('supabase/migrations/20261009130000_phase3_quotation_lifecycle.sql')
  assert.match(migration, /status IN \('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'\)/)
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /An expired quotation cannot be accepted/)
  assert.match(migration, /Terminal quotations cannot be edited/)
  assert.match(migration, /quotation_activity/)
  assert.match(migration, /delivery_kind.*manual/)
})
test('lifecycle and delivery APIs remain server-authorized', async () => {
  const [lifecycle, delivery, update] = await Promise.all([read('src/app/api/admin/quotations/[id]/lifecycle/route.ts'), read('src/app/api/admin/quotations/[id]/deliveries/route.ts'), read('src/app/api/admin/quotations/[id]/route.ts')])
  assert.match(lifecycle, /requireActiveAdmin\(\)/); assert.match(lifecycle, /transition_admin_quotation/)
  assert.match(delivery, /requireActiveAdmin\(\)/); assert.match(delivery, /record_admin_quotation_delivery/)
  assert.match(update, /p_status: null/)
})
