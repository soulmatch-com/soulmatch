import { expect, test } from '@playwright/test'

test('quotation endpoints enforce authorization, private caching and production origin checks', async ({ request, playwright, baseURL }) => {
  const id = '00000000-0000-4000-8000-000000000000'
  for (const path of ['/api/admin/quotations', `/api/admin/quotations/${id}/lifecycle`, `/api/admin/quotations/${id}/pdf`]) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(401)
    expect(response.headers()['cache-control'], path).toContain('no-store')
  }
  for (const [method, path] of [
    ['POST', '/api/admin/quotations'],
    ['PATCH', `/api/admin/quotations/${id}`],
    ['DELETE', `/api/admin/quotations/${id}`],
    ['POST', `/api/admin/quotations/${id}/copy`],
    ['POST', `/api/admin/quotations/${id}/lifecycle`],
    ['POST', `/api/admin/quotations/${id}/deliveries`],
  ]) {
    const response = await request.fetch(path, { method, data: {} })
    expect(response.status(), `${method} ${path}`).toBe(401)
    expect(response.headers()['cache-control']).toContain('no-store')
  }
  if (process.env.PLAYWRIGHT_PRODUCTION === '1') {
    const isolated = await playwright.request.newContext({ baseURL, extraHTTPHeaders: {} })
    try {
      const origins: Record<string, string>[] = [{}, { Origin: 'https://untrusted.example' }]
      for (const headers of origins) {
        const response = await isolated.patch(`/api/admin/quotations/${id}`, { headers, data: { notes: 'Rejected mutation' } })
        expect(response.status()).toBe(403)
        expect(await response.json()).toEqual({ error: 'Cross-origin request rejected' })
        expect(response.headers()['cache-control']).toContain('no-store')
      }
    } finally { await isolated.dispose() }
  }
})
