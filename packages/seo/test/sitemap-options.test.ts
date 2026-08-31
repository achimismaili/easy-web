import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

const { sitemapSpy } = vi.hoisted(() => ({ sitemapSpy: vi.fn() }))

vi.mock('@astrojs/sitemap', () => ({
  default: (opts: unknown) => {
    sitemapSpy(opts)
    return { name: '@astrojs/sitemap', hooks: {} }
  },
}))

const easyWebSeo = (await import('../src/index.js')).default

type SitemapOptions = {
  filter: (page: string) => boolean
  serialize: (item: { url: string; links?: { lang: string; url: string }[] }) => {
    url: string
    links?: { lang: string; url: string }[]
  }
  namespaces?: { xhtml?: boolean }
  i18n?: { defaultLocale: string; locales: Record<string, string> }
}

type Integration = ReturnType<typeof easyWebSeo>

const SITE = 'https://harleyrentflorida.de'

const baseConfig = () => ({
  site: new URL(SITE),
  base: '/',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  i18n: { locales: ['de', 'en'], defaultLocale: 'de', routing: {} },
  integrations: [],
})

const run = (
  integration: Integration,
  config: Record<string, unknown> = baseConfig(),
) => {
  const updateConfig = vi.fn()
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  const hook = integration.hooks['astro:config:setup'] as unknown as (p: unknown) => void

  hook({ config, updateConfig, injectRoute: vi.fn(), logger })

  return { updateConfig, logger }
}

const sitemapOptions = (): SitemapOptions => sitemapSpy.mock.calls[0]?.[0] as SitemapOptions

beforeEach(() => {
  sitemapSpy.mockClear()
})

afterEach(() => {
  delete process.env.EASY_WEB_SEO_NO_INDEX
  delete process.env.EASY_WEB_SEO_TRAILING_SLASH
  vi.restoreAllMocks()
})

describe('trailing-slash style resolution', () => {
  it('publishes "always" for Astro directory output so SeoHead matches the sitemap', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }))

    expect(process.env.EASY_WEB_SEO_TRAILING_SLASH).toBe('always')
  })

  it('publishes "never" for file output', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }), {
      ...baseConfig(),
      build: { format: 'file' },
    })

    expect(process.env.EASY_WEB_SEO_TRAILING_SLASH).toBe('never')
  })

  it('publishes "never" when trailingSlash is explicitly never', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }), {
      ...baseConfig(),
      trailingSlash: 'never',
    })

    expect(process.env.EASY_WEB_SEO_TRAILING_SLASH).toBe('never')
  })

  it('lets an explicit trailingSlash outrank the output shape', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }), {
      ...baseConfig(),
      build: { format: 'file' },
      trailingSlash: 'always',
    })

    expect(process.env.EASY_WEB_SEO_TRAILING_SLASH).toBe('always')
  })

  it('warns and assumes slashes for build.format "preserve", which emits both shapes', () => {
    const { logger } = run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }), {
      ...baseConfig(),
      build: { format: 'preserve' },
    })

    expect(process.env.EASY_WEB_SEO_TRAILING_SLASH).toBe('always')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('preserve'))
  })

  it('emits sitemap URLs in the same form it publishes for the canonical', () => {
    run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
      }),
    )

    const links = sitemapOptions().serialize({ url: `${SITE}/datenschutz/` }).links ?? []

    expect(process.env.EASY_WEB_SEO_TRAILING_SLASH).toBe('always')
    for (const link of links) {
      expect(link.url.endsWith('/')).toBe(true)
    }
  })

  it('emits sitemap URLs without a slash under file output, matching that canonical form', () => {
    run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
      }),
      { ...baseConfig(), build: { format: 'file' } },
    )

    const links = sitemapOptions().serialize({ url: `${SITE}/datenschutz` }).links ?? []

    expect(links.map((l) => l.url)).toEqual([`${SITE}/datenschutz`, `${SITE}/en/privacy`])
  })
})

describe('sitemap crawl-policy filter', () => {
  it('excludes /admin/ from the sitemap, matching the robots.txt Disallow', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }))

    const { filter } = sitemapOptions()

    expect(filter(`${SITE}/admin/`)).toBe(false)
    expect(filter(`${SITE}/datenschutz/`)).toBe(true)
  })

  it('composes a caller filter with AND semantics', () => {
    run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        filter: (page) => !page.includes('/bikes/'),
      }),
    )

    const { filter } = sitemapOptions()

    expect(filter(`${SITE}/bikes/fatboy/`)).toBe(false)
    expect(filter(`${SITE}/about/`)).toBe(true)
  })

  it('does not let a caller filter re-admit a crawl-policy blocked path', () => {
    run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        filter: () => true,
      }),
    )

    expect(sitemapOptions().filter(`${SITE}/admin/`)).toBe(false)
  })

  it('registers no sitemap at all in noIndex mode, since robots.txt blocks everything', () => {
    const { updateConfig } = run(easyWebSeo({ noIndex: true, sitemapLocales: { de: 'de-DE', en: 'en-US' } }))

    expect(sitemapSpy).not.toHaveBeenCalled()
    expect(updateConfig).not.toHaveBeenCalled()
  })

  it('enables the xhtml namespace so xhtml:link alternates are valid', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }))

    expect(sitemapOptions().namespaces).toEqual({ xhtml: true })
  })
})

