import { expect, test, type Page, type Route } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

type Fixture = { marker: string; leadId?: string; quotationId?: string; adminId?: string }
const marker = () => `Scenario C ${crypto.randomUUID()}`
const isoDate = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

function env(text: string) { return Object.fromEntries(text.split('\n').flatMap(line => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/); return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [] })) }
async function localDb(): Promise<SupabaseClient> {
  const values = env(await readFile('.env.local', 'utf8')), url = values.NEXT_PUBLIC_SUPABASE_URL, key = values.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) throw new Error('Refusing E2E setup without loopback local Supabase credentials')
  const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json'], { maxBuffer: 1024 * 1024 }); const status = JSON.parse(stdout) as { API_URL?: string; linked_project?: unknown }
  if (!status.API_URL || status.linked_project || new URL(status.API_URL).origin !== new URL(url).origin) throw new Error('Refusing E2E setup against an unverified local Supabase instance')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
async function createFixture(expired = false): Promise<Fixture> {
  const fixture: Fixture = { marker: marker() }, db = await localDb()
  const { data: admins, error: adminError } = await db.from('admins').select('id').limit(1); expect(adminError).toBeNull(); expect(admins).toHaveLength(1); fixture.adminId = admins![0].id
  const { data: lead, error: leadError } = await db.from('leads').insert({ source: 'call', status: 'new', contact_name: fixture.marker, mobile: '9876543210' }).select('id').single(); expect(leadError).toBeNull(); fixture.leadId = lead!.id
  const { data: services, error: serviceError } = await db.from('celebration_services').select('id').eq('is_active', true).limit(1); expect(serviceError).toBeNull(); expect(services).toHaveLength(1)
  const { data: quotationId, error: quotationError } = await db.rpc('create_admin_quotation', { p_quotation_number: `SC-C-${crypto.randomUUID().slice(0, 8)}`, p_valid_until: isoDate(14), p_notes: fixture.marker, p_created_by: fixture.adminId, p_items: [{ service_id: services![0].id, quantity: 1, unit_price: 12500 }], p_lead_ids: [fixture.leadId] })
  expect(quotationError).toBeNull(); fixture.quotationId = quotationId as string
  if (expired) {
    const { error: sentError } = await db.rpc('transition_admin_quotation', { p_quotation_id: fixture.quotationId, p_to_status: 'sent', p_admin_id: fixture.adminId, p_reopen_valid_until: null }); expect(sentError).toBeNull()
    const { error: expirySetupError } = await db.from('quotations').update({ valid_until: isoDate(-1) }).eq('id', fixture.quotationId); expect(expirySetupError).toBeNull()
  }
  return fixture
}
async function cleanup(fixture: Fixture) {
  const db = await localDb()
  if (fixture.quotationId) { const { error } = await db.from('quotations').delete().eq('id', fixture.quotationId); expect(error).toBeNull() }
  if (fixture.leadId) { const { error } = await db.from('leads').delete().eq('id', fixture.leadId).eq('contact_name', fixture.marker); expect(error).toBeNull() }
}
async function signIn(page: Page) {
  const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8')) as { email: string; password: string }
  await page.goto('/admin/login'); await page.getByLabel('Email').fill(admin.email); await page.getByLabel('Password').fill(admin.password); await page.getByRole('button', { name: 'Sign in as Admin' }).click(); await expect(page).toHaveURL(/\/admin\/dashboard$/)
}
async function openLifecycle(page: Page, fixture: Fixture) { await signIn(page); await page.goto(`/admin/quotations/${fixture.quotationId}/edit`); await expect(page.getByRole('heading', { name: 'Lifecycle' })).toBeVisible() }
const lifecycleUrl = (fixture: Fixture, url: string) => url.includes(`/api/admin/quotations/${fixture.quotationId}/lifecycle`)
const lifecyclePost = (fixture: Fixture) => (url: URL) => lifecycleUrl(fixture, url.toString())
async function fulfillError(route: Route, status: number, error: string) { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error }) }) }

