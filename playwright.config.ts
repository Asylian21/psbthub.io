/**
 * Playwright configuration for deterministic Chromium e2e runs.
 */
import { defineConfig, devices } from '@playwright/test'

const DEV_SERVER_HOST = '127.0.0.1'
const DEV_SERVER_PORT = 4173
const BASE_URL = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host ${DEV_SERVER_HOST} --port ${DEV_SERVER_PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'https://supabase.local',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e_mock_key',
    },
  },
})
