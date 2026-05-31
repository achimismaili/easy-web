import { formatCurrency, formatDate, formatList, formatNumber, formatRelativeTime } from './formatters.js'
import { getLocaleFromPath, localizedHref } from './routing.js'
import { getAlternateLinks, getCanonicalUrl } from './seo.js'

export interface I18nConfig<L extends string> {
  locales: readonly L[]
  defaultLocale: L
  baseUrl: string
}

export function createI18n<L extends string>(cfg: I18nConfig<L>) {
  return {
    locales: cfg.locales,
    defaultLocale: cfg.defaultLocale,
    localizedHref: (path: string, locale: L): string =>
      localizedHref({ path, locale, defaultLocale: cfg.defaultLocale }),
    getLocaleFromPath: (pathname: string): L =>
      getLocaleFromPath({ pathname, locales: cfg.locales, defaultLocale: cfg.defaultLocale }) as L,
    getAlternateLinks: (path: string) =>
      getAlternateLinks({
        path,
        locales: cfg.locales,
        defaultLocale: cfg.defaultLocale,
        baseUrl: cfg.baseUrl,
      }),
    getCanonicalUrl: (path: string, locale: L): string =>
      getCanonicalUrl({ path, locale, defaultLocale: cfg.defaultLocale, baseUrl: cfg.baseUrl }),
    format: {
      date: (locale: L, date: Date | number, opts?: Intl.DateTimeFormatOptions): string =>
        formatDate(locale, date, opts),
      number: (locale: L, value: number, opts?: Intl.NumberFormatOptions): string =>
        formatNumber(locale, value, opts),
      relativeTime: (
        locale: L,
        value: number,
        unit: Intl.RelativeTimeFormatUnit,
        opts?: Intl.RelativeTimeFormatOptions,
      ): string => formatRelativeTime(locale, value, unit, opts),
      list: (locale: L, items: string[], opts?: Intl.ListFormatOptions): string =>
        formatList(locale, items, opts),
      currency: (
        locale: L,
        value: number,
        currency: string,
        opts?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>,
      ): string => formatCurrency(locale, value, currency, opts),
    },
  }
}
