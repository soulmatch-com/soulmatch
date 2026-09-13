import { expect, test } from '@playwright/test'
import { createCelebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema'
import { getCelebrationDateBounds } from '../src/lib/celebrations/date'

const fixedDate = new Date(2026, 8, 6, 12, 0, 0)
const viewports = [{ width: 375, height: 812 }, { width: 1280, height: 800 }]

const basePayload = {
  celebrationType: '60th-marriage',
  husbandName: 'Synthetic Husband',
  wifeName: 'Synthetic Wife',
  husbandDob: '2000-01-01',
  wifeDob: '2000-01-01',
  husbandNakshatra: '',
  wifeNakshatra: '',
  husbandRasi: '',
  wifeRasi: '',
  preferredDate: '2026-09-06',
  alternativeDate: '2026-09-07',
  guestCountRange: '20-50',
  travellingFrom: 'Chennai',
  arrangementPreference: 'need-guidance',
  contactName: 'Synthetic Contact',
  mobile: '+10000000000',
  email: '',
  relationship: 'Family Member',
  preferredContactMethod: 'phone',
  serviceIds: [],
  otherServiceDetails: '',
  notes: '',
}

function makePayload(overrides: Partial<typeof basePayload> = {}) {
  return { ...basePayload, ...overrides }
}

for (const viewport of viewports) {
  test(`browser date inputs and inline validation at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.clock.setFixedTime(fixedDate)
    const bounds = getCelebrationDateBounds(fixedDate)

    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: /Sashtiapthapoorthi/ }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByLabel('Husband Date of Birth')).toHaveAttribute('min', bounds.minDateOfBirth)
    await expect(page.getByLabel('Husband Date of Birth')).toHaveAttribute('max', bounds.maxDateOfBirth)
    await expect(page.getByLabel('Wife Date of Birth')).toHaveAttribute('min', bounds.minDateOfBirth)
    await expect(page.getByLabel('Wife Date of Birth')).toHaveAttribute('max', bounds.maxDateOfBirth)

    await page.getByLabel('Husband Name').fill('Synthetic Husband')
    await page.getByLabel('Wife Name').fill('Synthetic Wife')
    await page.getByLabel('Husband Date of Birth').fill('2025-01-01')
    await page.getByLabel('Wife Date of Birth').fill('2000-01-01')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Husband must be at least 18 years old.')).toBeVisible()
    await expect(page.locator('#couple-heading')).toBeVisible()

    await page.getByLabel('Husband Date of Birth').fill('2000-01-01')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Preferred Ceremony Date').fill('2026-09-05')
    await page.getByLabel('Alternative Date').fill('2026-09-07')
    await page.getByLabel('Number of Guests').selectOption('20-50')
    await page.getByLabel('Travelling From').fill('Chennai')
    await page.getByLabel('Arrangement Preference').selectOption('need-guidance')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Preferred date cannot be in the past.')).toBeVisible()

    await page.getByLabel('Preferred Ceremony Date').fill('2026-09-06')
    await page.getByLabel('Alternative Date').fill('2026-09-01')
    await page.getByLabel('Number of Guests').selectOption('20-50')
    await page.getByLabel('Travelling From').fill('Chennai')
    await page.getByLabel('Arrangement Preference').selectOption('need-guidance')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Alternative date cannot be in the past.')).toBeVisible()

    await page.getByLabel('Alternative Date').fill('2026-09-07')
    await page.getByLabel('Number of Guests').selectOption('20-50')
    await page.getByLabel('Travelling From').fill('Chennai')
    await page.getByLabel('Arrangement Preference').selectOption('need-guidance')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('You may continue without selecting a service because you requested guidance.')).toBeVisible()

    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByLabel('Preferred Ceremony Date').fill('2026-09-06')
    await page.getByLabel('Alternative Date').fill('2026-09-06')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Alternative date must differ from preferred date')).toBeVisible()
  })
}

test('server rejects tampered date values before persistence', async ({ request }) => {
  const preferredDateResponse = await request.post('/api/celebrations/enquiries', {
    data: makePayload({ preferredDate: '2026-09-05' }),
  })
  expect(preferredDateResponse.status()).toBe(400)
  const preferredDateBody = await preferredDateResponse.json()
  expect(preferredDateBody.errors.preferredDate).toContain('Preferred date cannot be in the past.')

  const alternativeDateResponse = await request.post('/api/celebrations/enquiries', {
    data: makePayload({ alternativeDate: '2026-09-01' }),
  })
  expect(alternativeDateResponse.status()).toBe(400)
  const alternativeDateBody = await alternativeDateResponse.json()
  expect(alternativeDateBody.errors.alternativeDate).toContain('Alternative date cannot be in the past.')

  const husbandDobResponse = await request.post('/api/celebrations/enquiries', {
    data: makePayload({ husbandDob: '2025-01-01' }),
  })
  expect(husbandDobResponse.status()).toBe(400)
  const husbandDobBody = await husbandDobResponse.json()
  expect(husbandDobBody.errors.husbandDob).toContain('Husband must be at least 18 years old.')

  const wifeDobResponse = await request.post('/api/celebrations/enquiries', {
    data: makePayload({ wifeDob: '2025-01-01' }),
  })
  expect(wifeDobResponse.status()).toBe(400)
  const wifeDobBody = await wifeDobResponse.json()
  expect(wifeDobBody.errors.wifeDob).toContain('Wife must be at least 18 years old.')
})

test('shared schema accepts exact boundary dates and rejects the edge cases', () => {
  const schema = createCelebrationEnquiryApiSchema(fixedDate)
  const cases = [
    [{ preferredDate: '2026-09-05', alternativeDate: '2026-09-07' }, false],
    [{ preferredDate: '2026-09-06', alternativeDate: '2026-09-07' }, true],
    [{ preferredDate: '2026-09-07', alternativeDate: '2026-09-08' }, true],
    [{ preferredDate: '2026-09-06', alternativeDate: '2026-09-01' }, false],
    [{ preferredDate: '2026-09-06', alternativeDate: '2026-10-01' }, true],
    [{ husbandDob: '2025-01-01' }, false],
    [{ husbandDob: '2010-01-01' }, false],
    [{ husbandDob: '2008-09-07' }, false],
    [{ husbandDob: '2008-09-06' }, true],
    [{ husbandDob: '2000-01-01' }, true],
    [{ husbandDob: '1906-09-06' }, true],
    [{ husbandDob: '1906-09-05' }, false],
    [{ husbandDob: '2027-01-01' }, false],
    [{ wifeDob: '2025-01-01' }, false],
    [{ wifeDob: '2008-09-06' }, true],
    [{ wifeDob: '1906-09-05' }, false],
  ] as const

  for (const [overrides, expected] of cases) {
    const result = schema.safeParse(makePayload(overrides))
    expect(result.success, JSON.stringify(overrides)).toBe(expected)
  }
})