describe('localizedPaths serialization', () => {
  const withGroups = () =>
    easyWebSeo({
      sitemapLocales: { de: 'de-DE', en: 'en-US' },
      localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
    })

  it('injects reciprocal alternates onto both members of a translated-slug group', () => {
    run(withGroups())
    const { serialize } = sitemapOptions()

    const expected = [
      { lang: 'de-DE', url: `${SITE}/datenschutz/` },
      { lang: 'en-US', url: `${SITE}/en/privacy/` },
    ]

    expect(serialize({ url: `${SITE}/datenschutz/` }).links).toEqual(expected)
    expect(serialize({ url: `${SITE}/en/privacy/` }).links).toEqual(expected)
  })

  it('includes a self-reference in each group member link set', () => {
    run(withGroups())
    const { serialize } = sitemapOptions()

    const links = serialize({ url: `${SITE}/datenschutz/` }).links ?? []

    expect(links.map((l) => l.url)).toContain(`${SITE}/datenschutz/`)
  })

  it('leaves equal-slug pages that @astrojs/sitemap already paired untouched', () => {
    run(withGroups())
    const { serialize } = sitemapOptions()

    const autoPaired = {
      url: `${SITE}/impressum/`,
      links: [
        { lang: 'de-DE', url: `${SITE}/impressum/` },
        { lang: 'en-US', url: `${SITE}/en/impressum/` },
      ],
    }

    expect(serialize(autoPaired)).toEqual(autoPaired)
  })

  it('never drops an entry by returning undefined', () => {
    run(withGroups())
    const { serialize } = sitemapOptions()

    expect(serialize({ url: `${SITE}/admin/` })).toBeDefined()
  })

  it('re-renders every <loc> into the served form so it matches the canonical', () => {
    run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
      }),
      { ...baseConfig(), trailingSlash: 'never' },
    )

    const { serialize } = sitemapOptions()

    expect(serialize({ url: `${SITE}/about/` }).url).toBe(`${SITE}/about`)
    expect(serialize({ url: `${SITE}/about` }).url).toBe(`${SITE}/about`)
  })

  it('normalises auto-paired alternates too, not just the loc', () => {
    run(easyWebSeo({ sitemapLocales: { de: 'de-DE', en: 'en-US' } }), {
      ...baseConfig(),
      trailingSlash: 'never',
    })

    const serialized = sitemapOptions().serialize({
      url: `${SITE}/impressum/`,
      links: [
        { lang: 'de-DE', url: `${SITE}/impressum/` },
        { lang: 'en-US', url: `${SITE}/en/impressum/` },
      ],
    })

    expect(serialized.links?.map((l) => l.url)).toEqual([
      `${SITE}/impressum`,
      `${SITE}/en/impressum`,
    ])
  })
})

describe('localizedPaths validation', () => {
  const expectThrow = (options: Parameters<typeof easyWebSeo>[0], message: string | RegExp) => {
    expect(() => run(easyWebSeo(options))).toThrow(message)
  }

  it('rejects a group missing a configured locale', () => {
    expectThrow(
      { sitemapLocales: { de: 'de-DE', en: 'en-US' }, localizedPaths: [{ de: '/datenschutz/' }] },
      /missing the locale\(s\): en/,
    )
  })

  it('rejects a group naming an unknown locale', () => {
    expectThrow(
      {
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/', fr: '/fr/confidentialite/' }],
      },
      /unknown locale\(s\): fr/,
    )
  })

  it('rejects a path that is not absolute', () => {
    expectThrow(
      {
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: 'datenschutz/', en: '/en/privacy/' }],
      },
      /must be an absolute path/,
    )
  })

  it('rejects a path carrying a query string', () => {
    expectThrow(
      {
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/?x=1', en: '/en/privacy/' }],
      },
      /must not contain a query string or hash/,
    )
  })

  it('rejects the same path being claimed by two groups', () => {
    expectThrow(
      {
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [
          { de: '/datenschutz/', en: '/en/privacy/' },
          { de: '/datenschutz/', en: '/en/data-protection/' },
        ],
      },
      /claimed by both/,
    )
  })

  it('rejects localizedPaths when astro i18n is not configured', () => {
    expect(() =>
      run(easyWebSeo({ localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }] }), {
        ...baseConfig(),
        i18n: undefined,
      }),
    ).toThrow(/requires `i18n` to be configured/)
  })

  it('accepts a valid group', () => {
    expect(() =>
      run(
        easyWebSeo({
          sitemapLocales: { de: 'de-DE', en: 'en-US' },
          localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
        }),
      ),
    ).not.toThrow()
  })
})

describe('localizedPaths build-time verification', () => {
  const registeredValidator = (updateConfig: ReturnType<typeof vi.fn>) => {
    const patch = updateConfig.mock.calls[0]?.[0] as { integrations: Integration[] }
    return patch.integrations
  }

  it('registers the validator after @astrojs/sitemap so it can observe serialize', () => {
    const { updateConfig } = run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
      }),
    )

    const names = registeredValidator(updateConfig).map((i) => i.name)

    expect(names).toEqual(['@astrojs/sitemap', '@easy-web/seo:localized-paths-validation'])
  })

  it('fails the build when a declared path was never emitted', () => {
    const { updateConfig } = run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/typo/' }],
      }),
    )

    const validator = registeredValidator(updateConfig)[1] as Integration
    const done = validator.hooks['astro:build:done'] as unknown as () => void

    expect(() => done()).toThrow(/no such page was built/)
  })

  it('passes when every declared path was emitted', () => {
    const { updateConfig } = run(
      easyWebSeo({
        sitemapLocales: { de: 'de-DE', en: 'en-US' },
        localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
      }),
    )

    const { serialize } = sitemapOptions()
    serialize({ url: `${SITE}/datenschutz/` })
    serialize({ url: `${SITE}/en/privacy/` })

    const validator = registeredValidator(updateConfig)[1] as Integration
    const done = validator.hooks['astro:build:done'] as unknown as () => void

    expect(() => done()).not.toThrow()
  })
})
