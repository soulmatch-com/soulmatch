import { expect, test, type Page, type Route } from '@playwright/test'

const mobile = { width: 375, height: 812 }
const tablet = { width: 768, height: 1024 }
const desktop = { width: 1280, height: 800 }
const syntheticEnquiryId = '00000000-0000-4000-8000-000000000006'
const runtimeErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(`console: ${message.text()}`)
    }
  })
})

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([])
})

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
}

async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  // Next hydration is intentionally asynchronous; wait for the browser to make
  // the first interactive control responsive before exercising it.
  const interactive = page.locator('button, input, summary').first()
  if (await interactive.count()) {
    await expect(interactive).toBeEnabled()
    await page.waitForTimeout(750)
  }
}

async function reachServices(page: Page, arrangement = 'ceremony-only', alreadyOnPlan = false) {
  if (!alreadyOnPlan) await visit(page, '/plan?ceremony=60th-marriage')
  await expect(page.locator('input[type="radio"][value="60th-marriage"]')).toBeChecked()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Husband Name').fill('Synthetic Husband')
  await page.getByLabel('Wife Name').fill('Synthetic Wife')
  await page.getByLabel('Husband Date of Birth').fill('1960-01-01')
  await page.getByLabel('Wife Date of Birth').fill('1962-02-02')
  await expect(page.getByRole('button', { name: 'Astrology details (optional)' })).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByLabel('Husband Nakshatra')).toBeHidden()
  await page.getByRole('button', { name: 'Astrology details (optional)' }).click()
  await page.getByLabel('Husband Nakshatra').fill('Synthetic Star')
  await page.getByLabel('Wife Rasi').fill('Synthetic Rasi')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Preferred Ceremony Date').fill('2027-02-01')
  await page.getByLabel('Alternative Date').fill('2027-02-02')
  await page.getByLabel('Number of Guests').selectOption('20-50')
  await page.getByLabel('Travelling From').fill('Synthetic City')
  await page.getByLabel('Arrangement Preference').selectOption(arrangement)
  await page.getByRole('button', { name: 'Continue' }).click()
}

async function reachContact(page: Page, selectService = true) {
  await reachServices(page)
  if (selectService) await page.locator('input[type="checkbox"][name="serviceIds"]').first().check()
  await page.getByLabel('Additional service requirement').fill('Synthetic accessibility requirement')
  await page.getByRole('button', { name: 'Continue' }).click()
  await fillContact(page)
}

async function fillContact(page: Page) {
  await page.getByLabel('Contact Person Name').fill('Synthetic Contact')
  await page.getByLabel('Mobile Number').fill('+10000000000')
  await page.getByLabel('Relationship to Couple').selectOption('Family Member')
  await page.getByLabel('Preferred Contact Method').selectOption('phone')
  await page.getByLabel('Additional Notes').fill('Synthetic browser release check')
}

async function mockSubmission(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route('**/api/celebrations/enquiries', handler)
}

