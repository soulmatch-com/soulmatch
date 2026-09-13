import { expect, test } from '@playwright/test'

const routes = ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/plan', '/about', '/gallery', '/matrimony']

async function readImageDimensions(page: import('@playwright/test').Page, src: string) {
  return await page.evaluate((imageSrc) => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error(`failed to load ${imageSrc}`))
    image.src = imageSrc
  }), src)
}

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
  test(`approved shared branding and navigation at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const path of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const header = page.locator('header')
      await expect(header).toHaveCount(1)
      const logo = header.getByRole('img', { name: 'MyThirumanam', exact: true })
      await expect(logo).toHaveAttribute('src', /mythirumanam-logo\.png/)
      await expect(logo).toHaveAttribute('width', '1690')
      await expect(logo).toHaveAttribute('height', '859')
      await expect(logo).toBeVisible()
      await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      const box = await logo.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(210)
      expect(box?.width).toBeLessThanOrEqual(220)
      expect((await header.boundingBox())?.height).toBeLessThanOrEqual(112)
      await expect(header).not.toContainText('Premium Tamil Matrimonial Platform')
      const home = header.getByRole('link', { name: 'MyThirumanam', exact: true })
      await expect(home).toHaveAttribute('href', '/')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (viewport.width < 1024) {
        const menu = header.getByRole('button', { name: 'Toggle menu' })
        await menu.click()
        await expect(menu).toHaveAttribute('aria-expanded', 'true')
        await expect(header.getByRole('link', { name: 'Plan Celebration', exact: true })).toBeVisible()
        await expect(header.getByRole('link', { name: 'Matrimony', exact: true })).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(menu).toHaveAttribute('aria-expanded', 'false')
      } else {
        if (path !== '/matrimony') await expect(header.getByRole('link', { name: 'Plan Celebration', exact: true })).toBeVisible()
        await expect(header.getByRole('link', { name: 'Matrimony', exact: true })).toBeVisible()
      }
      if (path === '/') await header.screenshot({ path: testInfo.outputPath(`header-${viewport.width}.png`) })
      await home.click()
      await expect(page).toHaveURL(/\/$/)
    }
    expect(errors).toEqual([])
  })
}

test('rendered metadata serves only the new icon family and local app manifest', async ({ page, request }) => {
  await page.goto('/')
  const icons = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((links) => links.map((link) => ({ href: link.getAttribute('href')!, sizes: link.getAttribute('sizes') })))
  expect(icons.some(({ href }) => href.startsWith('/favicon.ico'))).toBe(true)
  expect(icons.some(({ href, sizes }) => href.startsWith('/icon.png') && sizes === '512x512')).toBe(true)
  expect(icons.some(({ href, sizes }) => href.startsWith('/apple-icon.png') && sizes === '180x180')).toBe(true)
  for (const { href } of icons) {
    expect(href).not.toContain('v=2')
    expect(href).not.toContain('mythiru-favicon')
    expect((await request.get(href)).ok()).toBe(true)
  }
  expect(new Set(icons.map(({ href }) => href.split('?')[0])).size).toBe(icons.length)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512'])
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^\/(?!\/)/)
    expect((await request.get(icon.src)).ok()).toBe(true)
  }
  const favicon = await readImageDimensions(page, '/favicon.ico')
  expect(favicon.width).toBeGreaterThan(0)
  expect(favicon.width).toBe(favicon.height)
  const appIcon = await readImageDimensions(page, '/icon.png')
  expect(appIcon.width).toBe(appIcon.height)
  expect(appIcon.width).toBe(512)
  const appleIcon = await readImageDimensions(page, '/apple-icon.png')
  expect(appleIcon.width).toBe(appleIcon.height)
  expect(appleIcon.width).toBe(180)
  await page.goto('/gallery')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://mythirumanam.in/icon.png')
})
