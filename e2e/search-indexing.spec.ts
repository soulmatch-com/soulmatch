import { expect, test } from '@playwright/test'

const legacyArticleSlugs = [
  '60th-marriage-cost-thirukadaiyur',
  'thirukadaiyur-60th-marriage-catering-hall-photography-arrangements',
  'thirukadaiyur-60th-marriage-ceremony-what-happens-on-the-day',
]

for (const slug of legacyArticleSlugs) {
  test(`legacy article /${slug} permanently redirects to its public blog URL`, async ({ request }) => {
    // Inspect the first response: following redirects would hide a login detour.
    const response = await request.get(`/${slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(new URL(response.headers().location, response.url()).pathname).toBe(`/blog/${slug}`)
  })
}

test('legacy article redirects preserve campaign query parameters', async ({ request }) => {
  const slug = legacyArticleSlugs[0]
  const response = await request.get(`/${slug}?utm_source=google`, { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  const destination = new URL(response.headers().location, response.url())
  expect(destination.pathname).toBe(`/blog/${slug}`)
  expect(destination.searchParams.get('utm_source')).toBe('google')
})

test('manifest is public JSON without an authentication redirect', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/manifest+json')
  expect(await response.json()).toMatchObject({ name: 'MyThirumanam', start_url: '/' })
})

for (const path of ['/plan', '/plan?ceremony=60th-marriage', '/plan?ceremony=70th-marriage', '/plan?ceremony=80th-marriage', '/login']) {
  test(`${path} retains its intentional noindex directive`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    expect(await response.text()).toMatch(/<meta name="robots" content="noindex, follow"\s*\/>/)
  })
}

test('private matrimony search still requires authentication', async ({ request }) => {
  const response = await request.get('/search', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(new URL(response.headers().location, response.url()).pathname).toBe('/login')
})

for (const path of ['/about', '/contact']) {
  test(`${path} declares one self canonical and matching Open Graph URL`, async ({ request }) => {
    for (const query of ['', '?utm_source=google']) {
      const response = await request.get(`${path}${query}`, { maxRedirects: 0 })
      expect(response.status()).toBe(200)
      const html = await response.text()
      expect(html.match(/<link\b[^>]*rel="canonical"[^>]*>/g)).toEqual([
        `<link rel="canonical" href="https://mythirumanam.com${path}"/>`,
      ])
      expect(html).toContain(`<meta property="og:url" content="https://mythirumanam.com${path}"/>`)
      expect(html).toContain('<meta name="robots" content="index, follow"/>')
    }
  })
}

test('contact page serves its own support content and ContactPage structured data', async ({ request }) => {
  const response = await request.get('/contact')
  const html = await response.text()
  const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
  expect(structuredData).toContainEqual(expect.objectContaining({
    '@type': 'ContactPage', url: 'https://mythirumanam.com/contact',
  }))
  expect(html).toContain('Existing enquiries and booking support')
  expect(html).toContain('Privacy requests and grievances')
  expect(html).toContain('href="/plan"')
  expect(html).toContain('href="/privacy"')
  expect(html).toContain('href="/terms"')
})
