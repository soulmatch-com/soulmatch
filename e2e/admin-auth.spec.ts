import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const fixture = '.playwright/local-admin.json'
const inactiveFixture = '.playwright/local-inactive-admin.json'

test('normal admin login creates an HttpOnly session and protected APIs reject anonymous access', async ({ page, request, context }) => {
  const anonymous = await request.get('/api/admin/bookings')
  expect(anonymous.status()).toBe(401)

  const admin = JSON.parse(await readFile(fixture, 'utf8')) as { email: string; password: string }
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(admin.password)
  const login = page.waitForResponse((response) => response.url().includes('/api/admin/auth/login') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sign in as Admin' }).click()
  expect((await login).status()).toBe(200)
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  const cookies = await context.cookies()
  const session = cookies.find((cookie) => cookie.name === 'mythirumanam_admin_session')
  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe('Lax')
  await context.storageState({ path: '.playwright/admin-storage-state.json' })

  const protectedResponse = await page.request.get('/api/admin/bookings')
  expect(protectedResponse.ok()).toBe(true)

  // The legacy user directory reads public.profiles through the server-only
  // client. Keep this here so the narrowly scoped profile grant is verified
  // by an authenticated request rather than by source inspection alone.
  const usersResponse = await page.request.get('/api/admin/users')
  expect(usersResponse.ok()).toBe(true)
})

test('inactive administrators cannot create an admin session', async ({ request }) => {
  const admin = JSON.parse(await readFile(inactiveFixture, 'utf8')) as { email: string; password: string }
  const response = await request.post('/api/admin/auth/login', { data: { email: admin.email, password: admin.password } })
  expect(response.status()).toBe(403)
  expect((await response.json()).message).toBe('Account is inactive. Contact super admin.')
  expect(response.headers()['set-cookie']).toBeUndefined()
})
