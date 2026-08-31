import { describe, it, expect } from 'vitest'
import { createI18n } from '../factory.js'
import {
  findLocalizedGroup,
  normalizeLocalizedPath,
  validateLocalizedPaths,
} from '../localized-paths.js'
import { getAlternateLinks } from '../seo.js'

const BASE = 'https://harleyrentflorida.de'
const LOCALES = ['de', 'en'] as const
const GROUPS = [{ de: '/datenschutz/', en: '/en/privacy/' }]

const alternates = (path: string) =>
  getAlternateLinks({
    path,
    locales: LOCALES,
    defaultLocale: 'de',
    baseUrl: BASE,
    localizedPaths: GROUPS,
  })

describe('normalizeLocalizedPath', () => {
  it.each([
    ['/datenschutz', '/datenschutz'],
    ['/datenschutz/', '/datenschutz'],
    ['/datenschutz///', '/datenschutz'],
    ['/datenschutz/?ref=x', '/datenschutz'],
    ['/datenschutz/#top', '/datenschutz'],
    ['datenschutz', '/datenschutz'],
    ['/', '/'],
    ['', '/'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocalizedPath(input)).toBe(expected)
  })
})

describe('findLocalizedGroup', () => {
  it('matches regardless of trailing slash, because Astro and the sitemap disagree on it', () => {
    expect(findLocalizedGroup('/datenschutz', GROUPS)).toBe(GROUPS[0])
    expect(findLocalizedGroup('/datenschutz/', GROUPS)).toBe(GROUPS[0])
    expect(findLocalizedGroup('/en/privacy', GROUPS)).toBe(GROUPS[0])
  })

  it('returns undefined for equal-slug routes and for no groups', () => {
    expect(findLocalizedGroup('/impressum/', GROUPS)).toBeUndefined()
    expect(findLocalizedGroup('/datenschutz/', [])).toBeUndefined()
    expect(findLocalizedGroup('/datenschutz/', undefined)).toBeUndefined()
  })
})

describe('getAlternateLinks with translated slugs', () => {
  it('points the EN alternate of the DE privacy page at /en/privacy, not the non-existent /en/datenschutz', () => {
    const links = alternates('/datenschutz')

    expect(links).toEqual([
      { hreflang: 'de', href: `${BASE}/datenschutz/` },
      { hreflang: 'en', href: `${BASE}/en/privacy/` },
      { hreflang: 'x-default', href: `${BASE}/datenschutz/` },
    ])
    expect(links.some((l) => l.href.includes('/en/datenschutz'))).toBe(false)
  })

  it('emits an identical, reciprocal set from the EN side', () => {
    expect(alternates('/en/privacy')).toEqual(alternates('/datenschutz'))
  })

  it('emits the served URL form regardless of how the caller spelled the path', () => {
    for (const spelling of ['/datenschutz', '/datenschutz/']) {
      expect(alternates(spelling)).toEqual([
        { hreflang: 'de', href: `${BASE}/datenschutz/` },
        { hreflang: 'en', href: `${BASE}/en/privacy/` },
        { hreflang: 'x-default', href: `${BASE}/datenschutz/` },
      ])
    }
  })

  it('honours trailingSlash: never for translated slugs too', () => {
    const links = getAlternateLinks({
      path: '/datenschutz/',
      locales: LOCALES,
      defaultLocale: 'de',
      baseUrl: BASE,
      localizedPaths: GROUPS,
      trailingSlash: 'never',
    })

    expect(links).toEqual([
      { hreflang: 'de', href: `${BASE}/datenschutz` },
      { hreflang: 'en', href: `${BASE}/en/privacy` },
      { hreflang: 'x-default', href: `${BASE}/datenschutz` },
    ])
  })

  it('points x-default at the default-locale member of the group', () => {
    const xDefault = alternates('/en/privacy').find((l) => l.hreflang === 'x-default')

    expect(xDefault?.href).toBe(`${BASE}/datenschutz/`)
  })

  it('falls back to prefix derivation for equal-slug routes', () => {
    const links = alternates('/impressum')

    expect(links).toEqual([
      { hreflang: 'de', href: `${BASE}/impressum/` },
      { hreflang: 'en', href: `${BASE}/en/impressum/` },
      { hreflang: 'x-default', href: `${BASE}/impressum/` },
    ])
  })

  it('still derives by prefix when no localizedPaths are supplied', () => {
    const withoutGroups = getAlternateLinks({
      path: '/datenschutz',
      locales: LOCALES,
      defaultLocale: 'de',
      baseUrl: BASE,
    })

    expect(withoutGroups).toEqual([
      { hreflang: 'de', href: `${BASE}/datenschutz/` },
      { hreflang: 'en', href: `${BASE}/en/datenschutz/` },
      { hreflang: 'x-default', href: `${BASE}/datenschutz/` },
    ])
  })

  it('omits an untranslated locale rather than inventing a URL for it', () => {
    const links = getAlternateLinks({
      path: '/nur-deutsch',
      locales: LOCALES,
      defaultLocale: 'de',
      baseUrl: BASE,
      localizedPaths: [{ de: '/nur-deutsch/' }],
    })

    expect(links.map((l) => l.hreflang)).toEqual(['de', 'x-default'])
  })
})

