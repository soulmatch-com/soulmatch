import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'

test('edit and delete booking expenses using icon actions and refresh totals', async ({ page, request }) => {
  test.setTimeout(90_000)
  const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
  if (env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321' || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Expense edit fixtures require the local Supabase instance on port 54321')
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const marker = `EDIT-EXP-${crypto.randomUUID()}`
  const credentials = { email: `${marker.toLowerCase()}@local.test`, password: crypto.randomUUID() }
  let adminId: string | undefined, serviceId: string | undefined, quoteId: string | undefined, bookingId: string | undefined
  try {
    const { data: admin, error: adminError } = await db.from('admins').insert({ email: credentials.email, password_hash: await bcrypt.hash(credentials.password, 10), name: 'Expense edit test admin', role: 'admin', is_active: true }).select('id').single()
    expect(adminError).toBeNull(); adminId = admin!.id
    const { data: service, error: serviceError } = await db.from('celebration_services').insert({ code: marker, name: 'Expense edit browser fixture', location: 'thirukadaiyur', is_active: true, display_order: 99999 }).select('id').single()
    expect(serviceError).toBeNull(); serviceId = service!.id
    const { data: quote, error: quoteError } = await db.rpc('create_admin_quotation', {
      p_quotation_number: marker, p_valid_until: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), p_notes: marker,
      p_created_by: admin!.id, p_items: [{ service_id: serviceId, quantity: 1, unit_price: 1000 }], p_lead_ids: [],
    })
    expect(quoteError).toBeNull(); quoteId = quote as string
    for (const status of ['sent', 'accepted']) expect((await db.rpc('transition_admin_quotation', { p_quotation_id: quoteId, p_to_status: status, p_admin_id: admin!.id })).error).toBeNull()
    const { data: booking, error: bookingError } = await db.rpc('create_admin_booking', { p_quotation_id: quoteId, p_admin_id: admin!.id })
    expect(bookingError).toBeNull(); bookingId = booking as string
    expect((await db.rpc('transition_admin_booking', { p_booking_id: bookingId, p_to_status: 'confirmed', p_admin_id: admin!.id })).error).toBeNull()
    expect((await db.rpc('record_admin_booking_payment', {
      p_booking_id: bookingId, p_idempotency_key: marker, p_amount: 1000, p_currency: 'INR', p_method: 'cash',
      p_external_reference: null, p_payment_date: new Date().toISOString(), p_notes: null, p_admin_id: admin!.id,
    })).error).toBeNull()
    const { data: expenseId, error: expenseError } = await db.rpc('record_admin_booking_expense', {
      p_booking_id: bookingId, p_vendor_assignment_id: null, p_idempotency_key: marker, p_category: 'Original category',
      p_amount: 1000, p_expense_date: '2026-11-01', p_notes: 'Original notes', p_admin_id: admin!.id,
    })
    expect(expenseError).toBeNull()
    const { data: original } = await db.from('booking_expense_records').select('*').eq('id', expenseId).single()
    const endpoint = `/api/admin/bookings/${bookingId}/expenses/${expenseId}`
    expect((await request.patch(endpoint, { data: {} })).status()).toBe(401)
    expect((await request.delete(endpoint)).status()).toBe(401)

    await page.goto('/admin/login')
    await page.getByLabel('Email').fill(credentials.email)
    await page.getByLabel('Password').fill(credentials.password)
    await page.getByRole('button', { name: 'Sign in as Admin' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await page.goto(`/admin/bookings/${bookingId}`)
    const section = page.getByRole('heading', { name: 'Received Amount & Expenses', exact: true, includeHidden: true }).locator('xpath=ancestor::section[1]')
    const row = section.getByTestId('expense-history-row')
    const dialog = page.getByRole('dialog', { name: 'Edit Expense', exact: true })
    const total = (label: string) => section.locator('dt').filter({ hasText: new RegExp(`^${label}$`) }).locator('..').locator('dd')
    await expect(section.getByRole('button', { name: 'Record Expense', exact: true })).toBeDisabled()
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(dialog.getByLabel('Expense category')).toHaveValue('Original category')
    await expect(dialog.getByLabel('Expense amount')).toHaveValue('1000')
    await expect(dialog.getByLabel('Expense date')).toHaveValue('2026-11-01')
    await expect(dialog.getByLabel('Expense notes')).toHaveValue('Original notes')
    await dialog.getByLabel('Expense category').fill('Discarded changes')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(row).toContainText('Original category')
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(dialog.getByLabel('Expense category')).toHaveValue('Original category')
    await dialog.getByLabel('Expense category').fill('Corrected category')
    await dialog.getByLabel('Expense amount').fill('750')
    await dialog.getByLabel('Expense date').fill('2026-11-02')
    await dialog.getByLabel('Expense notes').fill('Corrected notes')
    const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(endpoint))
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    expect((await saved).status()).toBe(200)
    await expect(dialog).toBeHidden()
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(original!.expense_reference)
    await expect(row).toContainText('Corrected category')
    await expect(row).toContainText('Corrected notes')
    await expect(row).toContainText('₹750.00')
    await expect(total('Expenses Recorded')).toHaveText('₹750.00')
    await expect(total('Available to Allocate')).toHaveText('₹250.00')
    await expect(section.getByRole('button', { name: 'Record Expense', exact: true })).toBeEnabled()
    const { data: corrected } = await db.from('booking_expense_records').select('*').eq('id', expenseId).single()
    expect(corrected).toMatchObject({ expense_reference: original!.expense_reference, recorded_by: adminId, updated_by: adminId, amount: 750, expense_date: '2026-11-02' })

    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await dialog.getByLabel('Expense amount').fill('1000.01')
    const rejected = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(endpoint))
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    expect((await rejected).status()).toBe(409)
    await expect(dialog.getByRole('alert')).toContainText('exceeds')
    await expect(dialog.getByLabel('Expense amount')).toHaveValue('1000.01')
    await dialog.getByLabel('Expense amount').fill('1000')
    await dialog.getByLabel('Expense notes').fill('')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await expect(total('Expenses Recorded')).toHaveText('₹1,000.00')
    await expect(total('Available to Allocate')).toHaveText('₹0.00')
    await page.reload()
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('Corrected category')
    await expect(row).not.toContainText('Corrected notes')
    await expect(total('Available to Allocate')).toHaveText('₹0.00')
    expect((await page.request.patch(endpoint, { data: { category: '', amount: -1 } })).status()).toBe(400)

    // Icon actions retain accessible names and deletion requires confirmation.
    const deleteButton = row.getByRole('button', { name: 'Delete', exact: true })
    await expect(row.getByRole('button', { name: 'Edit', exact: true })).toHaveText('')
    await expect(deleteButton).toHaveText('')
    await expect(deleteButton).toHaveAttribute('title', 'Delete expense')
    const confirmation = page.getByRole('alertdialog', { name: 'Delete expense?' })
    await deleteButton.click()
    await expect(confirmation).toContainText(original!.expense_reference)
    await expect(confirmation).toContainText('₹1,000.00')
    await expect(row).toHaveCount(1)
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(confirmation).toBeHidden()
    await expect(deleteButton).toBeFocused()
    expect((await db.from('booking_expense_records').select('id').eq('id', expenseId)).data).toHaveLength(1)

    // A failed request keeps the confirmation open and leaves totals unchanged.
    await page.route(`**${endpoint}`, route => route.request().method() === 'DELETE'
      ? route.fulfill({ status: 500, json: { error: 'Unable to delete expense. Try again.' } })
      : route.continue())
    await deleteButton.click()
    await confirmation.getByRole('button', { name: 'Delete expense', exact: true }).click()
    await expect(confirmation.getByRole('alert')).toHaveText('Unable to delete expense. Try again.')
    await expect(row).toHaveCount(1)
    await expect(total('Expenses Recorded')).toHaveText('₹1,000.00')
    await page.unroute(`**${endpoint}`)
    const deleted = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().endsWith(endpoint))
    await confirmation.getByRole('button', { name: 'Delete expense', exact: true }).click()
    expect((await deleted).status()).toBe(200)
    await expect(confirmation).toBeHidden()
    await expect(row).toHaveCount(0)
    await expect(section.getByText('No Expenses Recorded Yet.')).toBeVisible()
    await expect(total('Expenses Recorded')).toHaveText('₹0.00')
    await expect(total('Available to Allocate')).toHaveText('₹1,000.00')
    await expect(total('Net Received')).toHaveText('₹1,000.00')
    await expect(section.getByRole('button', { name: 'Record Expense', exact: true })).toBeFocused()
    expect((await db.from('booking_expense_records').select('id').eq('id', expenseId)).data).toEqual([])
    expect((await page.request.delete(endpoint)).status()).toBe(404)
    expect((await page.request.delete(`/api/admin/bookings/${bookingId}/expenses/invalid`)).status()).toBe(400)
    await page.reload()
    await expect(row).toHaveCount(0)
    await expect(total('Available to Allocate')).toHaveText('₹1,000.00')
  } finally {
    if (bookingId) {
      expect((await db.from('booking_expense_records').delete().eq('booking_id', bookingId)).error).toBeNull()
      const { data: payments } = await db.from('booking_payment_records').select('id').eq('booking_id', bookingId)
      if (payments?.length) {
        expect((await db.from('booking_payment_activities').delete().in('payment_id', payments.map(payment => payment.id))).error).toBeNull()
        expect((await db.from('booking_payment_records').delete().eq('booking_id', bookingId)).error).toBeNull()
      }
      expect((await db.from('celebration_bookings').delete().eq('id', bookingId)).error).toBeNull()
    }
    if (quoteId) expect((await db.from('quotations').delete().eq('id', quoteId)).error).toBeNull()
    if (serviceId) expect((await db.from('celebration_services').delete().eq('id', serviceId)).error).toBeNull()
    if (adminId) expect((await db.from('admins').delete().eq('id', adminId)).error).toBeNull()
  }
})
