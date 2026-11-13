import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const production = process.env.PLAYWRIGHT_PRODUCTION === '1'
const baseURL = production ? 'http://localhost:3001' : 'http://localhost:3000'

const customExecutable = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE
if (customExecutable && !existsSync(customExecutable)) throw new Error(`PLAYWRIGHT_BROWSER_EXECUTABLE does not exist: ${customExecutable}`)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL,
    ...(production ? { extraHTTPHeaders: { Origin: baseURL } } : {}),
    browserName: 'chromium',
    ...(customExecutable ? { launchOptions: { executablePath: customExecutable } } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: production ? 'node scripts/playwright-production-server.mjs' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !production,
    timeout: 180_000,
  },
})
