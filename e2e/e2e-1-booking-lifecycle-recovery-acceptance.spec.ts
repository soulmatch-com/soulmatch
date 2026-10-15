import { expect, test, type Page, type Route } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

type Fixture = { marker: string; adminId?: string; leadId?: string; quotationId?: string; bookingId?: string }
const env = (text: string) => Object.fromEntries(text.split('\n').flatMap(line => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/); return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [] }))
async function db(): Promise<SupabaseClient> { const config = env(await readFile('.env.local', 'utf8')), url = config.NEXT_PUBLIC_SUPABASE_URL, key = config.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) throw Error('Refusing H3 without loopback local Supabase credentials'); const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json']), status = JSON.parse(stdout) as { API_URL?: string; linked_project?: unknown }; if (!status.API_URL || status.linked_project || new URL(status.API_URL).origin !== new URL(url).origin) throw Error('Refusing H3 against an unverified local Supabase instance'); return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) }
async function fixture(): Promise<Fixture> { const f: Fixture = { marker: `SC-H3-${crypto.randomUUID().slice(0, 8)}` }, c = await db(); const { data: admin } = await c.from('admins').select('id').eq('is_active', true).limit(1).single(); f.adminId = admin!.id; const { data: lead } = await c.from('leads').insert({ source: 'call', status: 'new', contact_name: f.marker, mobile: '9876543210' }).select('id').single(); f.leadId = lead!.id; const { data: service } = await c.from('celebration_services').select('id').eq('is_active', true).limit(1).single(); const quote = await c.rpc('create_admin_quotation', { p_quotation_number: `${f.marker}-Q`, p_valid_until: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), p_notes: f.marker, p_created_by: f.adminId, p_items: [{ service_id: service!.id, quantity: 1, unit_price: 100 }], p_lead_ids: [f.leadId] }); expect(quote.error).toBeNull(); f.quotationId = quote.data as string; for (const to of ['sent', 'accepted']) expect((await c.rpc('transition_admin_quotation', { p_quotation_id: f.quotationId, p_to_status: to, p_admin_id: f.adminId, p_reopen_valid_until: null })).error).toBeNull(); const booking = await c.rpc('create_admin_booking', { p_quotation_id: f.quotationId, p_admin_id: f.adminId }); expect(booking.error).toBeNull(); f.bookingId = booking.data as string; return f }
async function cleanup(f: Fixture) { const c = await db(); if (f.bookingId) expect((await c.from('celebration_bookings').delete().eq('id', f.bookingId)).error).toBeNull(); if (f.quotationId) expect((await c.from('quotations').delete().eq('id', f.quotationId)).error).toBeNull(); if (f.leadId) expect((await c.from('leads').delete().eq('id', f.leadId)).error).toBeNull(); const [leads, quotes, bookings, activities] = await Promise.all([c.from('leads').select('id', { count: 'exact', head: true }).eq('contact_name', f.marker), c.from('quotations').select('id', { count: 'exact', head: true }).eq('notes', f.marker), c.from('celebration_bookings').select('id', { count: 'exact', head: true }).eq('id', f.bookingId!), c.from('celebration_booking_activities').select('id', { count: 'exact', head: true }).eq('booking_id', f.bookingId!)]); expect([leads.count, quotes.count, bookings.count, activities.count]).toEqual([0, 0, 0, 0]) }
async function login(page: Page) { const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8')) as { email: string; password: string }; await page.goto('/admin/login'); await page.getByLabel('Email').fill(admin.email); await page.getByLabel('Password').fill(admin.password); await page.getByRole('button', { name: 'Sign in as Admin' }).click(); await expect(page).toHaveURL(/\/admin\/dashboard$/) }
const endpoint = (id: string) => `/api/admin/bookings/${id}/lifecycle`
const control = (page: Page) => page.getByRole('heading', { name: 'Status controls' }).locator('xpath=ancestor::section')
const status = async (id: string) => (await (await db()).from('celebration_bookings').select('status').eq('id', id).single()).data?.status
const transitions = async (id: string) => (await (await db()).from('celebration_booking_activities').select('id,event_type,new_status').eq('booking_id', id).eq('event_type', 'status_transition')).data ?? []
const error = async (route: Route, code: number, message: string) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify({ error: message }) })
const alert = (page: Page) => page.locator('p[role="alert"]')

