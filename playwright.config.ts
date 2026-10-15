import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

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
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    ...(customExecutable ? { launchOptions: { executablePath: customExecutable } } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
