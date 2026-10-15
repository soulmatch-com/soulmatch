import { expect, test, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

type Fixture = { marker: string; adminId?: string; leadId?: string; quotationId?: string; bookingId?: string; serviceId?: string; vendorId?: string }
const date = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
const values = (text: string) => Object.fromEntries(text.split('\n').flatMap(line => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/); return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [] }))

async function db(): Promise<SupabaseClient> {
  const config = values(await readFile('.env.local', 'utf8')), url = config.NEXT_PUBLIC_SUPABASE_URL, key = config.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) throw Error('Refusing H2 without loopback local Supabase credentials')
  const { stdout } = await promisify(execFile)('supabase', ['status', '--output', 'json']), status = JSON.parse(stdout) as { API_URL?: string; linked_project?: unknown }
  if (!status.API_URL || status.linked_project || new URL(status.API_URL).origin !== new URL(url).origin) throw Error('Refusing H2 against an unverified local Supabase instance')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function fixture(): Promise<Fixture> {
  const f: Fixture = { marker: `SC-H2-${crypto.randomUUID().slice(0, 8)}` }, c = await db()
  const { data: admin, error: adminError } = await c.from('admins').select('id').eq('is_active', true).limit(1).single()
  expect(adminError).toBeNull(); f.adminId = admin!.id
  const { data: lead, error: leadError } = await c.from('leads').insert({ source: 'call', status: 'new', contact_name: f.marker, mobile: '9876543210', event_date: date(90) }).select('id').single()
  expect(leadError).toBeNull(); f.leadId = lead!.id
  const { data: service, error: serviceError } = await c.from('celebration_services').select('id').eq('is_active', true).limit(1).single()
  expect(serviceError).toBeNull()
  const quotation = await c.rpc('create_admin_quotation', { p_quotation_number: `${f.marker}-Q`, p_valid_until: date(14), p_notes: f.marker, p_created_by: f.adminId, p_items: [{ service_id: service!.id, quantity: 1, unit_price: 100 }], p_lead_ids: [f.leadId] })
  expect(quotation.error).toBeNull(); f.quotationId = quotation.data as string
  for (const status of ['sent', 'accepted']) expect((await c.rpc('transition_admin_quotation', { p_quotation_id: f.quotationId, p_to_status: status, p_admin_id: f.adminId, p_reopen_valid_until: null })).error).toBeNull()
  const booking = await c.rpc('create_admin_booking', { p_quotation_id: f.quotationId, p_admin_id: f.adminId })
  expect(booking.error).toBeNull(); f.bookingId = booking.data as string
  const { data: bookingService, error: bookingServiceError } = await c.from('celebration_booking_services').select('id').eq('booking_id', f.bookingId).single()
  expect(bookingServiceError).toBeNull(); f.serviceId = bookingService!.id
  const { data: vendor, error: vendorError } = await c.from('event_vendors').insert({ vendor_name: f.marker, category: 'catering', is_active: true, created_by: f.adminId }).select('id').single()
  expect(vendorError).toBeNull(); f.vendorId = vendor!.id
  return f
}

