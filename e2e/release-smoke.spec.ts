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

async function reachServices(page: Page, arrangement = 'ceremony-only') {
  await visit(page, '/plan?ceremony=60th-marriage')
  await expect(page.locator('input[type="radio"][value="60th-marriage"]')).toBeChecked()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Husband Name').fill('Synthetic Husband')
  await page.getByLabel('Wife Name').fill('Synthetic Wife')
  await page.getByLabel('Husband Date of Birth').fill('1960-01-01')
  await page.getByLabel('Wife Date of Birth').fill('1962-02-02')
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
  await page.getByLabel('Contact Person Name').fill('Synthetic Contact')
  await page.getByLabel('Mobile Number').fill('+10000000000')
  await page.getByLabel('Relationship to Couple').selectOption('Family Member')
  await page.getByLabel('Preferred Contact Method').selectOption('phone')
  await page.getByLabel('Additional Notes').fill('Synthetic browser release check')
}

async function mockSubmission(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route('**/api/celebrations/enquiries', handler)
}

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

test('five-step form validates fields and preserves values and services across Back/Next', async ({ page }, testInfo) => {
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
  await page.getByRole('button', { name: 'Submit Enquiry' }).click()
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
  const submit = page.getByRole('button', { name: 'Submit Enquiry' })
  await submit.dblclick()
  await expect(page.getByText('Submitting…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Thank You' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Thank You' })).toBeInViewport()
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
    await page.getByRole('button', { name: 'Submit Enquiry' }).click()
    await expect(page.getByText(response[1])).toBeVisible()
    await expect(page.getByLabel('Contact Person Name')).toHaveValue('Synthetic Contact')
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.locator('input[type="checkbox"][name="serviceIds"]').first()).toBeChecked()
  })
}

test('network failure retains data and clears pending state', async ({ page }) => {
  await mockSubmission(page, async (route) => route.abort('failed'))
  await reachContact(page)
  await page.getByRole('button', { name: 'Submit Enquiry' }).click()
  await expect(page.getByText(/check your connection and try again/i)).toBeVisible()
  await expect(page.getByLabel('Contact Person Name')).toHaveValue('Synthetic Contact')
  await expect(page.getByRole('button', { name: 'Submit Enquiry' })).toBeEnabled()
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
