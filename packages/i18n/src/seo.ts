import {
  findLocalizedGroup,
  toServedPath,
  type LocalizedPathGroup,
  type TrailingSlash,
} from './localized-paths.js'

export type AlternateLink = { hreflang: string; href: string }

function toServedUrl(url: string, style: TrailingSlash): string {
  const parsed = new URL(url)
  parsed.pathname = toServedPath(parsed.pathname, style)
  return parsed.href
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function buildUrl(baseUrl: string, localePath: string, path: string, stripLocales: string[] = []): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  const hashIdx = path.indexOf('#')
  const hash = hashIdx !== -1 ? path.slice(hashIdx) : ''
  const pathWithoutHash = hashIdx !== -1 ? path.slice(0, hashIdx) : path
  const queryIdx = pathWithoutHash.indexOf('?')
  const search = queryIdx !== -1 ? pathWithoutHash.slice(queryIdx) : ''
  const pathOnly = queryIdx !== -1 ? pathWithoutHash.slice(0, queryIdx) : pathWithoutHash

  const normalizedPathOnly = normalizePath(pathOnly)
  const segments = normalizedPathOnly.split('/').filter((s, i) => i > 0 || s !== '')
  const wasLocaleOnlyPath = segments.length === 1 && stripLocales.includes(segments[0] ?? '')
  let cleanPath: string
  if (segments.length > 0 && stripLocales.includes(segments[0])) {
    const rest = segments.slice(1)
    cleanPath = rest.length > 0 ? `/${rest.join('/')}` : '/'
  } else {
    cleanPath = normalizedPathOnly
  }

  const suffix = search + hash

  if (localePath === '') {
    return base + cleanPath + suffix
  }

  const localeSegment = `/${localePath}`
  if (cleanPath === '/') {
    if (wasLocaleOnlyPath) {
      return `${base}${localeSegment}${suffix}`
    }
    return `${base}${localeSegment}/${suffix}`
  }
  return `${base}${localeSegment}${cleanPath}${suffix}`
}

export function getAlternateLinks(opts: {
  path: string
  locales: readonly string[]
  defaultLocale: string
  baseUrl: string
  /**
   * Routes whose slug differs per locale. When `path` belongs to one of these
   * groups the alternates are read from the group instead of being derived by
   * re-prefixing `path`, which would otherwise point at a URL that does not
   * exist (e.g. `/en/datenschutz` for the DE privacy page).
   */
  localizedPaths?: readonly LocalizedPathGroup[]
  /** URL form to emit; must match what the site serves. Defaults to Astro's `directory` output. */
  trailingSlash?: TrailingSlash
}): AlternateLink[] {
  const { path, locales, defaultLocale, baseUrl, localizedPaths } = opts
  const style = opts.trailingSlash ?? 'always'

  const group = findLocalizedGroup(path, localizedPaths)

  if (group) {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const hrefFor = (locale: string): string | undefined => {
      const declared = group[locale]
      return declared === undefined ? undefined : base + toServedPath(declared, style)
    }

    const links: AlternateLink[] = []

    for (const locale of locales) {
      const href = hrefFor(locale)
      // Omit untranslated locales rather than inventing a URL — the bug this fixes.
      if (href !== undefined) {
        links.push({ hreflang: locale, href })
      }
    }

    const fallback = hrefFor(defaultLocale)
    if (fallback !== undefined) {
      links.push({ hreflang: 'x-default', href: fallback })
    }

    return links
  }

  const stripLocales = [...locales]
  const links: AlternateLink[] = locales.map((locale) => ({
    hreflang: locale,
    href: toServedUrl(
      buildUrl(baseUrl, locale !== defaultLocale ? locale : '', path, stripLocales),
      style,
    ),
  }))

  links.push({
    hreflang: 'x-default',
    href: toServedUrl(buildUrl(baseUrl, '', path, stripLocales), style),
  })

  return links
}

export function getCanonicalUrl(opts: {
  path: string
  locale: string
  defaultLocale: string
  baseUrl: string
  trailingSlash?: TrailingSlash
}): string {
  const { path, locale, defaultLocale, baseUrl } = opts
  return toServedUrl(
    buildUrl(baseUrl, locale !== defaultLocale ? locale : '', path, [locale, defaultLocale]),
    opts.trailingSlash ?? 'always',
  )
}