for (const failure of [{ name: '400 validation', code: 400, message: 'Please check the lifecycle action' }, { name: '409 invalid transition', code: 409, message: 'Status transition is not allowed' }, { name: '500 server error', code: 500, message: 'Unable to change booking status' }]) {
  test(`Scenario H3 recovers from lifecycle ${failure.name}`, async ({ page }) => {
    const f = await fixture()
    try { await login(page); await page.goto(`/admin/bookings/${f.bookingId}`); await page.route(`**${endpoint(f.bookingId!)}`, route => error(route, failure.code, failure.message)); const button = control(page).getByRole('button', { name: 'Confirmed', exact: true }); await button.click(); await expect(alert(page)).toContainText(failure.message); await expect(button).toBeEnabled(); expect(await status(f.bookingId!)).toBe('pending_confirmation'); expect(await transitions(f.bookingId!)).toHaveLength(0); await page.unroute(`**${endpoint(f.bookingId!)}`); await button.click(); await expect(page.getByText('Confirmed', { exact: true })).toBeVisible(); expect(await status(f.bookingId!)).toBe('confirmed'); expect(await transitions(f.bookingId!)).toEqual([expect.objectContaining({ new_status: 'confirmed' })]); await expect(page.getByRole('heading', { name: 'Status controls' })).toBeFocused() } finally { await cleanup(f) }
  })
}

test('Scenario H3 recovers from an aborted lifecycle request without false success', async ({ page }) => {
  const f = await fixture()
  try { await login(page); await page.goto(`/admin/bookings/${f.bookingId}`); await page.route(`**${endpoint(f.bookingId!)}`, route => route.abort('failed')); const button = control(page).getByRole('button', { name: 'Confirmed', exact: true }); await button.click(); await expect(alert(page)).toContainText('Failed to fetch'); await expect(button).toBeEnabled(); expect(await status(f.bookingId!)).toBe('pending_confirmation'); expect(await transitions(f.bookingId!)).toHaveLength(0); await page.unroute(`**${endpoint(f.bookingId!)}`); await button.click(); await expect(page.getByText('Confirmed', { exact: true })).toBeVisible(); expect(await transitions(f.bookingId!)).toHaveLength(1) } finally { await cleanup(f) }
})

test('Scenario H3 prevents duplicate direct lifecycle submission while pending', async ({ page }) => {
  const f = await fixture()
  try { await login(page); await page.goto(`/admin/bookings/${f.bookingId}`); let requests = 0, release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve }); await page.route(`**${endpoint(f.bookingId!)}`, async route => { requests += 1; await held; await route.continue() }); const button = control(page).getByRole('button', { name: 'Confirmed', exact: true }); await button.focus(); await button.press('Enter'); await expect.poll(() => requests).toBe(1); await expect(button).toBeDisabled(); await button.press('Enter'); await page.waitForTimeout(100); expect(requests).toBe(1); release(); await expect(page.getByText('Confirmed', { exact: true })).toBeVisible(); expect(await transitions(f.bookingId!)).toEqual([expect.objectContaining({ new_status: 'confirmed' })]) } finally { await cleanup(f) }
})

test('Scenario H3 enforces authorization, invalid actions, and direct-control accessibility', async ({ page, request }) => {
  const f = await fixture()
  try {
    expect((await request.post(endpoint(f.bookingId!), { data: { toStatus: 'confirmed' } })).status()).toBe(401)
    await login(page); await page.goto(`/admin/bookings/${f.bookingId}`)
    const controls = control(page), cancel = controls.getByRole('button', { name: 'Cancelled', exact: true }), reason = page.getByLabel('Cancellation reason (required to cancel)')
    await expect(reason).toBeVisible(); await cancel.focus(); await cancel.press('Enter'); await expect(alert(page)).toContainText('A cancellation reason is required.'); expect(await status(f.bookingId!)).toBe('pending_confirmation'); expect(await transitions(f.bookingId!)).toHaveLength(0)
    expect((await page.request.post('/api/admin/bookings/00000000-0000-0000-0000-000000000000/lifecycle', { data: { toStatus: 'confirmed' } })).status()).toBe(404)
    expect((await page.request.post(endpoint(f.bookingId!), { data: { toStatus: 'ready' } })).status()).toBe(409)
    const confirmed = controls.getByRole('button', { name: 'Confirmed', exact: true }); await confirmed.focus(); await confirmed.press('Enter'); await expect(page.getByText('Confirmed', { exact: true })).toBeVisible()
    for (const toStatus of ['planning', 'ready', 'completed']) expect((await page.request.post(endpoint(f.bookingId!), { data: { toStatus } })).status()).toBe(200)
    expect((await page.request.post(endpoint(f.bookingId!), { data: { toStatus: 'completed' } })).status()).toBe(409); expect((await page.request.post(endpoint(f.bookingId!), { data: { toStatus: 'completed' } })).status()).toBe(409); expect(await transitions(f.bookingId!)).toHaveLength(4)
  } finally { await cleanup(f) }
})
