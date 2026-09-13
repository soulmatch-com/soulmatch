import { expect, test } from '@playwright/test'

const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]
const tamil = 'திருக்கடையூரில் நடைபெறும் குடும்ப விழாக்கள், பாரம்பரிய தருணங்கள் மற்றும் விழா ஏற்பாடுகளின் காட்சிகள்.'
const navigation = ['Home', '60th Marriage', '70th Marriage', '80th Marriage', 'Gallery', 'Plan Celebration', 'Matrimony']

for (const viewport of viewports) {
  test(`Gallery is truthful, accessible and navigable at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const response = await page.goto('/gallery')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/gallery$/)
    const header = page.locator('header')
    const footer = page.locator('footer')
    await expect(header).toHaveCount(1)
    await expect(footer).toHaveCount(1)
    await expect(header.getByRole('img', { name: 'MyThirumanam', exact: true })).toHaveAttribute('src', /mythirumanam-logo\.png/)
    await expect(footer.getByRole('img', { name: 'MyThirumanam', exact: true })).toBeAttached()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Celebration Gallery')
    await expect(page.locator('main [lang="ta"]').first()).toHaveText(tamil)
    await expect(page.locator('body')).not.toContainText('\uFFFD')
    await expect(page.locator('body')).not.toContainText('à®')

    await expect(page).toHaveTitle('Thirukadaiyur Celebration Gallery | MyThirumanam')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://mythirumanam.in/gallery')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Explore celebration moments and arrangements for 60th, 70th and 80th marriage ceremonies in Thirukadaiyur with MyThirumanam.')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://mythirumanam.in/gallery')
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'MyThirumanam')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://mythirumanam.in/icon.png')
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')
    expect(schema['@type']).toBe('CollectionPage')
    expect(schema.url).toBe('https://mythirumanam.in/gallery')
    expect(Object.keys(schema).sort()).toEqual(['@context', '@type', 'description', 'name', 'url'])

    for (const name of ['Sign In', 'Get Started', 'Create Profile']) {
      await expect(header.getByRole('link', { name, exact: true })).toHaveCount(0)
    }
    await expect(header.getByRole('button', { name: 'Celebrations', exact: true })).toHaveCount(0)
    if (viewport.width < 1024) {
      const toggle = page.getByRole('button', { name: 'Toggle menu' })
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      const menu = page.locator('#mobile-primary-menu')
      await expect(menu.getByRole('link')).toHaveText(navigation)
      await expect(menu.getByRole('link', { name: 'Gallery', exact: true })).toHaveAttribute('aria-current', 'page')
      await page.screenshot({ path: testInfo.outputPath(`gallery-menu-${viewport.width}.png`) })
      await page.keyboard.press('Escape')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(toggle).toBeFocused()
    } else {
      for (const name of navigation) await expect(header.getByRole('link', { name, exact: true })).toBeVisible()
      await expect(header.getByRole('link', { name: 'Gallery', exact: true })).toHaveAttribute('aria-current', 'page')
    }

    const collection = page.getByRole('list', { name: 'Gallery images' })
    await expect(collection.getByRole('listitem')).toHaveCount(1)
    await expect(collection.getByText('Brand artwork', { exact: true })).toBeVisible()
    await expect(collection).toContainText('not a photograph of a customer or ceremony')
    await expect(page.getByText('Celebration photographs are not available yet.', { exact: false })).toBeVisible()
    await expect(page.getByText('More celebration moments will be added as approved photographs become available.')).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/\bour customers?\b|\bour (?:60th|70th|80th) marriage event\b|\brecent celebration\b/i)
    await expect(page.getByRole('tab')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)

    for (const img of await page.locator('img').all()) {
      await img.scrollIntoViewIfNeeded()
      const alt = await img.getAttribute('alt')
      expect(alt?.trim().length).toBeGreaterThan(0)
      const src = new URL(await img.getAttribute('src') ?? '', page.url())
      expect(src.origin).toBe(new URL(page.url()).origin)
      expect(src.pathname).toBe('/_next/image')
      expect(['/brand/mythirumanam-logo.png', '/icon.png']).toContain(src.searchParams.get('url'))
      await expect.poll(() => img.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
    }
    const artwork = collection.getByRole('img')
    await expect(artwork).toHaveAttribute('alt', 'MyThirumanam maroon and gold temple, couple and monogram emblem')
    await expect(artwork).toHaveAttribute('loading', 'lazy')
    await expect(artwork).toHaveAttribute('width', '512')
    await expect(artwork).toHaveAttribute('height', '512')
    await expect(artwork).toHaveAttribute('sizes', /384px/)
    await expect(artwork).toHaveAttribute('srcset', /640w/)
    await expect(footer.getByRole('link', { name: 'Gallery', exact: true })).toHaveAttribute('href', '/gallery')
    await expect(footer.getByRole('link', { name: 'About Us', exact: true })).toHaveAttribute('href', '/about')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`gallery-${viewport.width}.png`), fullPage: true })

    for (const years of [60, 70, 80]) {
      const link = page.getByRole('link', { name: `View ${years}th Marriage`, exact: true })
      await expect(link).toHaveAttribute('href', `/${years}th-marriage`)
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/${years}th-marriage$`))
      await page.goBack()
      await expect(page.getByRole('heading', { name: 'Celebration Gallery', exact: true })).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'Explore Celebrations', exact: true })).toHaveAttribute('href', '/')
    await page.getByRole('link', { name: 'Explore Celebrations', exact: true }).click()
    await expect(page).toHaveURL(new URL('/', page.url()).toString())
    if (viewport.width < 1024) {
      const toggle = page.getByRole('button', { name: 'Toggle menu' })
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await page.locator('#mobile-primary-menu').getByRole('link', { name: 'Gallery', exact: true }).click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    } else {
      await header.getByRole('link', { name: 'Gallery', exact: true }).click()
    }
    await expect(page).toHaveURL(/\/gallery$/)

    const planning = page.getByRole('link', { name: 'Start Planning', exact: true })
    await expect(planning).toHaveCount(2)
    for (let index = 0; index < 2; index++) {
      await expect(planning.nth(index)).toHaveAttribute('href', '/plan')
      await page.keyboard.press('Tab')
      await planning.nth(index).focus()
      await expect(planning.nth(index)).toBeFocused()
      expect(await planning.nth(index).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none')
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/plan$/)
      await page.goBack()
    }
    expect(errors).toEqual([])
  })
}

test('Gallery sitemap entry is public and excludes private, enquiry and legacy routes', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBe(true)
  const text = await response.text()
  const urls = Array.from(text.matchAll(/<loc>(.*?)<\/loc>/g), ([, url]) => new URL(url).pathname).sort()
  expect(urls).toEqual(['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/about', '/gallery', '/matrimony'])
})