for (const viewport of [mobile, tablet, desktop]) {
  test(`enquiry UX complete journey, grouped services, Review edits and copy at ${viewport.width}x${viewport.height}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    let requests = 0
    let submitted: Record<string, unknown> = {}
    await mockSubmission(page, async (route) => {
      requests += 1
      submitted = route.request().postDataJSON()
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, enquiryId: syntheticEnquiryId }) })
    })
    await visit(page, '/')
    await page.locator('main').getByRole('link', { name: /60th/ }).first().click()
    await expect(page).toHaveURL(/\/60th-marriage$/)
    await page.getByRole('link', { name: /Plan 60th/ }).click()
    await expect(page).toHaveURL(/\/plan\?ceremony=60th-marriage$/)
    await expect(page.getByText('Step 1 of 6')).toBeVisible()
    await reachServices(page, 'ceremony-only', true)
    for (const name of ['Ceremony', 'Food & Celebration', 'Stay & Travel', 'Additional Support']) await expect(page.getByRole('group', { name, exact: true })).toBeVisible()
    const priest = page.getByRole('checkbox', { name: /Vadhyar/ })
    await priest.focus()
    await page.keyboard.press('Space')
    await page.getByRole('checkbox', { name: /^Catering/ }).check()
    await page.getByRole('checkbox', { name: /^Accommodation/ }).check()
    await expect(page.getByRole('status')).toHaveText('3 services selected')
    const selectedIds = await page.locator('input[name="serviceIds"]:checked').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))
    await page.getByLabel('Additional service requirement').fill('Synthetic extra service detail')
    await expect(page.getByRole('status')).toHaveText('3 services selected')
    await expect(page.getByRole('button', { name: 'Continue' })).toBeInViewport()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('#celebration-form-heading')).toBeFocused()
    await expect(page.locator('#celebration-form-heading')).toBeInViewport()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(priest).toBeChecked()
    await expect(page.getByRole('status')).toHaveText('3 services selected')
    await page.getByRole('button', { name: 'Continue' }).click()
    await fillContact(page)
    await expect(page.getByRole('button', { name: 'Submit Planning Request' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Review request' })).toBeInViewport()
    await page.getByRole('button', { name: 'Review request' }).click()
    await expect(page.getByText('Step 6 of 6')).toBeVisible()
    const review = page.getByRole('region', { name: 'Review your planning request' })
    for (const text of ['60th — Sashtiapthapoorthi', '01/02/2027', '02/02/2027', 'Synthetic City', 'Ceremony Only', 'Vadhyar / Priest', 'Catering', 'Accommodation', '3 services selected', 'Synthetic Contact', '+10000000000', 'Family Member', 'Phone', 'Synthetic extra service detail']) await expect(review.getByText(text, { exact: true })).toBeVisible()
    await expect(review.locator('[lang="ta"]')).toContainText('திருமணம்')
    for (const id of selectedIds) await expect(review).not.toContainText(id)
    expect(requests).toBe(0)
    for (const [section, heading] of [['Ceremony', 'Ceremony details'], ['Couple details', 'Couple details'], ['Event details', 'Event details'], ['Services', 'Services details'], ['Contact', 'Contact details']]) {
      await page.getByRole('button', { name: `Edit ${section}`, exact: true }).click()
      await expect(page.locator('#celebration-form-heading')).toHaveText(heading)
      await expect(page.locator('#celebration-form-heading')).toBeFocused()
      await expect(page.locator('#celebration-form-heading')).toBeInViewport()
      if (section === 'Couple details') {
        await expect(page.getByLabel('Husband Nakshatra')).toHaveValue('Synthetic Star')
        await page.getByLabel('Husband Name').fill('Edited Husband')
      }
      if (section === 'Contact') await expect(page.getByLabel('Additional Notes')).toHaveValue('Synthetic browser release check')
      await page.getByRole('button', { name: 'Return to Review' }).click()
      await expect(page.getByRole('heading', { name: 'Review your planning request' })).toBeVisible()
    }
    await expect(review.getByText('Edited Husband')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`review-${viewport.width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Submit Planning Request' }).click()
    await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeInViewport()
    await expect(page.getByText(syntheticEnquiryId)).toBeVisible()
    await page.getByRole('button', { name: 'Copy reference' }).click()
    await expect(page.getByRole('status')).toHaveText('Reference copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(syntheticEnquiryId)
    await expect(page.locator('main')).not.toContainText('Synthetic Star')
    await expect(page.locator('main')).not.toContainText('Synthetic browser release check')
    await expect(page.locator('main')).not.toContainText('1960')
    await expectNoHorizontalOverflow(page)
    expect(submitted.husbandName).toBe('Edited Husband')
    expect(submitted.serviceIds).toEqual(selectedIds)
    expect(submitted).not.toHaveProperty('location')
    expect(submitted).not.toHaveProperty('status')
    expect(requests).toBe(1)
    await page.screenshot({ path: testInfo.outputPath(`confirmation-${viewport.width}.png`), fullPage: true })
  })
}

test('enquiry UX minimum supported details omits astrology and allows guidance without services', async ({ page }) => {
  await mockSubmission(page, async (route) => {
    const body = route.request().postDataJSON()
    expect(body.serviceIds).toEqual([])
    for (const field of ['husbandNakshatra', 'wifeNakshatra', 'husbandRasi', 'wifeRasi', 'alternativeDate']) expect(body).not.toHaveProperty(field)
    expect(body.husbandDob).toBe('1960-01-01')
    expect(body.preferredDate).toBe('2027-02-01')
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, enquiryId: syntheticEnquiryId }) })
  })
  await visit(page, '/plan')
  await page.locator('input[value="not-sure"]').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Husband Name').fill('Synthetic Husband')
  await page.getByLabel('Wife Name').fill('Synthetic Wife')
  await page.getByLabel('Husband Date of Birth').fill('1960-01-01')
  await page.getByLabel('Wife Date of Birth').fill('1962-02-02')
  await expect(page.getByRole('button', { name: 'Astrology details (optional)' })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Preferred Ceremony Date').fill('2027-02-01')
  await page.getByLabel('Number of Guests').selectOption('below-20')
  await page.getByLabel('Travelling From').fill('Synthetic City')
  await page.getByLabel('Arrangement Preference').selectOption('need-guidance')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await fillContact(page)
  await page.getByLabel('Additional Notes').fill('')
  await page.getByRole('button', { name: 'Review request' }).click()
  await expect(page.getByText('Not provided', { exact: true })).toBeVisible()
  await expect(page.getByText('0 services selected')).toBeVisible()
  await page.getByRole('button', { name: 'Submit Planning Request' }).click()
  await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeVisible()
})

