import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

test('quotation editor adds, reorders, removes and saves services across desktop and mobile', async ({ page }) => {
  test.setTimeout(120_000)
  const values = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(values.NEXT_PUBLIC_SUPABASE_URL || '') || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Quotation editor tests require local Supabase')
  const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json'])
  const status = JSON.parse(stdout)
  if (status.linked_project || status.API_URL !== values.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Refusing unverified local database')
  const db = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8'))
  const marker = `EDITOR-${crypto.randomUUID().slice(0, 8)}`
  const names = ['Marriage ceremony', 'Photography', 'Accommodation'].map(name => `${marker} ${name}`)
  const { data: services, error: servicesError } = await db.from('celebration_services').insert(names.map((name, index) => ({ code: `${marker}-${index}`, name, description: 'Service details for the family', show_description_in_quotation: true, location: 'thirukadaiyur', is_active: true, display_order: 99000 + index }))).select('id, name, display_order').order('display_order')
  expect(servicesError).toBeNull()
  let quotationId: string | undefined
  let leadId: string | undefined
  let extraLeadIds: string[] = []
  try {
    const { data: lead, error: leadError } = await db.from('leads').insert({ source: 'call', contact_name: marker, mobile: '9876543210' }).select('id').single()
    expect(leadError).toBeNull(); leadId = lead!.id
    const { data: id, error: quotationError } = await db.rpc('create_admin_quotation', { p_quotation_number: marker, p_valid_until: '2099-01-01', p_notes: 'Family notes', p_created_by: admin.id, p_items: [{ service_id: services![0].id, quantity: 1, unit_price: 20000 }, { service_id: services![1].id, quantity: 1, unit_price: 4000 }], p_lead_ids: [] })
    expect(quotationError).toBeNull(); quotationId = id as string
    await page.setViewportSize({ width: 1536, height: 1024 })
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill(admin.email)
    await page.getByLabel('Password').fill(admin.password)
    await page.getByRole('button', { name: 'Sign in as Admin' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await page.route('**/api/admin/quotations', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary quotation load failure' }) }))
    await page.goto(`/admin/quotations/${quotationId}/edit`)
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Temporary quotation load failure')
    await expect(page.getByRole('button', { name: 'Save Changes', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Copy quotation', exact: true })).toBeDisabled()
    await page.unroute('**/api/admin/quotations')
    await page.getByRole('button', { name: 'Retry loading', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Quotation Summary' })).toBeVisible()
    await expect(page.getByText('₹24,000.00', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Add Service', exact: true }).click()
    const addDialog = page.getByRole('dialog')
    await addDialog.getByLabel('Service', { exact: true }).selectOption(services![2].id)
    await addDialog.getByLabel('Cost (₹)').fill('2000')
    await addDialog.getByLabel('Quantity', { exact: true }).fill('5')
    await addDialog.getByRole('button', { name: 'Add Service', exact: true }).click()
    await expect(addDialog).toBeHidden()
    await expect(page.getByText('₹34,000.00', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Increase quantity for ${names[2]}`, exact: true }).click()
    await expect(page.getByText('₹36,000.00', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Decrease quantity for ${names[2]}`, exact: true }).click()
    await page.getByRole('spinbutton', { name: `Cost for ${names[1]}`, exact: true }).fill('4500')
    await expect(page.getByText('₹34,500.00', { exact: true })).toBeVisible()
    await page.getByLabel('Customer lead (optional)').selectOption(leadId!)
    await page.getByLabel('Notes for the family').fill('Updated family notes')
    await page.getByLabel('Quotation description (this quotation only)').first().fill('Includes the ceremony arrangements')

    const firstMenu = page.getByRole('button', { name: `Actions for ${names[2]}`, exact: true })
    await firstMenu.focus(); await firstMenu.press('Enter')
    await page.getByRole('menuitem', { name: 'Move up', exact: true }).click()
    await firstMenu.click()
    await page.getByRole('menuitem', { name: 'Move up', exact: true }).click()
    await expect(page.getByRole('spinbutton', { name: /^Quantity for/ }).first()).toHaveAttribute('aria-label', `Quantity for ${names[2]}`)
    const descriptions = page.getByLabel('Quotation description (this quotation only)')
    await expect(descriptions.first()).toHaveValue('Service details for the family')
    await expect(page.getByRole('spinbutton', { name: `Quantity for ${names[2]}`, exact: true })).toHaveValue('5')
    await page.screenshot({ path: '.playwright/quotation-editor-desktop.png', fullPage: true })

    await page.route(`**/api/admin/quotations/${quotationId}/pdf`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Preview temporarily unavailable' }) }), { times: 1 })
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    const preview = page.getByRole('dialog')
    await expect(preview.getByRole('alert')).toContainText('Preview temporarily unavailable')
    await preview.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(preview.getByTitle('Quotation PDF preview')).toBeVisible()
    await expect(preview.getByRole('link', { name: 'Download PDF' })).toBeVisible()
    const downloadEvent = page.waitForEvent('download')
    await preview.getByRole('link', { name: 'Download PDF' }).click()
    const download = await downloadEvent
    expect((await readFile((await download.path())!)).subarray(0, 5).toString()).toBe('%PDF-')
    await preview.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Quotation History' }).click()
    const history = page.getByRole('dialog')
    await expect(history.getByRole('heading', { name: 'Quotation activity' })).toBeVisible()
    await history.getByRole('button', { name: 'Close', exact: true }).click()

    for (const width of [1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`).toBe(true)
    }
    await expect(page.getByRole('spinbutton', { name: `Quantity for ${names[2]}`, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: '.playwright/quotation-editor-mobile.png', fullPage: true })
    await page.getByRole('button', { name: `Actions for ${names[1]}`, exact: true }).click()
    await page.getByRole('menuitem', { name: 'Remove service', exact: true }).click()
    await expect(page.getByText('₹30,000.00', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/quotations$/)
    const { data: saved, error: savedError } = await db.from('quotations').select('notes, total_amount').eq('id', quotationId).single()
    expect(savedError).toBeNull()
    expect(saved).toMatchObject({ notes: 'Updated family notes', total_amount: 30000 })
    const { data: items, error: itemsError } = await db.from('quotation_items').select('celebration_service_id, quantity, unit_price, description_override').eq('quotation_id', quotationId).order('item_order')
    expect(itemsError).toBeNull()
    expect(items).toMatchObject([{ celebration_service_id: services![2].id, quantity: 5, unit_price: 2000 }, { celebration_service_id: services![0].id, quantity: 1, unit_price: 20000, description_override: 'Includes the ceremony arrangements' }])
    expect((await db.from('quotation_leads').select('lead_id').eq('quotation_id', quotationId)).data).toEqual([{ lead_id: leadId }])

    // References must survive catalogue changes and the recent-lead window.
    expect((await db.from('celebration_services').update({ is_active: false }).eq('id', services![2].id)).error).toBeNull()
    expect((await db.from('leads').update({ created_at: '2000-01-01T00:00:00Z' }).eq('id', leadId)).error).toBeNull()
    const { data: newerLeads, error: newerLeadsError } = await db.from('leads').insert(Array.from({ length: 200 }, (_, index) => ({ source: 'other', contact_name: `${marker} recent ${index}` }))).select('id')
    expect(newerLeadsError).toBeNull(); extraLeadIds = newerLeads!.map(lead => lead.id)
    await page.goto(`/admin/quotations/${quotationId}/edit`)
    await expect(page.getByLabel('Customer lead (optional)')).toHaveValue(leadId!)
    await expect(page.getByRole('spinbutton', { name: `Quantity for ${names[2]}`, exact: true })).toHaveValue('5')
    await expect(page.getByText('Inactive service', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Add Service', exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('option', { name: names[2], exact: true })).toHaveCount(0)
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/quotations$/)
    expect((await db.from('quotation_leads').select('lead_id').eq('quotation_id', quotationId)).data).toEqual([{ lead_id: leadId }])
  } finally {
    if (quotationId) expect((await db.from('quotations').delete().eq('id', quotationId)).error).toBeNull()
    if (leadId) expect((await db.from('leads').delete().eq('id', leadId)).error).toBeNull()
    if (extraLeadIds.length) expect((await db.from('leads').delete().in('id', extraLeadIds)).error).toBeNull()
    expect((await db.from('celebration_services').delete().in('id', services!.map(service => service.id))).error).toBeNull()
  }
})
