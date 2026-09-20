import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { access } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const file = (path) => readFile(new URL(path, root), 'utf8')
const exists = (path) => access(new URL(path, root))

const checks = [
  ['login route is outside the protected route group', async () => {
    await exists('src/app/(en)/admin/(auth)/login/page.tsx')
    await assert.rejects(exists('src/app/(en)/admin/login/page.tsx'))
  }],
  ['login page does not render authenticated navigation', async () => {
    const source = await file('src/app/(en)/admin/(auth)/login/page.tsx')
    assert.doesNotMatch(source, /AdminHeader|AdminNavigation/)
    assert.match(source, /AdminLoginForm/)
  }],
  ['authenticated admin login access redirects to /admin', async () => {
    const source = await file('src/app/(en)/admin/(auth)/login/page.tsx')
    assert.match(source, /requireActiveAdmin\(\)/)
    assert.match(source, /redirect\('\/admin'\)/)
  }],
  ['protected layout renders navigation only after server session verification', async () => {
    const source = await file('src/app/(en)/admin/(protected)/layout.tsx')
    assert.match(source, /requireActiveAdmin\(\)/)
    assert.match(source, /redirect\('\/admin\/login'\)/)
    assert.match(source, /<AdminHeader \/>/)
  }],
  ['admin index remains protected and preserves the /admin URL', async () => {
    const source = await file('src/app/(en)/admin/(protected)/page.tsx')
    assert.match(source, /redirect\('\/admin\/dashboard'\)/)
  }],
  ['existing protected child route keeps its public URL ownership', async () => {
    await exists('src/app/(en)/admin/(protected)/blogs/page.tsx')
    const source = await file('src/app/(en)/admin/(protected)/blogs/page.tsx')
    assert.match(source, /\/admin\/blogs/)
  }],
  ['middleware leaves admin session enforcement to the admin server guard', async () => {
    const source = await file('middleware.ts')
    assert.match(source, /'\/admin'/)
    assert.match(source, /'\/api\/admin'/)
  }],
  ['logout endpoint clears the signed admin session cookie', async () => {
    const source = await file('src/app/api/admin/auth/logout/route.ts')
    assert.match(source, /response\.cookies\.set\(adminSessionCookie, ''/)
    assert.match(source, /maxAge: 0/)
  }],
  ['header waits for server logout before clearing UI state and redirecting', async () => {
    const source = await file('src/components/admin/AdminHeader.tsx')
    assert.match(source, /await adminAuthService\.logout\(\)/)
    assert.match(source, /clearAdmin\(\)/)
    assert.match(source, /window\.location\.href = ADMIN_CONFIG\.ROUTES\.LOGIN/)
  }],
  ['auth service invokes the server logout endpoint', async () => {
    const source = await file('src/modules/admin/services/auth.service.ts')
    assert.match(source, /fetch\(`\$\{this\.baseUrl\}\/auth\/logout`, \{ method: 'POST' \}\)/)
  }],
]

let passed = 0
for (const [name, check] of checks) {
  try {
    await check()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
  }
}

console.log(`Admin layout auth checks: ${passed}/${checks.length} passed, ${checks.length - passed} failed`)
process.exitCode = passed === checks.length ? 0 : 1
