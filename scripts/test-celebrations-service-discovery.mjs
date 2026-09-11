import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { groupCelebrationServices, getCelebrationServiceGroup } from '../src/lib/celebrations/service-presentation.ts'
import { getCelebrationServicePresentation } from '../src/lib/celebrations/service-query.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

function service(code, displayOrder = 1) {
  return {
    id: `${String(displayOrder).padStart(8, '0')}-1111-4111-8111-111111111111`,
    code,
    name: `${code} from database`,
    description: `${code} description from database`,
    icon: null,
    display_order: displayOrder,
  }
}

test('services still originate from the Supabase helper path', async () => {
  const [home, pageData, services, query] = await Promise.all([
    read('src/app/celebrations/thirukadaiyur/page.tsx'),
    read('src/lib/celebrations/page-data.ts'),
    read('src/lib/celebrations/services.ts'),
    read('src/lib/celebrations/service-query.ts'),
  ])

  assert.match(home, /await loadCelebrationServices\(\)/)
  assert.match(pageData, /getThirukadaiyurCelebrationServices\(\)/)
  assert.match(services, /queryActiveCelebrationServices\(client, 'thirukadaiyur'\)/)
  assert.match(query, /\.from\('celebration_services'\)/)
  assert.match(query, /\.select\(SERVICE_FIELDS\)/)
  assert.match(query, /\.eq\('is_active', true\)/)
})

test('public service presentation does not introduce a hard-coded catalogue or UUID list', async () => {
  const [home, component, grouping] = await Promise.all([
    read('src/app/celebrations/thirukadaiyur/page.tsx'),
    read('src/components/celebrations/CelebrationServices.tsx'),
    read('src/lib/celebrations/service-presentation.ts'),
  ])
  const source = `${home}\n${component}\n${grouping}`

  assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  assert.doesNotMatch(source, /serviceCatalogue|hardCodedServices|fallbackServices/)
})

test('grouping uses service.code and maps known services to discovery groups', () => {
  assert.equal(getCelebrationServiceGroup({ code: 'vadhyar' }), 'Ceremony Support')
  assert.equal(getCelebrationServiceGroup({ code: 'pooja_materials' }), 'Ceremony Support')
  assert.equal(getCelebrationServiceGroup({ code: 'marriage_hall' }), 'Ceremony Support')
  assert.equal(getCelebrationServiceGroup({ code: 'temple_coordination' }), 'Ceremony Support')
  assert.equal(getCelebrationServiceGroup({ code: 'nadaswaram' }), 'Ceremony Support')
  assert.equal(getCelebrationServiceGroup({ code: 'catering' }), 'Food & Celebration')
  assert.equal(getCelebrationServiceGroup({ code: 'decoration' }), 'Food & Celebration')
  assert.equal(getCelebrationServiceGroup({ code: 'photography' }), 'Food & Celebration')
  assert.equal(getCelebrationServiceGroup({ code: 'videography' }), 'Food & Celebration')
  assert.equal(getCelebrationServiceGroup({ code: 'accommodation' }), 'Stay & Travel')
  assert.equal(getCelebrationServiceGroup({ code: 'transportation' }), 'Stay & Travel')
  assert.equal(getCelebrationServiceGroup({ code: 'invitations' }), 'Additional Arrangements')
  assert.equal(getCelebrationServiceGroup({ code: 'return_gifts' }), 'Additional Arrangements')
  assert.equal(getCelebrationServiceGroup({ code: 'complete_arrangement' }), 'Additional Arrangements')
})

test('unknown service codes remain visible in Other Services', () => {
  const grouped = groupCelebrationServices([service('vadhyar'), service('future_service', 2)])
  assert.deepEqual(grouped.map((group) => group.name), ['Ceremony Support', 'Other Services'])
  assert.equal(grouped.find((group) => group.name === 'Other Services')?.services[0].code, 'future_service')
})

test('service names still come from backend presentation except temple-safe override', () => {
  assert.equal(getCelebrationServicePresentation(service('catering')).name, 'catering from database')
  assert.equal(getCelebrationServicePresentation(service('temple_coordination')).name, 'Temple-related Planning Assistance')
})

test('public component reuses the icon resolver and backend presentation source', async () => {
  const component = await read('src/components/celebrations/CelebrationServices.tsx')
  assert.match(component, /getCelebrationServiceIcon\(service\.icon\)/)
  assert.match(component, /getCelebrationServicePresentation\(service\)/)
  assert.match(component, /groupCelebrationServices\(services\)/)
})

test('temple service keeps internal code and uses authority-safe wording', async () => {
  const [query, grouping] = await Promise.all([
    read('src/lib/celebrations/service-query.ts'),
    read('src/lib/celebrations/service-presentation.ts'),
  ])

  assert.match(query, /service\.code === 'temple_coordination'/)
  assert.match(grouping, /temple_coordination: 'Ceremony Support'/)
  assert.match(query, /Temple-related Planning Assistance/)
  assert.doesNotMatch(query, /official temple|authorized temple|temple booking portal|direct temple contact/i)
})

test('Complete Arrangement is presented as broader support without selecting all services', async () => {
  const [component, form] = await Promise.all([
    read('src/components/celebrations/CelebrationServices.tsx'),
    read('src/components/celebrations/CelebrationEnquiryForm.tsx'),
  ])

  assert.match(component, /service\.code === 'complete_arrangement'/)
  assert.match(component, /Need broader planning support\? Choose Complete Arrangement/)
  assert.doesNotMatch(component, /all-inclusive|premium|package/i)
  assert.doesNotMatch(form, /setValue\('serviceIds'/)
})

test('homepage service CTA points to the existing plan form', async () => {
  const home = await read('src/app/celebrations/thirukadaiyur/page.tsx')
  assert.match(home, /Need help choosing\?/)
  assert.match(home, /Tell us what your family needs and select the services that suit your celebration\./)
  assert.match(home, /href="\/plan"/)
})

test('service discovery avoids unsupported claims, pricing, and package terminology', async () => {
  const [home, component, grouping] = await Promise.all([
    read('src/app/celebrations/thirukadaiyur/page.tsx'),
    read('src/components/celebrations/CelebrationServices.tsx'),
    read('src/lib/celebrations/service-presentation.ts'),
  ])
  const source = `${home}\n${component}\n${grouping}`

  assert.doesNotMatch(source, /15\+|250\+|100% satisfaction|No\.1|Most Trusted|Thousands of Families/i)
  assert.doesNotMatch(source, /basic package|premium package|gold package|silver package|pricing|price|payment/i)
})
