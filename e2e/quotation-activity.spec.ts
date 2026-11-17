import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

async function fixture() {
  const values = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
  const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json'])
  const status = JSON.parse(stdout)
  if (status.linked_project || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(values.NEXT_PUBLIC_SUPABASE_URL || '') || status.API_URL !== values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Quotation activity tests require verified local Supabase')
  const db = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8')) as { id: string; email: string; password: string }
  const { data: services, error } = await db.from('celebration_services').select('id').eq('is_active', true).limit(1)
  expect(error).toBeNull(); expect(services).toHaveLength(1)
  const ids: string[] = []
  const marker = `ACTIVITY-${crypto.randomUUID().slice(0, 8)}`
  const numbers = [`${marker}-CURRENT`, `${marker}-OTHER`]
  async function cleanup() { if (ids.length) expect((await db.from('quotations').delete().in('id', ids)).error).toBeNull() }
  try {
    for (const number of numbers) {
      const { data, error } = await db.rpc('create_admin_quotation', { p_quotation_number: number, p_valid_until: '2099-01-01', p_notes: marker, p_created_by: admin.id, p_items: [{ service_id: services![0].id, quantity: 1, unit_price: 1000 }], p_lead_ids: [] })
      expect(error).toBeNull(); ids.push(data as string)
    }
    return { db, admin, ids, numbers, cleanup }
  } catch (error) { await cleanup(); throw error }
}

async function openEditor(page: Page, id: string) {
  await page.goto(`/admin/quotations/${id}/edit`)
  await expect(page.getByRole('button', { name: 'Copy quotation number', exact: true })).toBeEnabled()
}

test('history shows only the current quotation, merges delivery details, refreshes and restores focus on mobile', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  const f = await fixture()
  try {
    for (const to of ['sent', 'expired', 'draft']) expect((await f.db.rpc('transition_admin_quotation', { p_quotation_id: f.ids[0], p_to_status: to, p_admin_id: f.admin.id, p_reopen_valid_until: to === 'draft' ? '2099-02-01' : null })).error).toBeNull()
    expect((await f.db.rpc('record_admin_quotation_delivery', { p_quotation_id: f.ids[0], p_recipient_name: 'Current family', p_recipient_contact: 'a-very-long-family-contact-address-to-check-wrapping@example.test', p_channel: 'whatsapp', p_notes: 'Manually recorded handoff for the current quotation.', p_admin_id: f.admin.id })).error).toBeNull()
    expect((await f.db.rpc('record_admin_quotation_delivery', { p_quotation_id: f.ids[1], p_recipient_name: 'Unrelated family', p_recipient_contact: 'unrelated@example.test', p_channel: 'email', p_notes: 'Unrelated delivery', p_admin_id: f.admin.id })).error).toBeNull()
    expect((await page.request.post('/api/admin/auth/login', { headers: { Origin: baseURL! }, data: { email: f.admin.email, password: f.admin.password } })).ok()).toBe(true)
    await page.setViewportSize({ width: 1536, height: 1024 })
    await openEditor(page, f.ids[0])
    const trigger = page.getByRole('button', { name: 'Quotation History' })
    await trigger.click()
    const history = page.getByRole('dialog', { name: 'Quotation activity' })
    const entries = history.getByRole('list', { name: 'Quotation activity timeline' }).getByRole('listitem')
    await expect(entries).toHaveCount(5)
    await expect(history.getByRole('heading', { name: 'Delivery recorded', exact: true })).toHaveCount(1)
    await expect(history.getByText('Current family', { exact: true })).toBeVisible()
    await expect(history.getByText('WhatsApp', { exact: true })).toBeVisible()
    await expect(history.getByText('Manually recorded; delivery is not verified.')).toBeVisible()
    await expect(history.getByText('Valid until 01 Feb 2099')).toBeVisible()
    await expect(entries.last().getByRole('heading', { name: 'Quotation created' })).toBeVisible()
    await expect(history.getByText(f.numbers[1], { exact: true })).toHaveCount(0)
    await expect(history.getByText('Unrelated family', { exact: true })).toHaveCount(0)
    await expect(history.getByRole('combobox')).toHaveCount(0)
    await expect(history.getByRole('button', { name: /Delete|Sent|Approve/ })).toHaveCount(0)
    await expect(history.getByRole('link', { name: 'Download PDF' })).toHaveCount(0)
    await page.screenshot({ path: '.playwright/quotation-activity-desktop.png', fullPage: true })
    await page.keyboard.press('Tab')
    await expect(history.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(history).toBeHidden()
    await expect(trigger).toBeFocused()

    expect((await f.db.rpc('transition_admin_quotation', { p_quotation_id: f.ids[0], p_to_status: 'sent', p_admin_id: f.admin.id })).error).toBeNull()
    await trigger.click()
    await expect(entries).toHaveCount(6)
    await expect(entries.first().getByRole('heading', { name: 'Status changed' })).toBeVisible()
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 700 })
      await expect.poll(() => history.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      const rect = await history.boundingBox()
      expect(rect!.x).toBeGreaterThanOrEqual(0)
      expect(rect!.y).toBeGreaterThanOrEqual(0)
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width)
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(700)
      await expect(history.getByRole('button', { name: 'Close', exact: true })).toBeInViewport()
      if (width === 390) await page.screenshot({ path: '.playwright/quotation-activity-mobile.png', fullPage: true })
    }
    await history.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(trigger).toBeFocused()
    await openEditor(page, f.ids[1])
    await page.getByRole('button', { name: 'Quotation History' }).click()
    await expect(history.getByText('Unrelated family', { exact: true })).toBeVisible()
    await expect(history.getByText('Current family', { exact: true })).toHaveCount(0)
  } finally { await f.cleanup() }
})

