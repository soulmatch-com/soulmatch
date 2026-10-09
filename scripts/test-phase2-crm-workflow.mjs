import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('lead quotation entry preserves the originating lead and return route', async () => {
  const [leadPage, quotationPage, manager] = await Promise.all([
    read('src/app/(en)/admin/(protected)/leads/[id]/page.tsx'),
    read('src/app/(en)/admin/(protected)/quotations/new/page.tsx'),
    read('src/components/admin/QuotationManager.tsx'),
  ])
  assert.match(leadPage, /\/admin\/quotations\/new\?leadId=\$\{lead\.id\}/)
  assert.match(quotationPage, /initialLeadId=\{leadId\}/)
  assert.match(quotationPage, /returnTo=\{leadId \? `\/admin\/leads\/\$\{leadId\}` : undefined\}/)
  assert.match(manager, /fetch\(`\/api\/admin\/leads\/\$\{initialLeadId\}`\)/)
  assert.match(manager, /setLeadIds\(\[context\.lead\.id\]\)/)
  assert.match(manager, /if \(returnTo\) \{ router\.push\(returnTo\); return; \}/)
})

test('enquiry service prefill includes only active catalogue services and leaves prices for review', async () => {
  const manager = await read('src/components/admin/QuotationManager.tsx')
  assert.match(manager, /const active = new Set\(data\.services\.map\(\(service: Service\) => service\.id\)\)/)
  assert.match(manager, /filter\(\(service: \{ service_id: string \}\) => active\.has\(service\.service_id\)\)/)
  assert.match(manager, /serviceId: service\.service_id, quantity: "1", unitPrice: ""/)
  assert.match(manager, /draftItems\.some\(\(item\) => item\.serviceId === selectedServiceId\)/)
})

test('lead quotation endpoint authorizes and returns only quotations mapped to the requested lead', async () => {
  const route = await read('src/app/api/admin/leads/[id]/quotations/route.ts')
  assert.match(route, /requireActiveAdmin\(\)/)
  assert.match(route, /from\('quotation_leads'\)\.select\('quotation_id'\)\.eq\('lead_id', id\)/)
  assert.match(route, /in\('id', ids\)/)
  assert.match(route, /select\('id, quotation_number, status, valid_until, total_amount, created_at'\)/)
  assert.match(route, /return NextResponse\.json\(\{ quotations: \[\] \}\)/)
})

test('lead detail renders linked quotation loading, failure, empty, edit, and PDF states', async () => {
  const page = await read('src/app/(en)/admin/(protected)/leads/[id]/page.tsx')
  assert.match(page, /fetch\(`\/api\/admin\/leads\/\$\{id\}\/quotations`\)/)
  assert.match(page, /Loading linked quotations/)
  assert.match(page, /Linked quotations could not be loaded/)
  assert.match(page, /No quotations are linked to this lead yet/)
  assert.match(page, /\/admin\/quotations\/\$\{quotation\.id\}\/edit/)
  assert.match(page, /\/api\/admin\/quotations\/\$\{quotation\.id\}\/pdf/)
})

test('service activation is a safe update and historical-reference delete conflicts are actionable', async () => {
  const [manager, route] = await Promise.all([
    read('src/components/admin/CelebrationServiceManager.tsx'),
    read('src/app/api/admin/celebration-services/[id]/route.ts'),
  ])
  assert.match(manager, /method: 'PATCH'/)
  assert.match(manager, /body: JSON\.stringify\(\{ isActive: !togglingService\.is_active \}\)/)
  assert.match(manager, /togglingService\?\.is_active \? 'Deactivate' : 'Activate'/)
  assert.match(manager, /Historical enquiries and quotation snapshots remain intact/)
  assert.match(route, /isActive: z\.boolean\(\)\.optional\(\)/)
  assert.match(route, /error\?\.code === '23503'/)
  assert.match(route, /status: 409/)
  assert.match(route, /Deactivate it instead/)
})

test('Phase 1 quotation transactions and PDF snapshot export remain wired in', async () => {
  const [createRoute, updateRoute, pdfRoute] = await Promise.all([
    read('src/app/api/admin/quotations/route.ts'),
    read('src/app/api/admin/quotations/[id]/route.ts'),
    read('src/app/api/admin/quotations/[id]/pdf/route.ts'),
  ])
  assert.match(createRoute, /rpc\('create_admin_quotation'/)
  assert.match(updateRoute, /rpc\('update_admin_quotation'/)
  assert.match(pdfRoute, /quotation_items'\)\.select\('service_name, quantity, unit_price, line_total'/)
  assert.match(pdfRoute, /Content-Type': 'application\/pdf'/)
})
