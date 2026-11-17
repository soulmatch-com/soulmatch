import { expect, test, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

type Fixture = { marker: string; adminId: string; serviceId: string; leadIds: string[]; quoteIds: string[] }
let database: Promise<SupabaseClient> | undefined
function db() {
  return database ??= (async () => {
    const values = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').flatMap(line => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
    }))
    if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(values.NEXT_PUBLIC_SUPABASE_URL || '') || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Quotation copy tests require local Supabase')
    const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json'])
    const status = JSON.parse(stdout)
    if (status.linked_project || status.API_URL !== values.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Refusing unverified local database')
    return createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  })()
}

async function fixture(): Promise<Fixture> {
  const c = await db(), marker = `COPY-${crypto.randomUUID().slice(0, 8)}`
  const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8'))
  const { data: service, error: se } = await c.from('celebration_services').insert({ code: marker, name: marker, description: 'Catalogue description', show_description_in_quotation: true, location: 'thirukadaiyur', is_active: true, display_order: 99999 }).select('id').single()
  expect(se).toBeNull()
  const { data: leads, error: le } = await c.from('leads').insert(['A', 'B'].map(name => ({ source: 'call', contact_name: `${marker} ${name}`, mobile: '9876543210', event_type: '70th-marriage', event_date: '2099-01-01' }))).select('id, contact_name').order('contact_name')
  expect(le).toBeNull()
  const f: Fixture = { marker, adminId: admin.id, serviceId: service!.id, leadIds: leads!.map(lead => lead.id), quoteIds: [] }
  const { data: quote, error: qe } = await c.rpc('create_admin_quotation', { p_quotation_number: marker, p_valid_until: '2099-01-01', p_notes: 'Review these family notes', p_created_by: f.adminId, p_items: [{ service_id: f.serviceId, quantity: 3, unit_price: 1234.56 }], p_lead_ids: [f.leadIds[0]] })
  expect(qe).toBeNull(); f.quoteIds.push(quote as string)
  expect((await c.from('quotation_items').update({ description_override: 'Negotiated service description' }).eq('quotation_id', quote)).error).toBeNull()
  for (const status of ['sent', 'accepted']) expect((await c.rpc('transition_admin_quotation', { p_quotation_id: quote, p_to_status: status, p_admin_id: f.adminId })).error).toBeNull()
  return f
}

async function cleanup(f: Fixture) {
  const c = await db()
  expect((await c.from('quotations').delete().in('id', f.quoteIds)).error).toBeNull()
  expect((await c.from('leads').delete().in('id', f.leadIds)).error).toBeNull()
  expect((await c.from('celebration_services').delete().eq('id', f.serviceId)).error).toBeNull()
}

async function login(page: Page) {
  const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8'))
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Sign in as Admin' }).click()
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
}

