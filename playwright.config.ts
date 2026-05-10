import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  maxFailures: 1,
  reporter: [['html', { open: 'never' }]],
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-crash-reporter',
        '--disable-breakpad',
        '--force-color-profile=srgb',
        '--disable-logging',
        '--log-level=3',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer']
    },
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] }, // Emulates Android
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
