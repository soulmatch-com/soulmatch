import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'

async function fixture() {
  const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
  if (env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321' || !env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Workspace fixtures require loopback local Supabase')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const marker = `WORKSPACE-${crypto.randomUUID()}`
  const credentials = { email: `${marker.toLowerCase()}@local.test`, password: crypto.randomUUID() }
  let adminId: string | undefined, serviceId: string | undefined, leadId: string | undefined, quotationId: string | undefined, bookingId: string | undefined, vendorId: string | undefined
  async function cleanup() {
    if (bookingId) {
      expect((await db.from('booking_expense_records').delete().eq('booking_id', bookingId)).error).toBeNull()
      const { data: payments } = await db.from('booking_payment_records').select('id').eq('booking_id', bookingId)
      if (payments?.length) {
        expect((await db.from('booking_payment_activities').delete().in('payment_id', payments.map(payment => payment.id))).error).toBeNull()
        expect((await db.from('booking_payment_records').delete().eq('booking_id', bookingId)).error).toBeNull()
      }
      expect((await db.from('celebration_bookings').delete().eq('id', bookingId)).error).toBeNull()
    }
    if (quotationId) expect((await db.from('quotations').delete().eq('id', quotationId)).error).toBeNull()
    if (leadId) expect((await db.from('leads').delete().eq('id', leadId)).error).toBeNull()
    if (vendorId) expect((await db.from('event_vendors').delete().eq('id', vendorId)).error).toBeNull()
    if (serviceId) expect((await db.from('celebration_services').delete().eq('id', serviceId)).error).toBeNull()
    if (adminId) expect((await db.from('admins').delete().eq('id', adminId)).error).toBeNull()
  }
  try {
    const admin = await db.from('admins').insert({ email: credentials.email, password_hash: await bcrypt.hash(credentials.password, 10), name: 'Workspace test admin', role: 'admin', is_active: true }).select('id').single()
    expect(admin.error).toBeNull(); adminId = admin.data!.id
    const service = await db.from('celebration_services').insert({ code: marker, name: 'Marriage Cost (16 Kalasam)', location: 'thirukadaiyur', is_active: true, display_order: 99999 }).select('id').single()
    expect(service.error).toBeNull(); serviceId = service.data!.id
    const lead = await db.from('leads').insert({ source: 'call', status: 'new', contact_name: 'Ramasamy', mobile: '9094166810', event_type: '80th-marriage', event_date: '2026-12-07' }).select('id').single()
    expect(lead.error).toBeNull(); leadId = lead.data!.id
    const quote = await db.rpc('create_admin_quotation', { p_quotation_number: marker, p_valid_until: new Date(Date.now() + 86400000).toISOString().slice(0, 10), p_notes: marker, p_created_by: adminId, p_items: [{ service_id: serviceId, quantity: 1, unit_price: 20000 }], p_lead_ids: [leadId] })
    expect(quote.error).toBeNull(); quotationId = quote.data as string
    for (const status of ['sent', 'accepted']) expect((await db.rpc('transition_admin_quotation', { p_quotation_id: quotationId, p_to_status: status, p_admin_id: adminId })).error).toBeNull()
    const booking = await db.rpc('create_admin_booking', { p_quotation_id: quotationId, p_admin_id: adminId })
    expect(booking.error).toBeNull(); bookingId = booking.data as string
    expect((await db.rpc('transition_admin_booking', { p_booking_id: bookingId, p_to_status: 'confirmed', p_admin_id: adminId })).error).toBeNull()
    expect((await db.rpc('record_admin_booking_payment', { p_booking_id: bookingId, p_idempotency_key: marker, p_amount: 11500, p_currency: 'INR', p_method: 'cash', p_external_reference: null, p_payment_date: new Date().toISOString(), p_notes: null, p_admin_id: adminId })).error).toBeNull()
    expect((await db.rpc('record_admin_booking_expense', { p_booking_id: bookingId, p_vendor_assignment_id: null, p_idempotency_key: marker, p_category: 'Temple preparation', p_amount: 2000, p_expense_date: '2026-11-13', p_notes: null, p_admin_id: adminId })).error).toBeNull()
    const vendor = await db.from('event_vendors').insert({ vendor_name: 'Chola Residency', category: marker, created_by: adminId }).select('id').single()
    expect(vendor.error).toBeNull(); vendorId = vendor.data!.id
    const bookingService = await db.from('celebration_booking_services').select('id').eq('booking_id', bookingId).single()
    expect(bookingService.error).toBeNull()
    if (!bookingId || !quotationId || !vendorId) throw Error('Incomplete workspace fixture')
    return { bookingId, quotationId, vendorId, bookingServiceId: bookingService.data!.id as string, credentials, cleanup, db }
  } catch (error) { await cleanup(); throw error }
}

