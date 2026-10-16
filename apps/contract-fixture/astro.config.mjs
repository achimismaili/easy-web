import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { easyWebCmsPreviewAssets } from '@easy-web/cms-adapters';
import easyWebSeo from '@easy-web/core/seo';

export default defineConfig({
  site: 'https://fixture.example.com',
  output: 'static',
  integrations: [
    easyWebSeo({ buildInfo: { site: 'Contract fixture', releaseId: 'fixture-release', packages: ['cms-adapters'], json: true } }),
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
