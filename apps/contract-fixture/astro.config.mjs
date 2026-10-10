import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { easyWebCmsPreviewAssets } from '@easy-web/cms-adapters';

export default defineConfig({
  site: 'https://fixture.example.com',
  output: 'static',
  integrations: [
    easyWebCmsPreviewAssets({
      folders: [{ source: 'src/assets/fixtures', publicPath: '/src/assets/fixtures' }],
    }),
  ],
  vite: {
    resolve: {
      alias: [
        {
          find: /^@easy-web\/cms-adapters$/,
          replacement: fileURLToPath(new URL('../../packages/easy-web-cms-adapters/src/index.ts', import.meta.url)),
        },
      ],
    },
  },
});
