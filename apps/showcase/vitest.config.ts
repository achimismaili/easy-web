import { defineConfig } from 'vitest/config';

// The showcase tests read the built site in dist/, so they run after `astro build`
// (turbo's test task depends on build; run `pnpm --filter showcase build` first by hand).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
