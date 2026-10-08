import { getViteConfig } from 'astro/config';

// getViteConfig wires Astro's compiler into Vite so tests can import and
// render `.astro` components (legacy-baseline.test.ts uses the Container API).
export default getViteConfig({
  test: {
    globals: false,
  },
});
