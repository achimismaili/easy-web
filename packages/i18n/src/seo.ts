export type AlternateLink = { hreflang: string; href: string }

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : '/' + path
}

function buildUrl(baseUrl: string, localePath: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = normalizePath(path)

  if (localePath === '') {
    return base + normalizedPath
  }

  const localeSegment = '/' + localePath
  if (normalizedPath === '/') {
    return base + localeSegment + '/'
  }
  return base + localeSegment + normalizedPath
}

export function getAlternateLinks(opts: {
  path: string
  locales: readonly string[]
  defaultLocale: string
  baseUrl: string
}): AlternateLink[] {
  const { path, locales, defaultLocale, baseUrl } = opts

  const links: AlternateLink[] = locales.map((locale) => ({
    hreflang: locale,
    href: buildUrl(baseUrl, locale !== defaultLocale ? locale : '', path),
  }))

  links.push({
    hreflang: 'x-default',
    href: buildUrl(baseUrl, '', path),
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
  return buildUrl(baseUrl, locale !== defaultLocale ? locale : '', path)
}