async function cleanup(f: Fixture) {
  const c = await db()
  if (f.bookingId) {
    const { data: payments } = await c.from('booking_payment_records').select('id').eq('booking_id', f.bookingId)
    if (payments?.length) expect((await c.from('booking_payment_activities').delete().in('payment_id', payments.map(x => x.id))).error).toBeNull()
    if (payments?.length) expect((await c.from('booking_payment_records').delete().in('id', payments.map(x => x.id))).error).toBeNull()
    const { data: assignments } = await c.from('event_vendor_assignments').select('id').eq('booking_id', f.bookingId)
    if (assignments?.length) expect((await c.from('event_vendor_assignment_activities').delete().in('assignment_id', assignments.map(x => x.id))).error).toBeNull()
    if (assignments?.length) expect((await c.from('event_vendor_assignments').delete().in('id', assignments.map(x => x.id))).error).toBeNull()
    const { data: tasks } = await c.from('event_tasks').select('id').eq('booking_id', f.bookingId)
    if (tasks?.length) expect((await c.from('event_task_activities').delete().in('task_id', tasks.map(x => x.id))).error).toBeNull()
    if (tasks?.length) expect((await c.from('event_tasks').delete().in('id', tasks.map(x => x.id))).error).toBeNull()
    expect((await c.from('celebration_bookings').delete().eq('id', f.bookingId)).error).toBeNull()
  }
  if (f.vendorId) expect((await c.from('event_vendors').delete().eq('id', f.vendorId)).error).toBeNull()
  if (f.quotationId) expect((await c.from('quotations').delete().eq('id', f.quotationId)).error).toBeNull()
  if (f.leadId) expect((await c.from('leads').delete().eq('id', f.leadId)).error).toBeNull()
  const [leads, quotes, vendors, bookings, services, tasks, assignments, payments, bookingActivities] = await Promise.all([
    c.from('leads').select('id', { count: 'exact', head: true }).eq('contact_name', f.marker),
    c.from('quotations').select('id', { count: 'exact', head: true }).eq('notes', f.marker),
    c.from('event_vendors').select('id', { count: 'exact', head: true }).eq('vendor_name', f.marker),
    c.from('celebration_bookings').select('id', { count: 'exact', head: true }).eq('id', f.bookingId!),
    c.from('celebration_booking_services').select('id', { count: 'exact', head: true }).eq('booking_id', f.bookingId!),
    c.from('event_tasks').select('id', { count: 'exact', head: true }).eq('booking_id', f.bookingId!),
    c.from('event_vendor_assignments').select('id', { count: 'exact', head: true }).eq('booking_id', f.bookingId!),
    c.from('booking_payment_records').select('id', { count: 'exact', head: true }).eq('booking_id', f.bookingId!),
    c.from('celebration_booking_activities').select('id', { count: 'exact', head: true }).eq('booking_id', f.bookingId!),
  ])
  expect([leads.count, quotes.count, vendors.count, bookings.count, services.count, tasks.count, assignments.count, payments.count, bookingActivities.count]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
}

async function login(page: Page) {
  const admin = JSON.parse(await readFile('.playwright/local-admin.json', 'utf8')) as { email: string; password: string }
  await page.goto('/admin/login'); await page.getByLabel('Email').fill(admin.email); await page.getByLabel('Password').fill(admin.password); await page.getByRole('button', { name: 'Sign in as Admin' }).click(); await expect(page).toHaveURL(/\/admin\/dashboard$/)
  return admin.email
}
const path = (bookingId: string, suffix: string) => `/api/admin/bookings/${bookingId}${suffix}`
const json = async (page: Page, url: string) => { const response = await page.request.get(url); expect(response.status()).toBe(200); return response.json() }
const stable = (value: unknown) => JSON.parse(JSON.stringify(value))

test('Scenario H2 preserves cross-module history and financial snapshots through authenticated completion', async ({ page, request }) => {
  test.setTimeout(120_000)
  const f = await fixture()
  try {
    const c = await db(), email = await login(page), { data: actor, error: actorError } = await c.from('admins').select('id').eq('email', email).single()
    expect(actorError).toBeNull()

    // Enter the eligible planning state through the real authenticated lifecycle API.
    for (const toStatus of ['confirmed', 'planning']) {
      const response = await page.request.post(path(f.bookingId!, '/lifecycle'), { data: { toStatus } })
      expect(response.status()).toBe(200)
    }
    const taskTitle = `${f.marker} task`
    const createdTask = await page.request.post(path(f.bookingId!, '/tasks'), { data: { title: taskTitle, description: f.marker, category: 'general_administration', priority: 'high', bookingServiceId: f.serviceId, assignedAdminId: actor!.id, dueDate: date(30) } })
    expect(createdTask.status()).toBe(201); const taskId = (await createdTask.json()).taskId as string
    let task = (await c.from('event_tasks').select('*').eq('id', taskId).single()).data!
    expect(task.assigned_admin_id).toBe(actor!.id)
    for (const toStatus of ['in_progress', 'completed']) {
      const moved = await page.request.post(path(f.bookingId!, `/tasks/${taskId}/lifecycle`), { data: { toStatus, lockVersion: task.lock_version } })
      expect(moved.status()).toBe(200); task = (await c.from('event_tasks').select('*').eq('id', taskId).single()).data!
    }
    expect(task.completed_by).toBe(actor!.id)

    const assignmentResponse = await page.request.post(path(f.bookingId!, '/vendors'), { data: { vendorId: f.vendorId, bookingServiceId: f.serviceId, agreedCost: 42.5, scheduledDate: date(30), requirements: f.marker, internalNotes: f.marker } })
    expect(assignmentResponse.status()).toBe(201); const assignmentId = (await assignmentResponse.json()).assignmentId as string
    let assignment = (await c.from('event_vendor_assignments').select('*').eq('id', assignmentId).single()).data!
    const confirm = await page.request.post(path(f.bookingId!, `/vendors/${assignmentId}/lifecycle`), { data: { toStatus: 'confirmed', lockVersion: assignment.lock_version } })
    expect(confirm.status()).toBe(200); assignment = (await c.from('event_vendor_assignments').select('*').eq('id', assignmentId).single()).data!
    expect(assignment.confirmed_by).toBe(actor!.id)

    const paymentResponse = await page.request.post(path(f.bookingId!, '/payments'), { data: { idempotencyKey: `${f.marker}-receipt`, amount: 40.25, currency: 'INR', method: 'upi', externalReference: f.marker, paymentDate: new Date().toISOString() } })
    expect(paymentResponse.status()).toBe(201); const paymentId = (await paymentResponse.json()).paymentId as string
    const receipt = await page.request.get(path(f.bookingId!, `/payments/${paymentId}/receipt`)); expect(receipt.status()).toBe(200); expect(receipt.headers()['content-type']).toContain('application/pdf'); expect((await receipt.body()).byteLength).toBeGreaterThan(100)

    // Capture exact persisted records immediately before the completion action.
    const before = {
      quotationItems: stable((await c.from('quotation_items').select('service_name,service_code,quantity,unit_price,line_total').eq('quotation_id', f.quotationId!).order('id')).data),
      services: stable((await c.from('celebration_booking_services').select('id,service_name_snapshot,service_code_snapshot,quantity,unit_price_snapshot,total_price_snapshot').eq('booking_id', f.bookingId!).order('id')).data),
      task: stable((await c.from('event_tasks').select('*').eq('id', taskId).single()).data),
      taskActivities: stable((await c.from('event_task_activities').select('*').eq('task_id', taskId).order('created_at').order('id')).data),
      assignment: stable((await c.from('event_vendor_assignments').select('*').eq('id', assignmentId).single()).data),
      vendorActivities: stable((await c.from('event_vendor_assignment_activities').select('*').eq('assignment_id', assignmentId).order('created_at').order('id')).data),
      payments: stable((await c.from('booking_payment_records').select('*').eq('booking_id', f.bookingId!).order('created_at').order('id')).data),
      paymentActivities: stable((await c.from('booking_payment_activities').select('*').eq('payment_id', paymentId).order('created_at').order('id')).data),
      summary: stable((await c.rpc('booking_payment_summary', { p_booking_id: f.bookingId! })).data),
      lifecycle: stable((await c.from('celebration_booking_activities').select('*').eq('booking_id', f.bookingId!).order('created_at').order('id')).data),
    }
    expect(before.summary[0]).toMatchObject({ booking_total: 100, gross_received: 40.25, total_refunded: 0, total_reversed: 0, net_received: 40.25, outstanding_balance: 59.75, payment_status: 'partially_paid' })
    expect(before.taskActivities.map((x: { event_type: string }) => x.event_type)).toEqual(['created', 'status_changed', 'completed'])
    expect(before.vendorActivities.map((x: { event_type: string }) => x.event_type)).toEqual(['created', 'confirmed'])
    expect(before.paymentActivities.map((x: { event_type: string }) => x.event_type)).toEqual(['recorded'])
    expect(before.taskActivities.every((x: { actor_id: string }) => x.actor_id === actor!.id)).toBe(true)

    await page.goto(`/admin/bookings/${f.bookingId}`)
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible()
    await expect(page.getByText(f.marker, { exact: true }).first()).toBeVisible()
    const controls = page.getByRole('heading', { name: 'Status controls' }).locator('xpath=ancestor::section')
    for (const [to, label] of [['ready', 'Ready'], ['completed', 'Completed']] as const) {
      const done = page.waitForResponse(response => new URL(response.url()).pathname === path(f.bookingId!, '/lifecycle') && response.request().method() === 'POST')
      await controls.getByRole('button', { name: label, exact: true }).click(); expect((await done).status()).toBe(200)
      await expect(page.getByText(to[0].toUpperCase() + to.slice(1), { exact: true })).toBeVisible()
    }
    expect((await c.from('celebration_bookings').select('status').eq('id', f.bookingId).single()).data?.status).toBe('completed')

    const afterCompletion = {
      quotationItems: stable((await c.from('quotation_items').select('service_name,service_code,quantity,unit_price,line_total').eq('quotation_id', f.quotationId!).order('id')).data),
      services: stable((await c.from('celebration_booking_services').select('id,service_name_snapshot,service_code_snapshot,quantity,unit_price_snapshot,total_price_snapshot').eq('booking_id', f.bookingId!).order('id')).data),
      task: stable((await c.from('event_tasks').select('*').eq('id', taskId).single()).data), taskActivities: stable((await c.from('event_task_activities').select('*').eq('task_id', taskId).order('created_at').order('id')).data),
      assignment: stable((await c.from('event_vendor_assignments').select('*').eq('id', assignmentId).single()).data), vendorActivities: stable((await c.from('event_vendor_assignment_activities').select('*').eq('assignment_id', assignmentId).order('created_at').order('id')).data),
      payments: stable((await c.from('booking_payment_records').select('*').eq('booking_id', f.bookingId!).order('created_at').order('id')).data), paymentActivities: stable((await c.from('booking_payment_activities').select('*').eq('payment_id', paymentId).order('created_at').order('id')).data), summary: stable((await c.rpc('booking_payment_summary', { p_booking_id: f.bookingId! })).data),
      lifecycle: stable((await c.from('celebration_booking_activities').select('*').eq('booking_id', f.bookingId!).order('created_at').order('id')).data),
    }
    expect(afterCompletion.quotationItems).toEqual(before.quotationItems); expect(afterCompletion.services).toEqual(before.services); expect(afterCompletion.task).toEqual(before.task); expect(afterCompletion.taskActivities).toEqual(before.taskActivities); expect(afterCompletion.assignment).toEqual(before.assignment); expect(afterCompletion.vendorActivities).toEqual(before.vendorActivities); expect(afterCompletion.payments).toEqual(before.payments); expect(afterCompletion.paymentActivities).toEqual(before.paymentActivities); expect(afterCompletion.summary).toEqual(before.summary)
    expect(afterCompletion.lifecycle).toHaveLength(before.lifecycle.length + 2)
    expect(afterCompletion.lifecycle.slice(-2)).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'status_transition', previous_status: 'planning', new_status: 'ready', admin_id: actor!.id }), expect.objectContaining({ event_type: 'status_transition', previous_status: 'ready', new_status: 'completed', admin_id: actor!.id })]))

    // Completed bookings retain historical reads. Their task/vendor eligibility differs from payments by design.
    expect((await json(page, path(f.bookingId!, '/tasks'))).tasks).toEqual(expect.arrayContaining([expect.objectContaining({ id: taskId, status: 'completed', assigned_admin_id: actor!.id })]))
    expect((await json(page, path(f.bookingId!, '/task-activities'))).activities).toEqual(expect.arrayContaining([expect.objectContaining({ task_id: taskId, actor_id: actor!.id, event_type: 'completed' })]))
    expect((await json(page, path(f.bookingId!, '/vendors'))).assignments).toEqual(expect.arrayContaining([expect.objectContaining({ id: assignmentId, agreed_cost: 42.5, status: 'confirmed' })]))
    expect((await json(page, path(f.bookingId!, '/vendor-activities'))).activities).toEqual(expect.arrayContaining([expect.objectContaining({ assignment_id: assignmentId, actor_id: actor!.id, event_type: 'confirmed' })]))
    expect((await json(page, path(f.bookingId!, '/payments'))).payments).toEqual(expect.arrayContaining([expect.objectContaining({ id: paymentId, amount: 40.25, transaction_type: 'receipt' })]))
    expect((await json(page, path(f.bookingId!, '/payment-summary'))).summary).toMatchObject(before.summary[0])
    expect((await page.request.get(path(f.bookingId!, `/payments/${paymentId}/receipt`))).status()).toBe(200)
    expect((await page.request.post(path(f.bookingId!, '/tasks'), { data: { title: `${f.marker} prohibited`, category: 'general_administration', priority: 'medium' } })).status()).toBe(409)
    expect((await page.request.patch(path(f.bookingId!, `/tasks/${taskId}`), { data: { title: taskTitle, description: f.marker, category: 'general_administration', priority: 'high', bookingServiceId: f.serviceId, assignedAdminId: actor!.id, dueDate: date(30), lockVersion: task.lock_version } })).status()).toBe(400)
    expect((await page.request.post(path(f.bookingId!, '/vendors'), { data: { vendorId: f.vendorId, bookingServiceId: f.serviceId, agreedCost: 10 } })).status()).toBe(409)
    expect((await page.request.post(path(f.bookingId!, `/vendors/${assignmentId}/lifecycle`), { data: { toStatus: 'cancelled', lockVersion: assignment.lock_version } })).status()).toBe(400)
    const laterPayment = await page.request.post(path(f.bookingId!, '/payments'), { data: { idempotencyKey: `${f.marker}-completed-receipt`, amount: 10, currency: 'INR', method: 'cash', paymentDate: new Date().toISOString() } })
    expect(laterPayment.status()).toBe(201)
    const finalSummary = (await json(page, path(f.bookingId!, '/payment-summary'))).summary
    expect(finalSummary).toMatchObject({ booking_total: 100, gross_received: 50.25, total_refunded: 0, total_reversed: 0, net_received: 50.25, outstanding_balance: 49.75, payment_status: 'partially_paid' })
    expect((await request.post(path(f.bookingId!, '/lifecycle'), { data: { toStatus: 'completed' } })).status()).toBe(401)
  } finally { await cleanup(f) }
})