test('enquiry UX complete arrangement is one service and invalid edits expose the correct step', async ({ page }) => {
  await reachContact(page)
  await page.getByRole('button', { name: 'Review request' }).click()
  await page.getByRole('button', { name: 'Edit Services', exact: true }).click()
  await page.locator('input[name="serviceIds"]:checked').uncheck()
  await page.getByRole('checkbox', { name: /^Complete Arrangement/ }).check()
  await expect(page.getByRole('status')).toHaveText('1 service selected')
  await expect(page.locator('input[name="serviceIds"]:checked')).toHaveCount(1)
  await page.getByRole('button', { name: 'Return to Review' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /^Complete Arrangement$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Edit Couple details', exact: true }).click()
  await page.getByLabel('Husband Nakshatra').fill('x'.repeat(101))
  await page.getByRole('button', { name: 'Astrology details (optional)' }).click()
  await page.getByRole('button', { name: 'Return to Review' }).click()
  await expect(page.getByRole('button', { name: 'Astrology details (optional)' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#husbandNakshatra-error')).toBeVisible()
  await page.getByLabel('Husband Nakshatra').fill('')
  await page.getByRole('button', { name: 'Return to Review' }).click()
  await expect(page.getByRole('heading', { name: 'Review your planning request' })).toBeVisible()
})

for (const failure of ['500', 'network', '429'] as const) {
  test(`enquiry UX ${failure} retains Review and retries successfully`, async ({ page }) => {
    let requests = 0
    const bodies: unknown[] = []
    await mockSubmission(page, async (route) => {
      requests += 1
      bodies.push(route.request().postDataJSON())
      if (requests === 1) {
        if (failure === 'network') await route.abort('failed')
        else await route.fulfill({ status: Number(failure), contentType: 'application/json', body: '{}' })
      } else await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, enquiryId: syntheticEnquiryId }) })
    })
    await reachContact(page)
    await page.getByRole('button', { name: 'Review request' }).click()
    await page.getByRole('button', { name: 'Submit Planning Request' }).click()
    await expect(page.locator('form').getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review your planning request' })).toBeVisible()
    await expect(page.getByText('Synthetic Contact', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Submit Planning Request' }).click()
    await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeVisible()
    expect(requests).toBe(2)
    expect(bodies[0]).toEqual(bodies[1])
  })
}

test('enquiry UX final validation navigates to an earlier step instead of silently failing', async ({ page }) => {
  let requests = 0
  await mockSubmission(page, async (route) => { requests += 1; await route.abort() })
  await reachContact(page)
  await page.getByRole('button', { name: 'Review request' }).click()
  // A changed date boundary makes an earlier DOB invalid at final validation.
  await page.clock.setFixedTime(new Date('1959-01-01T12:00:00Z'))
  await page.getByRole('button', { name: 'Submit Planning Request' }).click()
  await expect(page.locator('#celebration-form-heading')).toHaveText('Couple details')
  await expect(page.locator('#celebration-form-heading')).toBeFocused()
  await expect(page.locator('#husbandDob-error')).toHaveText('Date of birth cannot be in the future')
  await expect(page.getByLabel('Husband Name')).toHaveValue('Synthetic Husband')
  expect(requests).toBe(0)
})

test('enquiry UX server field errors on Review have a usable edit and retry path', async ({ page }) => {
  let requests = 0
  await mockSubmission(page, async (route) => {
    requests += 1
    await route.fulfill({ status: requests === 1 ? 400 : 201, contentType: 'application/json', body: JSON.stringify(requests === 1 ? { errors: { husbandName: ['Please check the husband name.'] } } : { success: true, enquiryId: syntheticEnquiryId }) })
  })
  await reachContact(page)
  await page.getByRole('button', { name: 'Review request' }).click()
  await page.getByRole('button', { name: 'Submit Planning Request' }).click()
  await expect(page.getByText('Please check the husband name.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Review your planning request' })).toBeVisible()
  await page.getByRole('button', { name: 'Correct Couple details', exact: true }).click()
  await expect(page.locator('#husbandName-error')).toBeVisible()
  await page.getByLabel('Husband Name').fill('Corrected Husband')
  await page.getByRole('button', { name: 'Return to Review' }).click()
  await page.getByRole('button', { name: 'Submit Planning Request' }).click()
  await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeVisible()
  expect(requests).toBe(2)
})

test('enquiry UX mobile actions remain usable with a reduced viewport and keyboard navigation', async ({ page }, testInfo) => {
  await page.setViewportSize(mobile)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await reachContact(page)
  // Reduced available height approximates the space left by an on-screen keyboard.
  await page.setViewportSize({ width: mobile.width, height: 430 })
  await page.getByLabel('Additional Notes').focus()
  await page.keyboard.type(' More details')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport()
  await page.keyboard.press('Tab')
  const reviewButton = page.getByRole('button', { name: 'Review request' })
  await expect(reviewButton).toBeFocused()
  await expect(reviewButton).toBeInViewport()
  const bounds = await reviewButton.boundingBox()
  expect(bounds?.height).toBeGreaterThanOrEqual(48)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('mobile-reduced-viewport.png') })
  await page.keyboard.press('Enter')
  await expect(page.locator('#celebration-form-heading')).toHaveText('Review details')
  await expect(page.locator('#celebration-form-heading')).toBeInViewport()
})

test('homepage and public matrimonial pages render responsively', async ({ page }, testInfo) => {
  await page.route('**/api/success-stories**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ stories: [], total: 0, pagination: { limit: 6, offset: 0, hasMore: false } }),
  }))
  for (const viewport of [mobile, tablet, desktop]) {
    await page.setViewportSize(viewport)
    await visit(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sacred Milestones')
    await expect(page.getByText('60ஆம் திருமணம்', { exact: false })).toBeVisible()
    await expect(page.getByText('Family Success Stories')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('\uFFFD')
    await expectNoHorizontalOverflow(page)
    if (viewport.width !== tablet.width) await page.screenshot({ path: testInfo.outputPath(`homepage-${viewport.width}.png`), fullPage: true })
  }
  for (const path of ['/matrimony', '/signup', '/login']) {
    await visit(page, path)
    await expect(page.locator('main, form').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
})

test('desktop header exposes direct ceremony navigation with branded active states', async ({ page }) => {
  await page.setViewportSize(desktop)
  await visit(page, '/')
  const header = page.locator('header')
  await expect(header.getByRole('button', { name: 'Celebrations' })).toHaveCount(0)
  for (const name of ['Home', '60th Marriage', '70th Marriage', '80th Marriage', 'Plan Celebration', 'Matrimony']) await expect(header.getByRole('link', { name, exact: true })).toBeVisible()
  await expect(header.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(header.getByRole('link', { name: 'Matrimony', exact: true })).not.toHaveClass(/text-blue/)
  await header.getByRole('link', { name: '60th Marriage' }).focus()
  await expect(header.getByRole('link', { name: '60th Marriage' })).toBeFocused()
  await header.getByRole('link', { name: '60th Marriage' }).click()
  await expect(page).toHaveURL(/\/60th-marriage$/)
  await expect(page.locator('header').getByRole('link', { name: '60th Marriage' })).toHaveAttribute('aria-current', 'page')
  await expectNoHorizontalOverflow(page)
})

test('anonymous header separates Celebrations and Matrimony conversion actions', async ({ page }) => {
  await page.setViewportSize(desktop)
  for (const path of ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/plan']) {
    await visit(page, path)
    const header = page.locator('header')
    await expect(header.getByRole('link', { name: 'Plan Celebration' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Matrimony', exact: true })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Sign In' })).toHaveCount(0)
    await expect(header.getByRole('link', { name: 'Get Started' })).toHaveCount(0)
    await expect(header.getByRole('link', { name: 'Create Profile' })).toHaveCount(0)
  }

  await visit(page, '/matrimony')
  const matrimonyHeader = page.locator('header')
  await expect(matrimonyHeader.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
  await expect(matrimonyHeader.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/signup')

  await page.setViewportSize(mobile)
  await visit(page, '/')
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  const mobileHeader = page.locator('header')
  await expect(mobileHeader.getByRole('link', { name: 'Plan Celebration' })).toBeVisible()
  await expect(mobileHeader.getByRole('link', { name: 'Matrimony', exact: true })).toBeVisible()
  await expect(mobileHeader.getByRole('link', { name: 'Sign In' })).toHaveCount(0)
  await expect(mobileHeader.getByRole('link', { name: 'Get Started' })).toHaveCount(0)

  await page.setViewportSize(tablet)
  await visit(page, '/')
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await expect(page.locator('#mobile-primary-menu').getByRole('link', { name: '80th Marriage' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.setViewportSize(mobile)
  await visit(page, '/matrimony')
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await expect(page.locator('header').getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
  await expect(page.locator('header').getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/signup')
})

test('mobile navigation disclosure is accessible and closes after navigation', async ({ page }) => {
  await page.setViewportSize(mobile)
  await visit(page, '/')
  const menu = page.getByRole('button', { name: 'Toggle menu' })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(menu).toHaveAttribute('aria-controls', 'mobile-primary-menu')
  await expect(page.getByRole('button', { name: 'Celebrations' })).toHaveCount(0)
  const mobileMenu = page.locator('#mobile-primary-menu')
  for (const name of ['Home', '60th Marriage', '70th Marriage', '80th Marriage', 'Plan Celebration', 'Matrimony']) await expect(mobileMenu.getByRole('link', { name, exact: true })).toBeVisible()
  await mobileMenu.getByRole('link', { name: '70th Marriage', exact: true }).click()
  await expect(page).toHaveURL(/\/70th-marriage$/)
  await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'false')
  await expectNoHorizontalOverflow(page)
})

test('Celebrations pages and live service catalogue render across viewports', async ({ page }, testInfo) => {
  for (const viewport of [mobile, tablet, desktop]) {
    await page.setViewportSize(viewport)
    await visit(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sacred Milestones')
    await expect(page.getByText('திருக்கடையூர் குடும்ப விழாக்கள்')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('\uFFFD')
    await expectNoHorizontalOverflow(page)
    if (viewport.width !== tablet.width) await page.screenshot({ path: testInfo.outputPath(`thirukadaiyur-${viewport.width}.png`), fullPage: true })
  }
  const serviceCards = page.locator('section').filter({ hasText: 'Services you can request' }).getByRole('listitem')
  await expect(serviceCards).toHaveCount(14)
  await page.getByText('Which celebrations can MyThirumanam help plan?').click()
  await expect(page.getByText(/initial Thirukadaiyur offering covers/)).toBeVisible()
})

test('all ceremony pages render distinct content and Plan links preserve ceremony', async ({ page }, testInfo) => {
  const cases = [
    ['60th-marriage', 'Sashtiapthapoorthi'],
    ['70th-marriage', 'Bheemaratha Shanthi'],
    ['80th-marriage', 'Sathabhishekam'],
  ] as const
  for (const [slug, name] of cases) {
    await visit(page, `/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(slug.slice(0, 4))
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    if (slug === '60th-marriage') await page.screenshot({ path: testInfo.outputPath('60th-page-1280.png'), fullPage: true })
    await page.getByRole('link', { name: new RegExp(`Plan ${slug.slice(0, 4)}`) }).click()
    await expect(page).toHaveURL(new RegExp(`/plan\\?ceremony=${slug}$`))
  }
})

test('ceremony query preselection is safe and remains changeable', async ({ page }, testInfo) => {
  for (const slug of ['60th-marriage', '70th-marriage', '80th-marriage']) {
    await visit(page, `/plan?ceremony=${slug}`)
    await expect(page.locator(`input[type="radio"][value="${slug}"]`)).toBeChecked()
    if (slug === '60th-marriage') {
      await page.setViewportSize(mobile)
      await page.screenshot({ path: testInfo.outputPath('plan-step-1-375.png'), fullPage: true })
      await page.setViewportSize(desktop)
      await page.screenshot({ path: testInfo.outputPath('plan-step-1-1280.png'), fullPage: true })
    }
  }
  await visit(page, '/plan?ceremony=unsafe')
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0)
  await page.locator('input[type="radio"][value="not-sure"]').check()
  await expect(page.locator('input[type="radio"][value="not-sure"]')).toBeChecked()
})

test('six-step form validates fields and preserves values and services across Back/Next', async ({ page }, testInfo) => {
  await page.setViewportSize(mobile)
  await visit(page, '/plan')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Please select the ceremony.')).toBeVisible()
  await page.locator('input[type="radio"][value="60th-marriage"]').click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Couple details', level: 3 })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Husband name is required')).toBeVisible()
  await page.getByLabel('Husband Date of Birth').fill('2999-01-01')
  await expect(page.getByLabel('Husband Date of Birth')).toHaveValue('2999-01-01')
  await page.getByLabel('Husband Name').fill('Synthetic Husband')
  await page.getByLabel('Wife Name').fill('Synthetic Wife')
  await page.getByLabel('Wife Date of Birth').fill('1962-02-02')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Date of birth cannot be in the future')).toBeVisible()
  await page.getByLabel('Husband Date of Birth').fill('1960-01-01')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Preferred Ceremony Date').fill('2027-02-01')
  await page.getByLabel('Alternative Date').fill('2027-02-01')
  await page.getByLabel('Number of Guests').selectOption('20-50')
  await page.getByLabel('Travelling From').fill('Synthetic City')
  await page.getByLabel('Arrangement Preference').selectOption('ceremony-only')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Alternative date must differ from preferred date')).toBeVisible()
  await page.getByLabel('Alternative Date').fill('2027-02-02')
  await page.getByRole('button', { name: 'Continue' }).click()
  const firstService = page.locator('input[type="checkbox"][name="serviceIds"]').first()
  await firstService.focus()
  await page.keyboard.press('Space')
  await expect(firstService).toBeChecked()
  await page.screenshot({ path: testInfo.outputPath('plan-services-375.png'), fullPage: true })
  await page.getByLabel('Additional service requirement').fill('Synthetic requirement')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByLabel('Travelling From')).toHaveValue('Synthetic City')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(firstService).toBeChecked()
  await expect(page.getByLabel('Additional service requirement')).toHaveValue('Synthetic requirement')
  await expectNoHorizontalOverflow(page)
})

test('Need Guidance permits zero services while other arrangements do not', async ({ page }) => {
  await reachServices(page, 'ceremony-only')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText(/select at least one service/i)).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByLabel('Arrangement Preference').selectOption('need-guidance')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Contact details', level: 3 })).toBeVisible()
})

test('contact validation requires email only when email is preferred', async ({ page }, testInfo) => {
  await page.setViewportSize(mobile)
  await reachContact(page)
  await page.screenshot({ path: testInfo.outputPath('plan-contact-375.png'), fullPage: true })
  await page.getByLabel('Preferred Contact Method').selectOption('email')
  await page.getByRole('button', { name: 'Review request' }).click()
  await expect(page.getByText('Email is required when email is your preferred contact method')).toBeVisible()
  await page.getByLabel('Email').fill('synthetic@example.invalid')
  await page.getByLabel('Preferred Contact Method').selectOption('whatsapp')
  await expect(page.getByLabel('Mobile Number')).toHaveValue('+10000000000')
})

test('mocked success shows the real response reference and prevents double submit', async ({ page }, testInfo) => {
  await page.setViewportSize(mobile)
  let requests = 0
  await mockSubmission(page, async (route) => {
    requests += 1
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, enquiryId: syntheticEnquiryId }) })
  })
  await reachContact(page)
  await page.getByRole('button', { name: 'Review request' }).click()
  const submit = page.getByRole('button', { name: 'Submit Planning Request' })
  await submit.dblclick()
  await expect(page.getByText('Submitting…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Planning request submitted' })).toBeInViewport()
  await expect(page.getByText(syntheticEnquiryId)).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('success-375.png'), fullPage: true })
  expect(requests).toBe(1)
})

for (const response of [
  [400, 'Please check the highlighted details and try again.'],
  [403, "We couldn't verify the submission. Please complete the verification and try again."],
  [413, 'Your request contains too much information. Please shorten the notes or additional details and try again.'],
  [429, 'Too many requests. Please wait a little while and try again.'],
  [500, "We couldn't submit your request right now. Please try again."],
] as const) {
  test(`HTTP ${response[0]} preserves final-step data with safe UX`, async ({ page }) => {
    await mockSubmission(page, async (route) => {
      const body = response[0] === 400 ? { success: false, message: 'Invalid enquiry details.', errors: { contactName: ['Please check this field.'] } } : { success: false, message: 'Internal detail must not be shown.' }
      await route.fulfill({ status: response[0], headers: response[0] === 429 ? { 'Retry-After': '30' } : {}, contentType: 'application/json', body: JSON.stringify(body) })
    })
    await reachContact(page)
    await page.getByRole('button', { name: 'Review request' }).click()
    await page.getByRole('button', { name: 'Submit Planning Request' }).click()
    await expect(page.getByText(response[1])).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review your planning request' })).toBeVisible()
    await expect(page.getByText('Synthetic Contact', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByLabel('Contact Person Name')).toHaveValue('Synthetic Contact')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('input[type="checkbox"][name="serviceIds"]').first()).toBeChecked()
  })
}

test('network failure retains data and clears pending state', async ({ page }) => {
  await mockSubmission(page, async (route) => route.abort('failed'))
  await reachContact(page)
  await page.getByRole('button', { name: 'Review request' }).click()
  await page.getByRole('button', { name: 'Submit Planning Request' }).click()
  await expect(page.getByText(/check your connection and try again/i)).toBeVisible()
  await expect(page.getByText('Synthetic Contact', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit Planning Request' })).toBeEnabled()
})

test('legacy redirects, sitemap and robots resolve in the real browser', async ({ page }) => {
  const redirects = [
    ['/celebrations', '/'],
    ['/celebrations/thirukadaiyur', '/'],
    ['/celebrations/thirukadaiyur/60th-marriage', '/60th-marriage'],
    ['/celebrations/thirukadaiyur/70th-marriage', '/70th-marriage'],
    ['/celebrations/thirukadaiyur/80th-marriage', '/80th-marriage'],
    ['/celebrations/thirukadaiyur/plan', '/plan'],
    ['/celebrations/60th-marriage', '/60th-marriage'],
    ['/celebrations/70th-marriage', '/70th-marriage'],
    ['/celebrations/80th-marriage', '/80th-marriage'],
    ['/celebrations/enquire', '/plan'],
  ]
  for (const [from, to] of redirects) {
    await visit(page, from)
    await expect(page).toHaveURL(new RegExp(`${to}$`))
  }
  const sitemap = await page.request.get('/sitemap.xml')
  expect(await sitemap.text()).toContain('/80th-marriage')
  expect(await sitemap.text()).toContain('/matrimony')
  expect(await sitemap.text()).not.toContain('/plan')
  expect((await page.request.get('/robots.txt')).ok()).toBe(true)
})

test('rendered SEO metadata and structured data use canonical short routes', async ({ page }) => {
  const pages = [
    ['/', 'Thirukadaiyur 60th, 70th & 80th Marriage | MyThirumanam', 'https://mythirumanam.in'],
    ['/60th-marriage', 'Thirukadaiyur 60th Marriage | Sashtiapthapoorthi', 'https://mythirumanam.in/60th-marriage'],
    ['/70th-marriage', 'Thirukadaiyur 70th Marriage | Bheemaratha Shanthi', 'https://mythirumanam.in/70th-marriage'],
    ['/80th-marriage', 'Thirukadaiyur 80th Marriage | Sathabhishekam', 'https://mythirumanam.in/80th-marriage'],
    ['/matrimony', 'Tamil Matrimony | MyThirumanam', 'https://mythirumanam.in/matrimony'],
  ] as const
  for (const [path, title, canonical] of pages) {
    await visit(page, path)
    await expect(page).toHaveTitle(title)
    expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(80)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical)
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'MyThirumanam')
  }

  await visit(page, '/')
  expect(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')['@type']).toBe('WebSite')
  await visit(page, '/60th-marriage')
  const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')['@graph']
  expect(graph.map((item: { '@type': string }) => item['@type'])).toEqual(['WebPage', 'Service', 'BreadcrumbList'])
  expect(JSON.stringify(graph)).not.toContain('/celebrations/')

  for (const path of ['/plan', '/login', '/signup']) {
    await visit(page, path)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  }
})

test('About page renders services, bilingual content, canonical metadata, and responsive layout', async ({ page }) => {
  for (const viewport of [mobile, tablet, desktop]) {
    await page.setViewportSize(viewport)
    await visit(page, '/about')
    await expect(page.locator('header')).toHaveCount(1)
    await expect(page.locator('footer')).toHaveCount(1)
    await expect(page.locator('header img[alt="MyThirumanam"]')).toHaveAttribute('src', /mythirumanam-logo\.png/)
    await expect(page.locator('header a[href="/plan"]', { hasText: 'Plan Celebration' })).toHaveAttribute('href', '/plan')
    await expect(page.locator('header a[href="/matrimony"]', { hasText: 'Matrimony' })).toHaveAttribute('href', '/matrimony')
    await expect(page.locator('header').getByRole('link', { name: 'Sign In' })).toHaveCount(0)
    await expect(page.locator('header').getByRole('link', { name: 'Get Started' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'About MyThirumanam' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start Planning' }).first()).toHaveAttribute('href', '/plan')
    await expect(page.getByRole('link', { name: 'View 60th Marriage' })).toHaveAttribute('href', '/60th-marriage')
    await expect(page.getByRole('link', { name: 'View 70th Marriage' })).toHaveAttribute('href', '/70th-marriage')
    await expect(page.getByRole('link', { name: 'View 80th Marriage' })).toHaveAttribute('href', '/80th-marriage')
    await expect(page.locator('[lang="ta"]').first()).toBeVisible()
    await expect(page.locator('section').filter({ hasText: 'Everything Your Family Needs' }).getByRole('listitem')).toHaveCount(14)
    await expect(page.locator('section').filter({ hasText: 'Everything Your Family Needs' }).locator('li svg')).toHaveCount(14)
    await expect(page.locator('section').filter({ hasText: 'Family-Focused From the First Step' }).locator('article svg')).toHaveCount(4)
    await expect(page.locator('section').filter({ hasText: 'Simple Planning. Clear Next Steps.' }).locator('ol > li > span')).toHaveCount(4)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://mythirumanam.in/about')
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'MyThirumanam')
    const structuredData = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')
    expect(structuredData['@type']).toBe('AboutPage')
    expect(structuredData.url).toBe('https://mythirumanam.in/about')
    await expect(page.locator('footer').getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/about')
    await expectNoHorizontalOverflow(page)
  }
})
