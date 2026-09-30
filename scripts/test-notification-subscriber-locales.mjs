import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(new URL('../supabase/migrations/add_notification_subscriber_locales.sql', import.meta.url), 'utf8')

test('subscriber locale migration preserves existing consent and selects every explicitly subscribed locale', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS subscribed_locales TEXT\[\]/)
  assert.match(migration, /SET subscribed_locales = ARRAY\[preferred_locale\]/)
  assert.match(migration, /v_campaign\.locale = ANY\(subscriber\.subscribed_locales\)/)
  assert.match(migration, /subscriber\.status = 'subscribed'/)
  assert.match(migration, /suppression\.released_at IS NULL/)
  assert.match(migration, /REVOKE ALL ON FUNCTION/)
})
