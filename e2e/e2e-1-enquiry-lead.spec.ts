import { expect, test } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

type Fixture = { marker: string; enquiryId?: string; leadId?: string; quotationId?: string }
const marker = () => `Acceptance ${Array.from({ length: 10 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')}`

function env(text: string) {
  return Object.fromEntries(text.split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
}

async function localDb(): Promise<SupabaseClient> {
  const values = env(await readFile('.env.local', 'utf8'))
  const url = values.NEXT_PUBLIC_SUPABASE_URL
  const key = values.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) throw new Error('Refusing E2E database setup without verified loopback local credentials')
  const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json'], { maxBuffer: 1024 * 1024 })
  const status = JSON.parse(stdout) as { API_URL?: string; linked_project?: unknown }
  if (!status.API_URL || status.linked_project || new URL(status.API_URL).origin !== new URL(url).origin) throw new Error('Refusing E2E database setup against an unverified local Supabase instance')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function cleanup(fixture: Fixture) {
  const db = await localDb()
  if (fixture.quotationId) await db.from('quotations').delete().eq('id', fixture.quotationId)
  const { data: markedLeads, error } = await db.from('leads').select('id,celebration_enquiry_id').eq('contact_name', fixture.marker)
  if (error) throw error
  for (const lead of markedLeads ?? []) await db.from('leads').delete().eq('id', lead.id)
  for (const lead of markedLeads ?? []) if (lead.celebration_enquiry_id) await db.from('celebration_enquiries').delete().eq('id', lead.celebration_enquiry_id)
  if (fixture.leadId && !(markedLeads ?? []).some(lead => lead.id === fixture.leadId)) await db.from('leads').delete().eq('id', fixture.leadId)
  if (fixture.enquiryId && !(markedLeads ?? []).some(lead => lead.celebration_enquiry_id === fixture.enquiryId)) await db.from('celebration_enquiries').delete().eq('id', fixture.enquiryId)
}

test('E2E-1A public enquiry creates one linked CRM lead and renders its original details for an authenticated admin', async ({ page }) => {
  test.setTimeout(90_000)
  const fixture: Fixture = { marker: marker() }
  try {
    await test.step('local Supabase identity verified', async () => { await localDb() })
    await test.step('public enquiry page loaded and form completed', async () => {
      await page.goto('/plan?ceremony=60th-marriage')
      await page.getByRole('button', { name: 'Select Basic' }).click()
      await page.getByRole('checkbox').first().check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByLabel('Husband Name').fill(`${fixture.marker} Husband`)
      await page.getByLabel('Wife Name').fill(`${fixture.marker} Wife`)
      await page.getByLabel('Husband Date of Birth').fill('1960-01-01')
      await page.getByLabel('Wife Date of Birth').fill('1962-02-02')
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByLabel('Preferred Ceremony Date').fill('2027-02-01')
      await page.getByLabel('Alternative Date').fill('2027-02-02')
      await page.getByLabel('Travelling From').fill('Chennai')
      await page.getByLabel('Your Name').fill(fixture.marker)
      await page.getByLabel('Mobile Number').fill('9876543210')
      await page.getByLabel('Relationship to Couple').selectOption('Family Member')
      await page.getByLabel('Preferred Contact Method').selectOption('phone')
      await page.getByRole('checkbox', { name: /I have read and agree/ }).check()
      await page.getByRole('button', { name: 'Continue to Review' }).click()
    })
    await test.step('enquiry submitted and success response received', async () => {
      const submittedRequest = page.waitForRequest(request => request.url().includes('/api/celebrations/enquiries') && request.method() === 'POST')
      const submitted = page.waitForResponse(response => response.url().includes('/api/celebrations/enquiries') && response.request().method() === 'POST')
      await page.getByRole('button', { name: 'Submit Enquiry' }).click()
      expect((await submitted).status()).toBe(201)
      const request = await submittedRequest
      const idempotencyKey = request.headers()['idempotency-key']
      expect(idempotencyKey).toBeTruthy()
      const retry = await page.request.post('/api/celebrations/enquiries', {
        data: request.postDataJSON(),
        headers: { 'idempotency-key': idempotencyKey },
      })
      expect(retry.status()).toBe(201)
      await expect(page.getByRole('heading', { name: 'Enquiry Sent Successfully' })).toBeVisible()
    })

    await test.step('enquiry and one linked lead verified in database', async () => {
      const db = await localDb()
      const { data: leads, error } = await db.from('leads').select('id,celebration_enquiry_id').eq('contact_name', fixture.marker)
      expect(error).toBeNull(); expect(leads).toHaveLength(1)
      fixture.leadId = leads![0].id; fixture.enquiryId = leads![0].celebration_enquiry_id
      expect(fixture.enquiryId).toBeTruthy()
    })

    await test.step('administrator authenticated and lead detail opened', async () => {
      const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8')) as { email: string; password: string }
      await page.goto('/admin/login')
      await page.getByLabel('Email').fill(admin.email); await page.getByLabel('Password').fill(admin.password)
      await page.getByRole('button', { name: 'Sign in as Admin' }).click()
      await expect(page).toHaveURL(/\/admin\/dashboard$/)
      await page.goto(`/admin/leads/${fixture.leadId}`)
    })
    await test.step('original enquiry details verified', async () => {
      await expect(page.getByRole('heading', { name: fixture.marker })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Original celebration enquiry' })).toBeVisible()
      await expect(page.getByText('Chennai', { exact: true })).toBeVisible()
    })
    await test.step('lead creates a priced quotation and committed PDF', async () => {
      await page.getByRole('link', { name: 'Create quotation' }).first().click()
      await expect(page).toHaveURL(new RegExp(`/admin/quotations/new\\?leadId=${fixture.leadId}`))
      await expect(page.getByRole('button', { name: new RegExp(`${fixture.marker} ×`) })).toBeVisible()
      const prices = page.getByRole('spinbutton', { name: /Cost for/ })
      await expect(prices).not.toHaveCount(0)
      await expect(prices.first()).toHaveValue('')
      for (let index = 0; index < await prices.count(); index += 1) await prices.nth(index).fill('12500')
      await page.getByRole('button', { name: 'Create draft quotation' }).click()
      await expect(page).toHaveURL(new RegExp(`/admin/leads/${fixture.leadId}$`))
      const db = await localDb()
      const { data: quotations, error } = await db.from('quotation_leads').select('quotation_id,quotations!inner(id,total_amount)').eq('lead_id', fixture.leadId)
      expect(error).toBeNull(); expect(quotations).toHaveLength(1)
      fixture.quotationId = quotations![0].quotation_id
      await expect(page.getByText('₹1,25,000.00')).toBeVisible()
      const pdf = await page.request.get(`/api/admin/quotations/${fixture.quotationId}/pdf`)
      expect(pdf.status()).toBe(200)
      expect(pdf.headers()['content-type']).toContain('application/pdf')
      expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF')
    })
    await test.step('draft quotation transitions through sent, manual delivery, and accepted', async () => {
      await page.goto(`/admin/quotations/${fixture.quotationId}/edit`)
      await expect(page.getByText('Status:').getByText('Draft')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sent' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Sent' }).click()
      const sendDialog = page.getByRole('dialog')
      await expect(sendDialog).toBeVisible()
      await expect(sendDialog.getByText(/Sent/)).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(sendDialog).toBeHidden()
      await page.getByRole('button', { name: 'Sent' }).click()
      await page.getByRole('button', { name: 'Confirm' }).click()
      await expect(page.getByText('Status:').getByText('Sent')).toBeVisible()
      await page.getByRole('button', { name: 'Record manual delivery' }).click()
      const deliveryDialog = page.getByRole('dialog')
      await expect(deliveryDialog.getByPlaceholder('Recipient name')).toBeVisible()
      await deliveryDialog.getByRole('button', { name: 'Confirm' }).click()
      await expect(deliveryDialog).toBeVisible()
      await deliveryDialog.getByPlaceholder('Recipient name').fill('Acceptance Family')
      await deliveryDialog.getByPlaceholder('Recipient contact').fill('9876543210')
      await deliveryDialog.getByRole('combobox').selectOption('manual')
      await deliveryDialog.getByRole('button', { name: 'Confirm' }).click()
      await expect(page.getByText(/Manually recorded delivery to Acceptance Family/)).toBeVisible()
      await page.getByRole('button', { name: 'Approve' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
      await expect(page.getByText('Status:').getByText('Accepted')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sent' })).toHaveCount(0)
      const db = await localDb()
      const { data: items } = await db.from('quotation_items').select('service_name,quantity,unit_price').eq('quotation_id', fixture.quotationId)
      expect(items).toHaveLength(10)
      expect(items?.every(item => Number(item.quantity) === 1 && Number(item.unit_price) === 12500)).toBe(true)
      const { data: activity } = await db.from('quotation_activity').select('event_type').eq('quotation_id', fixture.quotationId)
      expect(activity?.filter(event => event.event_type === 'status_transition')).toHaveLength(2)
      expect(activity?.some(event => event.event_type === 'delivery_recorded')).toBe(true)
    })
  } finally {
    await cleanup(fixture)
    console.info('[E2E-1A] fixture cleanup completed')
  }
})
