import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('wizard is Plan, Details, Review with no custom service step', async () => {
  const [config, flow] = await Promise.all([
    read('src/lib/celebrations/plan-v2.ts'),
    read('src/components/celebrations/PlanV2Flow.tsx'),
  ])
  for (const label of ['Plan', 'Details', 'Review']) assert.match(config, new RegExp(`label: '${label}'`))
  assert.doesNotMatch(`${config}\n${flow}`, /customise|Customise/)
})

test('Plan step displays fixed plan inclusions and optional add-ons', async () => {
  const source = await read('src/components/celebrations/PlanConfirmationScreen.tsx')
  assert.match(source, /Plan Inclusions/)
  assert.match(source, /Optional Add-ons/)
  assert.match(source, /celebrationAddonCodes/)
  assert.match(source, /Continue to Details/)
  assert.doesNotMatch(source, /Starting Services|Continue to Customise/)
})

test('only transportation and return gifts are customer-selectable add-ons', async () => {
  const [plans, screen] = await Promise.all([
    read('src/lib/celebrations/celebration-plans.ts'),
    read('src/components/celebrations/PlanConfirmationScreen.tsx'),
  ])
  assert.match(plans, /celebrationAddonCodes = \['transportation', 'return_gifts'\]/)
  assert.match(screen, /isCelebrationAddonCode/)
  assert.doesNotMatch(screen, /groupCelebrationServices|services\.map\(\(service\)/)
})

test('add-on selection can be toggled and survives through shared state', async () => {
  const [screen, flow] = await Promise.all([
    read('src/components/celebrations/PlanConfirmationScreen.tsx'),
    read('src/components/celebrations/PlanV2Flow.tsx'),
  ])
  assert.match(screen, /selectedAddonCodes\.includes/)
  assert.match(screen, /selectedAddonCodes\.filter/)
  assert.match(flow, /selectedAddonCodes: planChanged \? \[\] : current\.selectedAddonCodes/)
})

test('plan selection page uses Basic and Premium terminology plus Tamil labels', async () => {
  const source = `${await read('src/components/celebrations/ArrangementSelector.tsx')}\n${await read('src/lib/celebrations/celebration-plans.ts')}`
  assert.match(source, /Basic Plan/)
  assert.match(source, /Premium Plan/)
  assert.match(source, /அடிப்படை ஏற்பாடு/)
  assert.match(source, /பிரீமியம் ஏற்பாடு/)
  assert.doesNotMatch(source, /Most Popular|Package|price|₹/)
})
