export type AlternateLink = { hreflang: string; href: string }

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : '/' + path
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
  let cleanPath: string
  if (segments.length > 0 && stripLocales.includes(segments[0])) {
    const rest = segments.slice(1)
    cleanPath = rest.length > 0 ? '/' + rest.join('/') : '/'
  } else {
    cleanPath = normalizedPathOnly
  }

  const suffix = search + hash

  if (localePath === '') {
    return base + cleanPath + suffix
  }

  const localeSegment = '/' + localePath
  if (cleanPath === '/') {
    return base + localeSegment + '/' + suffix
  }
  return base + localeSegment + cleanPath + suffix
}

export function getAlternateLinks(opts: {
  path: string
  locales: readonly string[]
  defaultLocale: string
  baseUrl: string
}): AlternateLink[] {
  const { path, locales, defaultLocale, baseUrl } = opts

  const stripLocales = [...locales]
  const links: AlternateLink[] = locales.map((locale) => ({
    hreflang: locale,
    href: buildUrl(baseUrl, locale !== defaultLocale ? locale : '', path, stripLocales),
  }))

  links.push({
    hreflang: 'x-default',
    href: buildUrl(baseUrl, '', path, stripLocales),
  })

  return links
}

export function getCanonicalUrl(opts: {
  path: string
  locale: string
  defaultLocale: string
  baseUrl: string
}): string {
  const { path, locale, defaultLocale, baseUrl } = opts
  return buildUrl(baseUrl, locale !== defaultLocale ? locale : '', path, [locale, defaultLocale])
}