for (const entry of ['list', 'detail'] as const) {
  test(`copy from ${entry} creates an independent draft that can be mapped to a different lead`, async ({ page }) => {
    test.setTimeout(90_000)
    const f = await fixture(), c = await db(), sourceId = f.quoteIds[0]
    try {
      const { data: before } = await c.from('quotations').select('*').eq('id', sourceId).single()
      await login(page)
      await page.goto(entry === 'list' ? '/admin/quotations' : `/admin/quotations/${sourceId}/edit`)
      const copy = entry === 'list' ? page.getByRole('row').filter({ hasText: f.marker }).getByRole('button', { name: 'Copy quotation', exact: true }) : page.getByRole('button', { name: 'Copy quotation', exact: true })
      const responsePromise = page.waitForResponse(r => r.url().endsWith(`/api/admin/quotations/${sourceId}/copy`) && r.request().method() === 'POST')
      await copy.click()
      const response = await responsePromise
      expect(response.status()).toBe(201)
      const { quotationId } = await response.json(); f.quoteIds.push(quotationId)
      await expect(page).toHaveURL(new RegExp(`/admin/quotations/${quotationId}/edit$`))
      await expect(page.getByRole('button', { name: 'Save Changes', exact: true })).toBeEnabled()
      await expect(page.getByRole('spinbutton', { name: `Quantity for ${f.marker}`, exact: true })).toHaveValue('3')
      await expect(page.getByRole('spinbutton', { name: `Cost for ${f.marker}`, exact: true })).toHaveValue('1234.56')
      await expect(page.getByLabel('Quotation description (this quotation only)')).toHaveValue('Negotiated service description')
      await expect(page.getByLabel('Notes for the family')).toHaveValue('Review these family notes')
      await expect(page.getByLabel('Valid until')).toHaveValue('')
      await expect(page.getByRole('button', { name: `${f.marker} A ×`, exact: true })).toHaveCount(0)

      const { data: draft } = await c.from('quotations').select('*').eq('id', quotationId).single()
      expect(draft).toMatchObject({ status: 'draft', valid_until: null, total_amount: 3703.68 })
      expect(draft!.quotation_number).not.toBe(before!.quotation_number)
      expect((await c.from('quotation_leads').select('lead_id').eq('quotation_id', quotationId)).data).toEqual([])

      const lead = page.getByLabel('Customer lead (optional)')
      await lead.selectOption(f.leadIds[0])
      await lead.selectOption(f.leadIds[1])
      await expect(page.getByRole('button', { name: `${f.marker} A ×`, exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: `${f.marker} B ×`, exact: true })).toBeVisible()
      await page.getByLabel('Valid until').fill('2099-02-01')
      await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
      await expect(page).toHaveURL(/\/admin\/quotations$/)
      expect((await c.from('quotation_leads').select('lead_id').eq('quotation_id', quotationId)).data).toEqual([{ lead_id: f.leadIds[1] }])
      expect((await c.from('quotation_leads').select('lead_id').eq('quotation_id', sourceId)).data).toEqual([{ lead_id: f.leadIds[0] }])
      expect((await c.from('quotations').select('*').eq('id', sourceId).single()).data).toEqual(before)
      const pdf = await page.request.get(`/api/admin/quotations/${quotationId}/pdf`)
      expect(pdf.status()).toBe(200)
      expect(pdf.headers()['content-type']).toBe('application/pdf')
    } finally { await cleanup(f) }
  })
}

test('copy rejects anonymous, malformed and missing sources; create and update reject multiple leads', async ({ page, request }) => {
  const f = await fixture(), sourceId = f.quoteIds[0]
  try {
    expect((await request.post(`/api/admin/quotations/${sourceId}/copy`)).status()).toBe(401)
    await login(page)
    expect((await page.request.post('/api/admin/quotations/invalid/copy')).status()).toBe(400)
    expect((await page.request.post(`/api/admin/quotations/${crypto.randomUUID()}/copy`)).status()).toBe(404)
    expect((await page.request.post('/api/admin/quotations', { data: { leadIds: f.leadIds, items: [{ serviceId: f.serviceId, quantity: 1, unitPrice: 100 }] } })).status()).toBe(400)
    expect((await page.request.patch(`/api/admin/quotations/${sourceId}`, { data: { leadIds: f.leadIds } })).status()).toBe(400)
  } finally { await cleanup(f) }
})

test('copy prevents repeated clicks while saving and permits retry after a failure', async ({ page }) => {
  const f = await fixture(), sourceId = f.quoteIds[0], endpoint = `**/api/admin/quotations/${sourceId}/copy`
  try {
    await login(page)
    await page.goto(`/admin/quotations/${sourceId}/edit`)
    let calls = 0
    let release = () => {}
    const held = new Promise<void>(resolve => { release = resolve })
    await page.route(endpoint, async route => { calls += 1; await held; await route.fulfill({ status: 500, json: { error: 'Temporarily unavailable' } }) })
    await page.getByRole('button', { name: 'Copy quotation', exact: true }).click()
    await expect.poll(() => calls).toBe(1)
    await expect(page.getByRole('button', { name: 'Copying…' })).toBeDisabled()
    release()
    await expect(page.getByRole('alert').filter({ hasText: 'Temporarily unavailable' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy quotation', exact: true })).toBeEnabled()
    expect(calls).toBe(1)
    await page.unroute(endpoint)
    const responsePromise = page.waitForResponse(r => r.url().endsWith(`/api/admin/quotations/${sourceId}/copy`) && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Copy quotation', exact: true }).click()
    const response = await responsePromise
    expect(response.status()).toBe(201)
    const { quotationId } = await response.json(); f.quoteIds.push(quotationId)
    await expect(page).toHaveURL(new RegExp(`/admin/quotations/${quotationId}/edit$`))
  } finally { await cleanup(f) }
})
