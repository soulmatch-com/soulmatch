import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

test('fixed plan core services are centralized service codes', async () => {
  const source = await read('src/lib/celebrations/celebration-plans.ts')
  for (const code of ['vadhyar', 'pooja_materials', 'marriage_hall', 'catering', 'accommodation', 'photography', 'videography', 'decoration', 'nadaswaram']) assert.match(source, new RegExp(`'${code}'`))
  assert.match(source, /includedServiceCodes: coreServiceCodes/)
})

test('no hard-coded service UUIDs or complete arrangement auto-selection exist in V2 model', async () => {
  const source = `${await read('src/lib/celebrations/celebration-plans.ts')}\n${await read('src/lib/celebrations/plan-v2-submission.ts')}`
  assert.doesNotMatch(source, uuidPattern)
  assert.doesNotMatch(source, /complete_arrangement/)
})

test('customers cannot deselect fixed plan services', async () => {
  const source = `${await read('src/components/celebrations/PlanConfirmationScreen.tsx')}\n${await read('src/lib/celebrations/plan-v2.ts')}`
  assert.match(source, /Plan Inclusions/)
  assert.doesNotMatch(source, /selectedServiceCodes|toggleServiceCode|groupedServices|serviceIds/)
})

test('missing required fixed plan service blocks V2 submission safely', async () => {
  const source = await read('src/lib/celebrations/plan-v2-submission.ts')
  assert.match(source, /buildPlanV2ServiceCodes/)
  assert.match(source, /resolvePlanV2ServiceIds/)
  assert.match(source, /One or more plan services are not available/)
})

test('Additional Requirements moved to Details and is not generic service selection', async () => {
  const [details, schema] = await Promise.all([
    read('src/components/celebrations/PlanDetailsScreen.tsx'),
    read('src/lib/celebrations/plan-v2-details.ts'),
  ])
  assert.match(details, /Additional Requirements/)
  assert.match(details, /Share any additional celebration requirements or family preferences/)
  assert.match(schema, /additionalRequirements: optionalText\(1000\)/)
})
