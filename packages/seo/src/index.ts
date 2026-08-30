import type { AstroConfig, AstroIntegration } from 'astro'
import sitemap from '@astrojs/sitemap'
import {
  normalizeLocalizedPath,
  toServedPath,
  validateLocalizedPaths,
  type LocalizedPathGroup,
  type TrailingSlash,
} from '@easy-web/i18n'

import { createCrawlPolicy, isDisallowedPath } from './crawl-policy.js'

export type { LocalizedPathGroup }

export type Options = {
  noIndex?: boolean
  sitemapLocales?: Record<string, string>
  /**
   * Routes whose slug differs per locale, e.g. `{ de: '/datenschutz/', en: '/en/privacy/' }`.
   *
   * `@astrojs/sitemap` pairs translations by comparing the path left after the
   * locale prefix is stripped, so translated slugs never pair and their
   * hreflang alternates are silently omitted. Declaring the group here restores
   * them. Declare the same groups on `createI18n` so the page `<head>` and the
   * sitemap agree.
   *
   * A stale or misspelled entry fails the build rather than degrading quietly.
   */
  localizedPaths?: readonly LocalizedPathGroup[]
  /** Composed with the built-in crawl policy using AND semantics; cannot re-admit blocked paths. */
  filter?: (page: string) => boolean
}

type LinkItem = { lang: string; url: string }
type SitemapItem = { url: string; links?: LinkItem[] } & Record<string, unknown>

function localeIdsOf(config: AstroConfig): string[] {
  return (config.i18n?.locales ?? []).map((locale) =>
    typeof locale === 'string' ? locale : locale.path,
  )
}

function resolveTrailingSlash(config: AstroConfig): TrailingSlash {
  const usesDirectoryFormat =
    config.trailingSlash !== 'never' && config.build.format === 'directory'

  return usesDirectoryFormat ? 'always' : 'never'
}

function toOutputUrl(path: string, config: AstroConfig): string {
  const route = toServedPath(path, resolveTrailingSlash(config))

  const base = new URL(
    config.base.endsWith('/') ? config.base : `${config.base}/`,
    config.site,
  )

  return new URL(route.replace(/^\/+/, ''), base).href
}

function pathnameOf(page: string, config: AstroConfig): string {
  const absolute = page.startsWith('http') ? page : new URL(page, config.site).href
  const basePath = normalizeLocalizedPath(config.base)
  const pathname = normalizeLocalizedPath(new URL(absolute).pathname)

  if (basePath !== '/' && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    const stripped = pathname.slice(basePath.length)
    return stripped === '' ? '/' : stripped
  }

  return pathname
}

