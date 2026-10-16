import { defineConfig } from 'astro/config';
import easyWebSeo from '@easy-web/core/seo';

export default defineConfig({
  site: 'https://achimismaili.github.io',
  base: '/easy-web/',
  output: 'static',
  integrations: [
    easyWebSeo({
      buildInfo: { site: 'easy-web showcase' },
      sitemapLocales: { en: 'en', de: 'de' },
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
