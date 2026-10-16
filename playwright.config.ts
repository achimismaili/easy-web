import { defineConfig } from '@playwright/test';

const host = '127.0.0.1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: '.cache/playwright',
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'contract fixture',
      command: `pnpm --filter contract-fixture preview --host ${host} --port 4321`,
      url: `http://${host}:4321/admin`,
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      name: 'showcase',
      command: `pnpm --filter showcase preview --host ${host} --port 4322`,
      url: `http://${host}:4322/easy-web/components`,
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
