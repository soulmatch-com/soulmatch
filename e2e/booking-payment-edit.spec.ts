import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'

test('correct 1000 to 2000 without inflating gross received, and retain payment history', async ({ page, request }) => {
  test.setTimeout(90_000)
  const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
  if (env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321' || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Payment edit fixtures require the local Supabase instance on port 54321')
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const marker = `EDIT-PAY-${crypto.randomUUID()}`
  const credentials = { email: `${marker.toLowerCase()}@local.test`, password: crypto.randomUUID() }
  let adminId: string | undefined, serviceId: string | undefined, quoteId: string | undefined, bookingId: string | undefined
  try {
    const { data: admin, error: adminError } = await db.from('admins').insert({ email: credentials.email, password_hash: await bcrypt.hash(credentials.password, 10), name: 'Payment edit test admin', role: 'admin', is_active: true }).select('id').single()
    expect(adminError).toBeNull(); adminId = admin!.id
    const { data: service, error: serviceError } = await db.from('celebration_services').insert({ code: marker, name: 'Payment edit browser fixture', location: 'thirukadaiyur', is_active: true, display_order: 99999 }).select('id').single()
    expect(serviceError).toBeNull(); serviceId = service!.id
    const { data: quote, error: quoteError } = await db.rpc('create_admin_quotation', {
      p_quotation_number: marker, p_valid_until: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), p_notes: marker,
      p_created_by: admin!.id, p_items: [{ service_id: serviceId, quantity: 1, unit_price: 3000 }], p_lead_ids: [],
    })
    expect(quoteError).toBeNull(); quoteId = quote as string
    for (const status of ['sent', 'accepted']) expect((await db.rpc('transition_admin_quotation', { p_quotation_id: quoteId, p_to_status: status, p_admin_id: admin!.id })).error).toBeNull()
    const { data: booking, error: bookingError } = await db.rpc('create_admin_booking', { p_quotation_id: quoteId, p_admin_id: admin!.id })
    expect(bookingError).toBeNull(); bookingId = booking as string
    expect((await db.rpc('transition_admin_booking', { p_booking_id: bookingId, p_to_status: 'confirmed', p_admin_id: admin!.id })).error).toBeNull()
    const { data: receiptId, error: receiptError } = await db.rpc('record_admin_booking_payment', {
      p_booking_id: bookingId, p_idempotency_key: marker, p_amount: 1000, p_currency: 'INR', p_method: 'cash',
      p_external_reference: 'original-reference', p_payment_date: new Date().toISOString(), p_notes: 'Original remarks', p_admin_id: admin!.id,
    })
    expect(receiptError).toBeNull()
    const { data: original } = await db.from('booking_payment_records').select('*').eq('id', receiptId).single()
    const anonymous = await request.patch(`/api/admin/bookings/${bookingId}/payments/${receiptId}`, { data: {} })
    expect(anonymous.status()).toBe(401)

    await page.goto('/admin/login')
    await page.getByLabel('Email').fill(credentials.email)
    await page.getByLabel('Password').fill(credentials.password)
    await page.getByRole('button', { name: 'Sign in as Admin' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await page.goto(`/admin/bookings/${bookingId}?tab=payments`)
    const originalRow = page.getByTestId('payment-history-row').filter({ hasText: original!.payment_reference })
    await originalRow.getByRole('button', { name: 'Edit', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit recorded payment' })
    await expect(dialog.getByLabel('Edit payment amount')).toHaveValue('1000')
    await expect(dialog.getByLabel('Edit payment remarks')).toHaveValue('Original remarks')
    await dialog.getByLabel('Edit payment amount').fill('2000')
    await dialog.getByLabel('Edit payment method').selectOption('bank_transfer')
    await dialog.getByLabel('Edit external reference').fill('corrected-reference')
    await dialog.getByLabel('Edit payment remarks').fill('Corrected remarks')
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await dialog.getByLabel('Reason for payment edit').fill('Corrected the receipt amount and payment details')
    const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(`/payments/${receiptId}`))
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    const response = await saved
    expect(response.status()).toBe(200)
    const { paymentId: correctedId } = await response.json()
    await expect(dialog).toBeHidden()
    await expect(originalRow).toHaveCount(0)
    await expect(page.getByTestId('payment-history-row')).toHaveCount(1)
    await expect(page.getByTestId('payment-history-row').getByText('₹2,000.00', { exact: true })).toBeVisible()
    await expect(page.getByTestId('payment-history-row').getByText('Edited', { exact: true })).toBeVisible()
    const auditButton = page.getByRole('button', { name: 'View audit history', exact: true })
    const auditDialog = page.getByRole('dialog', { name: 'Financial Audit History' })
    await expect(auditDialog).toBeHidden()
    await auditButton.click()
    await expect(auditDialog).toBeVisible()
    const auditEntries = auditDialog.getByTestId('audit-timeline-entry')
    await expect(auditEntries).toHaveCount(2)
    await expect(auditEntries.first().getByRole('heading', { name: 'Payment Modified' })).toBeVisible()
    await expect(auditEntries.last().getByRole('heading', { name: 'Original Payment' })).toBeVisible()
    await expect(auditDialog.locator('dt').filter({ hasText: /^Total Activities$/ }).locator('..').locator('dd')).toHaveText('02')
    await expect(auditDialog.locator('dt').filter({ hasText: /^Original Payments$/ }).locator('..').locator('dd')).toHaveText('01')
    await expect(auditDialog.locator('dt').filter({ hasText: /^Modified Payments$/ }).locator('..').locator('dd')).toHaveText('01')
    const editAudit = auditEntries.filter({ has: page.getByRole('heading', { name: 'Payment Modified' }) })
    const details = editAudit.getByRole('region', { name: 'Modification Information' })
    await expect(details).toHaveCount(0)
    await expect(editAudit.locator('p').filter({ hasText: /^₹2,000\.00$/ })).toBeVisible()
    const backendAudit = await page.request.get(`/api/admin/bookings/${bookingId}/payment-activities`)
    const auditData = await backendAudit.json()
    expect(auditData.activities).toHaveLength(4)
    await expect(auditDialog.getByText(auditData.bookingReference, { exact: true })).toBeVisible()
    const reversalActivity = auditData.activities.find((activity: { event_type: string }) => activity.event_type === 'reversed')
    await auditDialog.screenshot({ path: test.info().outputPath('payment-audit-collapsed.png') })
    await editAudit.getByRole('button', { name: /View Details/ }).click()
    await expect(details).toBeVisible()
    await expect(details.getByText('Corrected the receipt amount and payment details', { exact: true }).first()).toBeVisible()
    await expect(details.getByText(original!.payment_reference, { exact: true })).toBeVisible()
    await expect(details.getByText(reversalActivity.paymentReference, { exact: true })).toBeVisible()
    await expect(details.getByText('Payment edit test admin', { exact: true })).toBeVisible()
    await expect(details.getByText('Admin', { exact: true })).toBeVisible()
    await expect(details.getByRole('row', { name: /^Amount/ })).toHaveAttribute('data-changed', 'true')
    await expect(details.getByRole('row', { name: /^Payment Date/ })).toHaveAttribute('data-changed', 'false')
    await expect(details.getByRole('row', { name: /^Remarks/ })).toContainText('Original remarks')
    await expect(details.getByRole('row', { name: /^Remarks/ })).toContainText('Corrected remarks')
    await expect(auditEntries).toHaveCount(2)
    const headerTop = (await auditDialog.getByRole('heading', { name: 'Financial Audit History' }).boundingBox())!.y
    const footerTop = (await auditDialog.getByRole('button', { name: 'Export History' }).boundingBox())!.y
    await auditDialog.getByTestId('audit-scroll-content').evaluate(element => { element.scrollTop = element.scrollHeight })
    expect((await auditDialog.getByRole('heading', { name: 'Financial Audit History' }).boundingBox())!.y).toBe(headerTop)
    expect((await auditDialog.getByRole('button', { name: 'Export History' }).boundingBox())!.y).toBe(footerTop)
    await auditDialog.getByTestId('audit-scroll-content').evaluate(element => { element.scrollTop = 0 })
    await auditDialog.screenshot({ path: test.info().outputPath('payment-audit-popup.png') })
    const downloaded = page.waitForEvent('download')
    await auditDialog.getByRole('button', { name: 'Export History' }).click()
    const download = await downloaded
    expect(download.suggestedFilename()).toBe(auditData.bookingReference + '-financial-audit.csv')
    const csv = await readFile((await download.path())!, 'utf8')
    expect(csv.split('\r\n')).toHaveLength(5)
    for (const activity of auditData.activities) expect(csv).toContain(activity.id)
    await page.addInitScript(() => {
      window.print = () => {
        window.parent.postMessage({ type: 'audit-print-test', html: document.documentElement.outerHTML }, '*')
        window.dispatchEvent(new Event('afterprint'))
      }
    })
    await page.evaluate(() => {
      window.addEventListener('message', event => {
        if (event.data?.type !== 'audit-print-test') return
        const result = document.createElement('pre'); result.hidden = true
        result.dataset.testid = 'captured-audit-print'; result.textContent = event.data.html
        document.body.appendChild(result)
      })
    })
    await auditDialog.getByRole('button', { name: 'Print', exact: true }).click()
    await expect(page.getByTestId('captured-audit-print')).toHaveCount(1)
    const printed = await page.getByTestId('captured-audit-print').textContent()
    expect(printed).toContain(reversalActivity.paymentReference)
    expect((printed!.match(/<article>/g) ?? [])).toHaveLength(2)
    await editAudit.getByRole('button', { name: /Hide Details/ }).click()
    await expect(details).toHaveCount(0)
    await auditDialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(auditDialog).toBeHidden()
    await expect(auditButton).toBeFocused()
    await page.setViewportSize({ width: 390, height: 844 })
    await auditButton.click()
    await expect(auditDialog).toBeVisible()
    await editAudit.getByRole('button', { name: /View Details/ }).click()
    await expect(details).toBeVisible()
    expect(await auditDialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect((await auditDialog.boundingBox())!.width).toBeLessThanOrEqual(390)
    await expect(auditDialog.getByRole('button', { name: 'Export History' })).toBeInViewport()
    await expect(auditDialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport()
    await auditDialog.screenshot({ path: test.info().outputPath('payment-audit-mobile.png') })
    await auditDialog.getByRole('button', { name: 'Close audit history', exact: true }).click()
    await page.setViewportSize({ width: 1280, height: 900 })
    const summary = await page.request.get(`/api/admin/bookings/${bookingId}/payment-summary`)
    expect((await summary.json()).summary).toMatchObject({ gross_received: 2000, total_reversed: 0, net_received: 2000, outstanding_balance: 1000 })
    const paymentsSection = page.getByRole('heading', { name: 'Customer Payments', exact: true }).locator('xpath=ancestor::section[1]')
    await expect(paymentsSection.locator('dt').filter({ hasText: /^Gross Received$/ }).locator('..').locator('dd')).toHaveText('₹2,000.00')
    expect((await db.from('booking_payment_records').select('*').eq('id', receiptId).single()).data).toEqual(original)
    const { data: corrected } = await db.from('booking_payment_records').select('*').eq('id', correctedId).single()
    expect(corrected).toMatchObject({ amount: 2000, payment_method: 'bank_transfer', external_reference: 'corrected-reference', notes: 'Corrected remarks' })
    expect(new Date(corrected!.payment_date).getTime()).toBe(new Date(original!.payment_date).getTime())
    await page.reload()
    await expect(auditDialog).toBeHidden()
    await expect(page.getByTestId('payment-history-row')).toHaveCount(1)
    await auditButton.click()
    await expect(auditEntries).toHaveCount(2)
    await expect(editAudit.getByRole('button', { name: /View Details/ })).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Escape')
    await expect(auditDialog).toBeHidden()
    await expect(auditButton).toBeFocused()
    await expect(paymentsSection.locator('dt').filter({ hasText: /^Gross Received$/ }).locator('..').locator('dd')).toHaveText('₹2,000.00')
    const correctedRow = page.getByTestId('payment-history-row').filter({ hasText: corrected!.payment_reference })
    await expect(correctedRow.getByRole('button', { name: 'Edit', exact: true })).toBeEnabled()
    await paymentsSection.screenshot({ path: test.info().outputPath('current-payment-amount.png') })
    const stale = await page.request.patch(`/api/admin/bookings/${bookingId}/payments/${receiptId}`, { data: {
      idempotencyKey: crypto.randomUUID(), amount: 500, method: 'cash', externalReference: '', paymentDate: original!.payment_date, notes: '', reason: 'Stale edit',
    } })
    expect(stale.status()).toBe(409)
    expect((await db.from('booking_payment_records').select('id', { count: 'exact', head: true }).eq('booking_id', bookingId)).count).toBe(3)

    // Multiple edits still show just the latest receipt; real transactions stay visible.
    const nextEdit = await page.request.patch(`/api/admin/bookings/${bookingId}/payments/${correctedId}`, { data: {
      idempotencyKey: crypto.randomUUID(), amount: 1500, method: 'bank_transfer', externalReference: 'latest-reference',
      paymentDate: corrected!.payment_date, notes: 'Latest remarks', reason: 'Second correction',
    } })
    expect(nextEdit.status()).toBe(200)
    const { paymentId: latestId } = await nextEdit.json()
    await page.reload()
    await expect(page.getByTestId('payment-history-row')).toHaveCount(1)
    await expect(page.getByTestId('payment-history-row').getByText('₹1,500.00', { exact: true })).toBeVisible()
    const independent = await page.request.post(`/api/admin/bookings/${bookingId}/payments`, { data: {
      idempotencyKey: crypto.randomUUID(), amount: 300, currency: 'INR', method: 'cash', paymentDate: new Date().toISOString(),
    } })
    expect(independent.status()).toBe(201)
    const { paymentId: independentId } = await independent.json()
    for (const [paymentId, action, amount] of [[latestId, 'refund', 100], [independentId, 'reverse', 50]] as const) {
      const adjustment = await page.request.post(`/api/admin/bookings/${bookingId}/payments/${paymentId}/${action}`, { data: {
        idempotencyKey: crypto.randomUUID(), amount, currency: 'INR', reason: 'Actual customer transaction', paymentDate: new Date().toISOString(),
      } })
      expect(adjustment.status()).toBe(201)
    }
    await page.reload()
    await expect(page.getByTestId('payment-history-row')).toHaveCount(4)
    await expect(page.getByTestId('payment-history-row').filter({ hasText: 'Refund' }).filter({ hasText: '₹100.00' })).toBeVisible()
    await expect(page.getByTestId('payment-history-row').filter({ hasText: 'Reversal' }).filter({ hasText: '₹50.00' })).toBeVisible()
  } finally {
    if (bookingId) {
      const { data: payments } = await db.from('booking_payment_records').select('id').eq('booking_id', bookingId)
      if (payments?.length) {
        expect((await db.from('booking_payment_activities').delete().in('payment_id', payments.map(payment => payment.id))).error).toBeNull()
        expect((await db.from('booking_payment_records').delete().eq('booking_id', bookingId).neq('transaction_type', 'receipt')).error).toBeNull()
        expect((await db.from('booking_payment_records').delete().eq('booking_id', bookingId)).error).toBeNull()
      }
      expect((await db.from('celebration_bookings').delete().eq('id', bookingId)).error).toBeNull()
    }
    if (quoteId) expect((await db.from('quotations').delete().eq('id', quoteId)).error).toBeNull()
    if (serviceId) expect((await db.from('celebration_services').delete().eq('id', serviceId)).error).toBeNull()
    if (adminId) expect((await db.from('admins').delete().eq('id', adminId)).error).toBeNull()
  }
})