async function login(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password').fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in as Admin' }).click()
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
}
const card = (page: Page, title: string) => page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::section[1]')
const metric = (page: Page, label: string) => card(page, 'Financial Overview').locator('dt').filter({ hasText: new RegExp(`^${label}$`) }).locator('..').locator('dd')

test('overview actions update real booking totals, tasks, vendors and combined history', async ({ page }) => {
  test.setTimeout(120000)
  const f = await fixture()
  try {
    await login(page, f.credentials)
    await page.setViewportSize({ width: 1536, height: 1100 })
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await expect(page.getByRole('heading', { name: 'Booking Details' })).toBeVisible()
    await expect(page.getByText('80th Marriage Celebration (Sathabhishekam)', { exact: true })).toBeVisible()
    await expect(metric(page, 'Net Received')).toHaveText('₹11,500.00')
    await expect(metric(page, 'Outstanding')).toHaveText('₹8,500.00')
    await expect(metric(page, 'Available to Allocate')).toHaveText('₹9,500.00')
    await expect(page.getByRole('progressbar', { name: 'Booking payment collection', exact: true })).toHaveAttribute('aria-valuenow', '58')
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: test.info().outputPath('booking-overview-desktop.png'), fullPage: true })

    await page.getByRole('button', { name: 'Record Payment', exact: true }).click()
    const payment = page.getByRole('dialog', { name: 'Record payment', exact: true })
    await payment.getByLabel('Amount', { exact: true }).fill('500')
    await payment.screenshot({ path: test.info().outputPath('booking-payment-dialog.png') })
    await payment.getByRole('button', { name: 'Record payment', exact: true }).click()
    await expect(payment).toBeHidden()
    await page.getByRole('tab', { name: 'Overview', exact: true }).click()
    await expect(metric(page, 'Net Received')).toHaveText('₹12,000.00')
    await expect(metric(page, 'Available to Allocate')).toHaveText('₹10,000.00')

    await page.getByRole('button', { name: 'Record Expense', exact: true }).click()
    const expense = page.getByRole('dialog', { name: 'Record Expense', exact: true })
    await expense.getByLabel('Expense category').fill('Flowers')
    await expense.getByLabel('Expense amount').fill('500')
    await expense.screenshot({ path: test.info().outputPath('booking-expense-dialog.png') })
    await expense.getByRole('button', { name: 'Record expense', exact: true }).click()
    await expect(expense).toBeHidden()
    await page.getByRole('tab', { name: 'Overview', exact: true }).click()
    await expect(metric(page, 'Expenses Recorded')).toHaveText('₹2,500.00')
    await expect(metric(page, 'Available to Allocate')).toHaveText('₹9,500.00')

    await page.getByRole('button', { name: 'Create Task', exact: true }).click()
    const task = page.getByRole('dialog', { name: 'Create Task', exact: true })
    await task.getByLabel('Task title').fill('Confirm ceremony arrangements')
    await task.screenshot({ path: test.info().outputPath('booking-task-dialog.png') })
    await task.getByRole('button', { name: 'Create task', exact: true }).click()
    await expect(task).toBeHidden()
    await page.getByRole('tab', { name: 'Overview', exact: true }).click()
    await expect(card(page, 'Event Planning')).toContainText('Confirm ceremony arrangements')
    await expect(card(page, 'Event Planning')).toContainText('0 / 1')
    await page.getByRole('button', { name: 'View All Tasks', exact: true }).click()
    await card(page, 'Event Planning').getByRole('button', { name: 'Edit', exact: true }).click()
    const taskEdit = page.getByRole('dialog', { name: 'Edit task', exact: true })
    await taskEdit.getByLabel('Task title').fill('Confirm ceremony arrangements and timings')
    await taskEdit.screenshot({ path: test.info().outputPath('booking-task-edit-dialog.png') })
    await taskEdit.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(taskEdit).toBeHidden()
    await page.getByRole('tab', { name: 'Overview', exact: true }).click()
    await expect(card(page, 'Event Planning')).toContainText('Confirm ceremony arrangements and timings')

    await page.getByRole('button', { name: 'Create Assignment', exact: true }).click()
    const assignment = page.getByRole('dialog', { name: 'Create Vendor Assignment', exact: true })
    await assignment.getByLabel('Vendor', { exact: true }).selectOption(f.vendorId)
    await assignment.getByLabel('Booking service', { exact: true }).selectOption(f.bookingServiceId)
    await assignment.getByLabel('Agreed cost', { exact: true }).fill('20000')
    await assignment.getByLabel('Scheduled date', { exact: true }).fill('2026-12-07')
    await assignment.screenshot({ path: test.info().outputPath('booking-vendor-dialog.png') })
    await assignment.getByRole('button', { name: 'Create assignment', exact: true }).click()
    await expect(assignment).toBeHidden()
    await page.getByRole('tab', { name: 'Overview', exact: true }).click()
    await expect(card(page, 'Vendor Coordination')).toContainText('Chola Residency')
    await page.getByRole('button', { name: 'View All Vendors', exact: true }).click()
    await card(page, 'Vendor Coordination').getByRole('button', { name: 'Edit', exact: true }).click()
    const vendorEdit = page.getByRole('dialog', { name: 'Edit Assignment', exact: true })
    await vendorEdit.getByLabel('Agreed cost', { exact: true }).fill('19000.50')
    await vendorEdit.getByLabel('Requirements', { exact: true }).fill('Confirm the ceremony hall setup')
    await vendorEdit.screenshot({ path: test.info().outputPath('booking-vendor-edit-dialog.png') })
    await vendorEdit.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(vendorEdit).toBeHidden()
    await page.getByRole('tab', { name: 'Overview', exact: true }).click()
    await expect(card(page, 'Vendor Coordination')).toContainText('₹19,000.50')

    await card(page, 'Amount Alteration').getByRole('button', { name: 'Alter amount' }).click()
    const amount = page.getByRole('dialog', { name: 'Alter booking amount' })
    await amount.getByLabel('New booking amount').fill('21000')
    await amount.getByLabel('Reason for amount change').fill('Updated ceremony arrangements')
    await amount.screenshot({ path: test.info().outputPath('booking-amount-dialog.png') })
    await amount.getByRole('button', { name: 'Save amount' }).click()
    await expect(amount).toBeHidden()
    await expect(metric(page, 'Booking Total')).toHaveText('₹21,000.00')
    await expect(metric(page, 'Outstanding')).toHaveText('₹9,000.00')
    await expect(card(page, 'Amount Alteration')).toContainText('Updated ceremony arrangements')

    await card(page, 'Booking Status').getByRole('button', { name: 'Change Status' }).click()
    await card(page, 'Booking Status').getByRole('button', { name: 'Planning', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Booking summary' })).toContainText('Planning')
    await page.getByRole('button', { name: 'View Full History' }).click()
    await expect(page).toHaveURL(/tab=history/)
    await expect(card(page, 'Activity History')).toContainText('Confirmed → Planning')
    await expect(card(page, 'Activity History')).toContainText('Updated ceremony arrangements')
    await page.getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(card(page, 'Activity History')).toContainText('Created')
    await page.reload()
    await expect(page.getByRole('tab', { name: 'Activity History' })).toHaveAttribute('data-state', 'active')
    await page.goBack()
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('data-state', 'active')
  } finally { await f.cleanup() }
})

