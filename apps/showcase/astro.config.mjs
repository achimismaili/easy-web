import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://achimismaili.github.io',
  base: '/easy-web/',
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