test('E2E-1B handles a genuine stale lifecycle transition conflict and refreshes allowed actions', async ({ page }) => {
  test.setTimeout(90_000); const fixture = await createFixture()
  try {
    await openLifecycle(page, fixture); await page.getByRole('button', { name: 'Sent', exact: true }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible()
    const db = await localDb(); const { error } = await db.rpc('transition_admin_quotation', { p_quotation_id: fixture.quotationId, p_to_status: 'sent', p_admin_id: fixture.adminId, p_reopen_valid_until: null }); expect(error).toBeNull()
    const response = page.waitForResponse(response => lifecycleUrl(fixture, response.url()) && response.request().method() === 'POST'); await dialog.getByRole('button', { name: 'Confirm' }).click(); expect((await response).status()).toBe(409)
    await expect(dialog.getByRole('alert')).toContainText('Status transition is not allowed'); await dialog.getByRole('button', { name: 'Cancel' }).click(); await expect(page.getByText('Status:').getByText('Sent')).toBeVisible(); await expect(page.getByRole('button', { name: 'Sent', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible()
    const { data: activity } = await db.from('quotation_activity').select('event_type').eq('quotation_id', fixture.quotationId); expect(activity?.filter(item => item.event_type === 'status_transition')).toHaveLength(1)
  } finally { await cleanup(fixture) }
})

test('E2E-1C lifecycle dialog traps focus, dismisses safely, returns focus, and prevents duplicate submit', async ({ page }) => {
  test.setTimeout(90_000); const fixture = await createFixture()
  try {
    await openLifecycle(page, fixture); const trigger = page.getByRole('button', { name: 'Sent', exact: true }); await trigger.focus(); await trigger.press('Enter'); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Tab'); await expect(dialog.locator(':focus')).toHaveCount(1); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused()
    await trigger.click(); await dialog.getByRole('button', { name: 'Cancel' }).click(); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused()
    let requests = 0; let release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve }); await page.route(lifecyclePost(fixture), async route => { requests += 1; await held; await fulfillError(route, 500, 'Temporarily unavailable') })
    await trigger.click(); await dialog.getByRole('button', { name: 'Confirm' }).click(); await expect.poll(() => requests).toBe(1); await expect(dialog.getByRole('button', { name: 'Saving…' })).toBeDisabled(); release(); await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeEnabled(); await expect(dialog.getByRole('alert')).toContainText('Temporarily unavailable'); await expect(dialog).toBeVisible()
  } finally { await cleanup(fixture) }
})

for (const failure of [{ name: '400 validation error', status: 400, error: 'Please check the lifecycle action' }, { name: '500 server error', status: 500, error: 'Unable to change quotation status' }]) {
  test(`E2E-1D handles ${failure.name} without false success and permits retry`, async ({ page }) => {
    const fixture = await createFixture()
    try { await openLifecycle(page, fixture); await page.route(lifecyclePost(fixture), route => fulfillError(route, failure.status, failure.error)); await page.getByRole('button', { name: 'Sent', exact: true }).click(); const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Confirm' }).click(); await expect(page.getByRole('alert')).toContainText(failure.error); await expect(dialog).toBeVisible(); await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeEnabled(); await expect(page.getByText('Status:').getByText('Draft')).toBeVisible() } finally { await cleanup(fixture) }
  })
}

test('E2E-1D handles an aborted lifecycle request without a stuck dialog', async ({ page }) => {
  const fixture = await createFixture()
  try { await openLifecycle(page, fixture); await page.route(lifecyclePost(fixture), route => route.abort('failed')); await page.getByRole('button', { name: 'Sent', exact: true }).click(); const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Confirm' }).click(); await expect(page.getByRole('alert')).toContainText('Failed to fetch'); await expect(dialog).toBeVisible(); await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeEnabled(); await expect(page.getByText('Status:').getByText('Draft')).toBeVisible() } finally { await cleanup(fixture) }
})

test('E2E-1E derives expiry, rejects invalid renewal, reopens with a future date, and preserves snapshots', async ({ page }) => {
  test.setTimeout(90_000); const fixture = await createFixture(true)
  try {
    const db = await localDb(); const { data: beforeItems } = await db.from('quotation_items').select('service_name,quantity,unit_price,line_total').eq('quotation_id', fixture.quotationId); await openLifecycle(page, fixture)
    await expect(page.getByText('Status:').getByText('Expired')).toBeVisible(); const reopen = page.getByRole('button', { name: 'Reopen', exact: true }); await expect(reopen).toBeVisible(); await reopen.click(); const dialog = page.getByRole('dialog'); const date = dialog.getByLabel('Renewed validity date'); await expect(date).toBeVisible(); await dialog.getByRole('button', { name: 'Confirm' }).click(); await expect(page.getByRole('alert')).toContainText('renewed validity date is required')
    await date.fill(isoDate(-1)); await dialog.getByRole('button', { name: 'Confirm' }).click(); await expect(page.getByRole('alert')).toContainText('today or later'); await expect(dialog).toBeVisible()
    const renewed = isoDate(30); await date.fill(renewed); await dialog.getByRole('button', { name: 'Confirm' }).click(); await expect(dialog).toBeHidden(); await expect(page.getByText('Status:').getByText('Draft')).toBeVisible()
    const { data: quotation } = await db.from('quotations').select('status,valid_until').eq('id', fixture.quotationId).single(); expect(quotation).toMatchObject({ status: 'draft', valid_until: renewed }); const { data: activity } = await db.from('quotation_activity').select('event_type,previous_status,new_status,metadata').eq('quotation_id', fixture.quotationId); expect(activity?.some(item => item.event_type === 'reopened' && item.previous_status === 'expired' && item.new_status === 'draft')).toBe(true); const { data: afterItems } = await db.from('quotation_items').select('service_name,quantity,unit_price,line_total').eq('quotation_id', fixture.quotationId); expect(afterItems).toEqual(beforeItems)
  } finally { await cleanup(fixture) }
})