test('mobile layout, keyboard tabs and failed summary recovery', async ({ page }) => {
  test.setTimeout(90000)
  const f = await fixture()
  try {
    await login(page, f.credentials)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route(`**/api/admin/bookings/${f.bookingId}/payment-summary`, route => route.fulfill({ status: 500, json: { error: 'Summary temporarily unavailable' } }))
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await expect(card(page, 'Financial Overview').getByRole('alert')).toContainText('Summary temporarily unavailable')
    await expect(metric(page, 'Net Received')).toHaveCount(0)
    await page.unroute(`**/api/admin/bookings/${f.bookingId}/payment-summary`)
    await card(page, 'Financial Overview').getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(metric(page, 'Net Received')).toHaveText('₹11,500.00')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: test.info().outputPath('booking-overview-mobile.png'), fullPage: true })
    const overview = page.getByRole('tab', { name: 'Overview', exact: true })
    await overview.focus()
    await overview.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Services & Quotations', exact: true })).toBeFocused()
    await expect(page).toHaveURL(/tab=services/)
    await page.getByRole('tab', { name: 'Payments & Expenses', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Customer Payments', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Record Payment', exact: true }).click()
    const mobilePayment = page.getByRole('dialog', { name: 'Record payment', exact: true })
    await expect(mobilePayment.getByLabel('Amount', { exact: true })).toBeFocused()
    await expect.poll(() => mobilePayment.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await mobilePayment.screenshot({ path: test.info().outputPath('booking-payment-dialog-mobile.png') })
    await page.keyboard.press('Escape')
    await expect(mobilePayment).toBeHidden()
    await expect(page.getByRole('button', { name: 'Record Payment', exact: true })).toBeFocused()
    await page.getByRole('tab', { name: 'Event Planning', exact: true }).click()
    await expect(card(page, 'Event Planning')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  } finally { await f.cleanup() }
})


