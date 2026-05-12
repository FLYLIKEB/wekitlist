import { defineConfig, devices } from '@playwright/test';

const port = 3000;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