describe('createI18n localizedPaths threading', () => {
  it('resolves translated slugs through the factory', () => {
    const i18n = createI18n({
      locales: LOCALES,
      defaultLocale: 'de',
      baseUrl: BASE,
      localizedPaths: GROUPS,
    })

    expect(i18n.getAlternateLinks('/datenschutz')).toEqual([
      { hreflang: 'de', href: `${BASE}/datenschutz/` },
      { hreflang: 'en', href: `${BASE}/en/privacy/` },
      { hreflang: 'x-default', href: `${BASE}/datenschutz/` },
    ])
  })

  it('keeps canonical and the self-referencing alternate identical for a translated slug', () => {
    const i18n = createI18n({
      locales: LOCALES,
      defaultLocale: 'de',
      baseUrl: BASE,
      localizedPaths: GROUPS,
    })

    const canonical = i18n.getCanonicalUrl('/datenschutz', 'de')
    const self = i18n.getAlternateLinks('/datenschutz').find((l) => l.hreflang === 'de')

    expect(self?.href).toBe(canonical)
  })

  it('threads trailingSlash through both SEO helpers', () => {
    const i18n = createI18n({
      locales: LOCALES,
      defaultLocale: 'de',
      baseUrl: BASE,
      localizedPaths: GROUPS,
      trailingSlash: 'never',
    })

    expect(i18n.getCanonicalUrl('/datenschutz/', 'de')).toBe(`${BASE}/datenschutz`)
    expect(i18n.getAlternateLinks('/datenschutz/').find((l) => l.hreflang === 'en')?.href).toBe(
      `${BASE}/en/privacy`,
    )
  })

  it('defaults localizedPaths to an empty list when omitted', () => {
    const i18n = createI18n({ locales: LOCALES, defaultLocale: 'de', baseUrl: BASE })

    expect(i18n.localizedPaths).toEqual([])
    expect(i18n.getAlternateLinks('/datenschutz')).toContainEqual({
      hreflang: 'en',
      href: `${BASE}/en/datenschutz/`,
    })
  })

  it('inherits the URL form resolved by @easy-web/seo when none is given', () => {
    const previous = process.env.EASY_WEB_SEO_TRAILING_SLASH
    process.env.EASY_WEB_SEO_TRAILING_SLASH = 'never'

    try {
      const i18n = createI18n({
        locales: LOCALES,
        defaultLocale: 'de',
        baseUrl: BASE,
        localizedPaths: GROUPS,
      })

      expect(i18n.trailingSlash).toBe('never')
      expect(i18n.getCanonicalUrl('/datenschutz', 'de')).toBe(`${BASE}/datenschutz`)
      expect(i18n.getAlternateLinks('/datenschutz')).toEqual([
        { hreflang: 'de', href: `${BASE}/datenschutz` },
        { hreflang: 'en', href: `${BASE}/en/privacy` },
        { hreflang: 'x-default', href: `${BASE}/datenschutz` },
      ])
    } finally {
      if (previous === undefined) delete process.env.EASY_WEB_SEO_TRAILING_SLASH
      else process.env.EASY_WEB_SEO_TRAILING_SLASH = previous
    }
  })

  it('lets an explicit trailingSlash outrank the inherited one', () => {
    const previous = process.env.EASY_WEB_SEO_TRAILING_SLASH
    process.env.EASY_WEB_SEO_TRAILING_SLASH = 'never'

    try {
      const i18n = createI18n({
        locales: LOCALES,
        defaultLocale: 'de',
        baseUrl: BASE,
        trailingSlash: 'always',
      })

      expect(i18n.trailingSlash).toBe('always')
    } finally {
      if (previous === undefined) delete process.env.EASY_WEB_SEO_TRAILING_SLASH
      else process.env.EASY_WEB_SEO_TRAILING_SLASH = previous
    }
  })
})

describe('validateLocalizedPaths', () => {
  it('accepts a complete group', () => {
    expect(validateLocalizedPaths(GROUPS, [...LOCALES])).toEqual([])
  })

  it('reports a missing locale', () => {
    expect(validateLocalizedPaths([{ de: '/datenschutz/' }], [...LOCALES])).toEqual([
      'localizedPaths[0] is missing the locale(s): en.',
    ])
  })

  it('reports two locales in one group mapping to the same path', () => {
    const problems = validateLocalizedPaths(
      [{ de: '/privacy/', en: '/privacy' }],
      [...LOCALES],
    )

    expect(problems).toContain('localizedPaths[0] maps more than one locale to the same path: /privacy.')
  })
})
