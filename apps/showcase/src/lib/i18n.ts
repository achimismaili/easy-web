import { createI18n } from '@achimismaili/easy-web-i18n';

export const i18n = createI18n({
  locales: ['en', 'de'] as const,
  defaultLocale: 'en',
  baseUrl: 'https://achimismaili.github.io/easy-web',
});

export type Locale = (typeof i18n.locales)[number];