test('a saved payment stays closed when refreshing totals fails', async ({ page }) => {
  const f = await fixture()
  try {
    await login(page, f.credentials)
    await page.goto(`/admin/bookings/${f.bookingId}?tab=payments`)
    const payments = card(page, 'Customer Payments')
    await expect(payments.getByTestId('payment-history-row')).toHaveCount(1)
    await page.route(`**/api/admin/bookings/${f.bookingId}/payment-summary`, route => route.fulfill({ status: 500, json: { error: 'Summary temporarily unavailable' } }))
    await payments.getByRole('button', { name: 'Record Payment', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Record payment', exact: true })
    await dialog.getByLabel('Amount', { exact: true }).fill('500')
    await dialog.getByRole('button', { name: 'Record payment', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(payments.getByRole('alert')).toContainText('Payment saved')
    const records = await f.db.from('booking_payment_records').select('id').eq('booking_id', f.bookingId)
    expect(records.error).toBeNull()
    expect(records.data).toHaveLength(2)
    await page.unroute(`**/api/admin/bookings/${f.bookingId}/payment-summary`)
    await payments.getByRole('button', { name: 'Retry loading' }).click()
    await expect(payments.getByRole('alert')).toHaveCount(0)
    await expect(payments.locator('dt').filter({ hasText: /^Net Received$/ }).locator('..').locator('dd')).toHaveText('₹12,000.00')
  } finally { await f.cleanup() }
})

test('retrying a lost payment response reuses the committed operation', async ({ page }) => {
  const f = await fixture()
  try {
    await login(page, f.credentials)
    await page.goto(`/admin/bookings/${f.bookingId}?tab=payments`)
    const payments = card(page, 'Customer Payments')
    await expect(payments.getByTestId('payment-history-row')).toHaveCount(1)
    const attempts: Record<string, unknown>[] = []
    await page.route(`**/api/admin/bookings/${f.bookingId}/payments`, async route => {
      if (route.request().method() !== 'POST') return route.continue()
      attempts.push(route.request().postDataJSON())
      if (attempts.length === 1) {
        const response = await route.fetch()
        expect(response.status()).toBe(201)
        return route.abort('failed')
      }
      return route.continue()
    })
    await payments.getByRole('button', { name: 'Record Payment', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Record payment', exact: true })
    await dialog.getByLabel('Amount', { exact: true }).fill('500')
    await dialog.getByRole('button', { name: 'Record payment', exact: true }).click()
    await expect(dialog.getByRole('status')).toContainText('could not be confirmed')
    await expect(dialog.getByRole('button', { name: 'Record payment', exact: true })).toBeEnabled()
    await expect(dialog.getByLabel('Amount', { exact: true })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Record payment', exact: true }).click()
    await expect(dialog).toBeHidden()
    expect(attempts).toHaveLength(2)
    expect(attempts[1]).toEqual(attempts[0])
    const records = await f.db.from('booking_payment_records').select('id,amount').eq('booking_id', f.bookingId)
    expect(records.error).toBeNull()
    expect(records.data).toHaveLength(2)
    expect(records.data!.reduce((sum, record) => sum + Number(record.amount), 0)).toBe(12000)
  } finally { await f.cleanup() }
})


test('browser history does not replay a dismissed quick-action dialog', async ({ page }) => {
  const f = await fixture()
  try {
    await login(page, f.credentials)
    await page.goto(`/admin/bookings/${f.bookingId}`)
    await page.getByRole('button', { name: 'Record Payment', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Record payment', exact: true })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    await page.goBack()
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('data-state', 'active')
    await page.goForward()
    await expect(page.getByRole('tab', { name: 'Payments & Expenses', exact: true })).toHaveAttribute('data-state', 'active')
    await expect(dialog).toBeHidden()
  } finally { await f.cleanup() }
})


for (const operation of [{ path: 'refund', type: 'refund' }, { path: 'reverse', type: 'reversal' }] as const) {
  test(`a full ${operation.type} retry returns the original committed adjustment`, async ({ page }) => {
    const f = await fixture()
    try {
      await login(page, f.credentials)
      const original = await f.db.from('booking_payment_records').select('id').eq('booking_id', f.bookingId).eq('transaction_type', 'receipt').single()
      expect(original.error).toBeNull()
      const endpoint = `/api/admin/bookings/${f.bookingId}/payments/${original.data!.id}/${operation.path}`
      const data = { idempotencyKey: crypto.randomUUID(), amount: 11500, currency: 'INR', reason: 'Full payment correction', paymentDate: new Date().toISOString() }
      const first = await page.request.post(endpoint, { data })
      expect(first.status()).toBe(201)
      const retry = await page.request.post(endpoint, { data })
      expect(retry.status()).toBe(201)
      expect(await retry.json()).toEqual(await first.json())
      const mismatch = await page.request.post(endpoint, { data: { ...data, amount: 1 } })
      expect(mismatch.status()).toBe(409)
      const records = await f.db.from('booking_payment_records').select('id,amount').eq('booking_id', f.bookingId).eq('transaction_type', operation.type)
      expect(records.error).toBeNull()
      expect(records.data).toHaveLength(1)
      expect(Number(records.data![0].amount)).toBe(11500)
    } finally { await f.cleanup() }
  })
}