test('activity handles loading and retry, shows creation for a new draft, and labels calculated expiry', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  const f = await fixture()
  try {
    expect((await page.request.post('/api/admin/auth/login', { headers: { Origin: baseURL! }, data: { email: f.admin.email, password: f.admin.password } })).ok()).toBe(true)
    await openEditor(page, f.ids[0])
    await expect(page.getByRole('button', { name: 'Sent', exact: true })).toBeVisible()
    const path = `**/api/admin/quotations/${f.ids[0]}/lifecycle`
    let fail = true
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route(path, async route => {
      if (route.request().method() !== 'GET') return route.continue()
      if (fail) { await gate; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Activity temporarily unavailable' }) }) }
      return route.continue()
    })
    const trigger = page.getByRole('button', { name: 'Quotation History' })
    await trigger.click()
    const history = page.getByRole('dialog', { name: 'Quotation activity' })
    await expect(history.getByRole('status')).toContainText('Loading quotation activity')
    release()
    await expect(history.getByRole('alert')).toContainText('Activity temporarily unavailable')
    fail = false
    await history.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(history.getByText('No lifecycle changes or deliveries have been recorded yet.')).toBeVisible()
    await expect(history.getByRole('listitem')).toHaveCount(1)
    await expect(history.getByRole('heading', { name: 'Quotation created' })).toBeVisible()
    await history.getByRole('button', { name: 'Close', exact: true }).click()
    await page.unroute(path)

    expect((await f.db.rpc('transition_admin_quotation', { p_quotation_id: f.ids[0], p_to_status: 'sent', p_admin_id: f.admin.id })).error).toBeNull()
    expect((await f.db.from('quotations').update({ valid_until: '2000-01-01' }).eq('id', f.ids[0])).error).toBeNull()
    await trigger.click()
    await expect(history.getByText(/This is a calculated status/)).toBeVisible()
    await expect(history.getByRole('heading', { name: 'Quotation expired', exact: true })).toHaveCount(0)
    await expect(history.getByRole('listitem')).toHaveCount(2)
  } finally { await f.cleanup() }
})
