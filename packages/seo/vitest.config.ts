import { getViteConfig } from 'astro/config';

// getViteConfig wires Astro's compiler into Vite so tests can import and
// render `.astro` components (legacy-baseline.test.ts uses the Container API).
export default getViteConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
