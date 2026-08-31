import { formatCurrency, formatDate, formatList, formatNumber, formatRelativeTime } from './formatters.js'
import type { LocalizedPathGroup, TrailingSlash } from './localized-paths.js'
import { getLocaleFromPath, localizedHref } from './routing.js'
import { getAlternateLinks, getCanonicalUrl } from './seo.js'

export interface I18nConfig<L extends string> {
  locales: readonly L[]
  defaultLocale: L
  baseUrl: string
  localizedPaths?: readonly LocalizedPathGroup[]
  trailingSlash?: TrailingSlash
}

/**
 * Falls back to the URL form `@easy-web/seo` resolved from `astro.config.mjs`.
 *
 * `createI18n` is called from instance code, not from an Astro integration, so
 * it cannot read the Astro config itself. Without this the alternates would
 * default to trailing slashes while the canonical followed the real config, and
 * a self-referencing hreflang that disagrees with the canonical invalidates the
 * whole cluster. Pass `trailingSlash` explicitly to override.
 */
function detectTrailingSlash(): TrailingSlash {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }

  return runtime.process?.env?.['EASY_WEB_SEO_TRAILING_SLASH'] === 'never'
    ? 'never'
    : 'always'
}

export function createI18n<L extends string>(cfg: I18nConfig<L>) {
  const trailingSlash = cfg.trailingSlash ?? detectTrailingSlash()

  return {
    locales: cfg.locales,
    defaultLocale: cfg.defaultLocale,
    localizedPaths: cfg.localizedPaths ?? [],
    trailingSlash,
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
        localizedPaths: cfg.localizedPaths,
        trailingSlash,
      }),
    getCanonicalUrl: (path: string, locale: L): string =>
      getCanonicalUrl({
        path,
        locale,
        defaultLocale: cfg.defaultLocale,
        baseUrl: cfg.baseUrl,
        trailingSlash,
      }),
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
