import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://fixture.example.com',
  output: 'static',
  vite: {
    resolve: {
      alias: [
        {
          find: /^@easy-web\/cms-adapters$/,
          replacement: fileURLToPath(new URL('../../packages/easy-web-cms-adapters/src/content/index.ts', import.meta.url)),
        },
      ],
    },
  },
});