export default function easyWebSeo(options: Options = {}): AstroIntegration {
  return {
    name: '@easy-web/seo',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, injectRoute, logger }) => {
        if (!config.site) {
          logger.error(
            '@easy-web/seo: astro.config.mjs must set `site` (a full https:// URL). ' +
            'Example: site: "https://yoursite.example"'
          )
          throw new Error('@easy-web/seo: `site` is required in astro.config.mjs')
        }

        const noIndex = options.noIndex ?? false
        const policy = createCrawlPolicy(noIndex)

        let sitemapI18n: { defaultLocale: string; locales: Record<string, string> } | undefined
        if (config.i18n && config.i18n.locales.length > 0) {
          const localeMap: Record<string, string> = options.sitemapLocales ?? {}
          if (!options.sitemapLocales) {
            // Language-only tags, never a guessed region. "uppercase the language"
            // only coincidentally works (de-DE, fr-FR) and invents nonexistent
            // regions otherwise (en-EN, ja-JA, sv-SV), which Google discards.
            for (const locale of config.i18n.locales) {
              const id = typeof locale === 'string' ? locale : locale.path
              localeMap[id] = id
            }
            logger.warn(
              '@easy-web/seo: no `sitemapLocales` provided, falling back to language-only hreflang tags (' +
              Object.keys(localeMap).join(', ') +
              '). Provide `sitemapLocales` for region-specific tags (e.g. { de: "de-DE", en: "en-US" }).'
            )
          }
          sitemapI18n = {
            defaultLocale: config.i18n.defaultLocale,
            locales: localeMap,
          }
        }

        const declaredGroups = options.localizedPaths ?? []

        if (declaredGroups.length > 0 && !sitemapI18n) {
          throw new Error(
            '@easy-web/seo: `localizedPaths` requires `i18n` to be configured in astro.config.mjs.'
          )
        }

        const localeIds = localeIdsOf(config)
        const problems = validateLocalizedPaths(declaredGroups, localeIds)
        if (problems.length > 0) {
          throw new Error(
            `@easy-web/seo: invalid \`localizedPaths\`:\n- ${problems.join('\n- ')}`
          )
        }

        const linksByUrl = new Map<string, LinkItem[]>()
        const declaredUrls = new Set<string>()

        for (const group of declaredGroups) {
          const links: LinkItem[] = localeIds
            .filter((locale) => group[locale] !== undefined)
            .map((locale) => ({
              lang: (sitemapI18n as { locales: Record<string, string> }).locales[locale] as string,
              url: toOutputUrl(group[locale] as string, config),
            }))

          for (const link of links) {
            linksByUrl.set(link.url, links)
            declaredUrls.add(link.url)
          }
        }

        const seenUrls = new Set<string>()
        const conflicts: string[] = []

        if (policy.sitemap) {
          const sitemapIntegration = sitemap({
            ...(sitemapI18n ? { i18n: sitemapI18n } : {}),
            namespaces: { xhtml: true },
            filter: (page: string): boolean =>
              !isDisallowedPath(pathnameOf(page, config), policy) &&
              (options.filter?.(page) ?? true),
            serialize: (item: SitemapItem): SitemapItem => {
              const declared = linksByUrl.get(item.url)

              if (declared) {
                seenUrls.add(item.url)
                // Replace, never merge: every member of a group must carry the
                // same complete, reciprocal set or Google rejects the cluster.
                return { ...item, links: [...declared] }
              }

              for (const link of item.links ?? []) {
                if (linksByUrl.has(link.url)) {
                  conflicts.push(
                    `${item.url} was auto-paired with ${link.url}, which is already claimed by a localizedPaths group.`
                  )
                }
              }

              return item
            },
          })

          const validatorIntegration: AstroIntegration = {
            name: '@easy-web/seo:localized-paths-validation',
            hooks: {
              'astro:build:done': () => {
                const missing = [...declaredUrls].filter((url) => !seenUrls.has(url))
                const failures = [
                  ...missing.map(
                    (url) =>
                      `${url} is declared in localizedPaths but no such page was built. Check for a typo or a removed route.`
                  ),
                  ...conflicts,
                ]

                if (failures.length > 0) {
                  throw new Error(
                    `@easy-web/seo: invalid \`localizedPaths\`:\n- ${failures.join('\n- ')}`
                  )
                }
              },
            },
          }

          // Order matters: @astrojs/sitemap runs serialize inside its own
          // astro:build:done, and it swallows errors thrown from serialize, so
          // validation has to run in a later hook to fail the build.
          updateConfig({ integrations: [sitemapIntegration, validatorIntegration] })
        }

        process.env.EASY_WEB_SEO_NO_INDEX = String(noIndex)
        // <SeoHead> is a component and cannot read astro.config, so the style
        // the sitemap uses is published here for it to reuse. Both surfaces
        // therefore derive the canonical URL form from one resolver.
        process.env.EASY_WEB_SEO_TRAILING_SLASH = resolveTrailingSlash(config)

        injectRoute({
          pattern: '/robots.txt',
          entrypoint: new URL('./routes/robots-txt.js', import.meta.url),
          prerender: true,
        })
      },
    },
  }
}

export { createCrawlPolicy, isDisallowedPath, type CrawlPolicy } from './crawl-policy.js'
