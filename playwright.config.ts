import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: true },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    // Локально можна вказати власний Chromium: PW_CHROMIUM=/path/to/chromium
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : {},
  },
})
