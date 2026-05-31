/**
 * Returns a localized path.
 * @deprecated v0.1: localizedHref(path, locale) → v0.2: localizedHref({ path, locale, defaultLocale })
 */
export function localizedHref(opts: {
  path: string;
  locale: string;
  defaultLocale: string;
}): string {
  if (opts.locale === opts.defaultLocale) return opts.path
  const prefix = '/' + opts.locale
  return prefix + (opts.path === '/' ? '' : opts.path)
}

/**
 * Extracts locale from URL pathname.
 * @deprecated v0.1: getLocaleFromPath(pathname) → v0.2: getLocaleFromPath({ pathname, locales, defaultLocale })
 */
export function getLocaleFromPath(opts: {
  pathname: string;
  locales: readonly string[];
  defaultLocale: string;
}): string {
  const segments = opts.pathname.split('/').filter(Boolean)
  if (segments.length > 0 && opts.locales.includes(segments[0])) {
    return segments[0]
  }
  return opts.defaultLocale
}
