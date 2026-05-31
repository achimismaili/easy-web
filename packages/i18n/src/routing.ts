/**
 * Returns a localized path.
 *
 * De-localizes `path` before re-prefixing so calling `localizedHref` on an
 * already-prefixed path never produces a double-prefix (e.g. `/en/en/foo`).
 * Query strings and hash fragments are preserved.
 *
 * @deprecated v0.1: localizedHref(path, locale) → v0.2: localizedHref({ path, locale, defaultLocale })
 */
export function localizedHref(opts: {
  path: string;
  locale: string;
  defaultLocale: string;
}): string {
  const qIdx = opts.path.indexOf('?')
  const pathWithHash = qIdx === -1 ? opts.path : opts.path.slice(0, qIdx)
  const search = qIdx === -1 ? '' : opts.path.slice(qIdx)

  const hIdx = pathWithHash.indexOf('#')
  const pathOnly = hIdx === -1 ? pathWithHash : pathWithHash.slice(0, hIdx)
  const hash = hIdx === -1 ? '' : pathWithHash.slice(hIdx)

  const segments = pathOnly.split('/').filter(Boolean)
  if (segments.length > 0 && (segments[0] === opts.locale || segments[0] === opts.defaultLocale)) {
    segments.shift()
  }

  const cleanPath = '/' + segments.join('/')

  if (opts.locale === opts.defaultLocale) {
    return cleanPath + search + hash
  }
  return '/' + opts.locale + (cleanPath === '/' ? '' : cleanPath) + search + hash
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
