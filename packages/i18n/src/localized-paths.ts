/**
 * Shared model for routes whose slug differs per locale.
 *
 * Both hreflang surfaces consume this one model:
 *
 * - `@easy-web/i18n` `getAlternateLinks()` renders the in-page
 *   `<link rel="alternate" hreflang>` tags.
 * - `@easy-web/seo` renders the `xhtml:link` alternates in `sitemap-0.xml`.
 *
 * Keeping the model here is deliberate. Both surfaces previously derived
 * alternates independently by stripping the locale prefix and re-prefixing the
 * remaining path, which silently assumes the slug is identical in every locale.
 * For a pair like DE `/datenschutz/` and EN `/en/privacy/` that assumption is
 * wrong, and the two surfaces failed in different ways: the sitemap omitted the
 * alternates entirely, while the page head emitted `/en/datenschutz/` — a URL
 * that does not exist. One shared model means the two can no longer disagree.
 */

/**
 * One translated route, keyed by Astro locale id.
 *
 * Values are complete public route paths including any locale prefix, written
 * exactly as the route is served:
 *
 * ```ts
 * { de: '/datenschutz/', en: '/en/privacy/' }
 * ```
 *
 * Trailing slashes are insignificant for matching — consumers render the URL
 * form appropriate to their surface.
 */
export type LocalizedPathGroup = Readonly<Record<string, string>>

export function stripQueryAndHash(path: string): string {
  const withoutHash = path.split('#')[0] ?? ''
  return withoutHash.split('?')[0] ?? ''
}

/**
 * Which URL form the site actually serves, mirroring Astro's `build.format`:
 * `always` for `directory` output (`/about/`), `never` for `file` (`/about`).
 */
export type TrailingSlash = 'always' | 'never'

/**
 * The URL form `@easy-web/seo` resolved from `astro.config.mjs`, for callers
 * that run outside an Astro integration and so cannot read the config.
 *
 * Components and instance modules render links with this so internal hrefs
 * point at the canonical URL instead of the form the host will redirect away.
 */
export function ambientTrailingSlash(): TrailingSlash {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }

  return runtime.process?.env?.['EASY_WEB_SEO_TRAILING_SLASH'] === 'never'
    ? 'never'
    : 'always'
}

/**
 * Renders a path in the form the site actually serves.
 *
 * Canonical, hreflang alternates and the sitemap must all agree byte-for-byte,
 * or Google treats `/about` and `/about/` as competing duplicates. Instances
 * hand-write `pathname` props in mixed conventions, so every SEO URL is routed
 * through this function rather than trusting the caller's spelling.
 */
export function toServedPath(path: string, style: TrailingSlash = 'always'): string {
  const normalized = normalizeLocalizedPath(path)

  if (normalized === '/' || style === 'never') {
    return normalized
  }

  return `${normalized}/`
}

/**
 * Reduces a path to the form used for comparison and lookup: leading slash,
 * no trailing slash (except root), no query string, no hash.
 *
 * This is what makes `/datenschutz`, `/datenschutz/` and `/datenschutz/?x=1`
 * resolve to the same group. Astro hands `Astro.url.pathname` to the layout
 * without a trailing slash while `@astrojs/sitemap` emits one, so lookup has to
 * be insensitive to that difference.
 */
export function normalizeLocalizedPath(path: string): string {
  const withoutQuery = stripQueryAndHash(path)
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  const trimmed = withLeadingSlash.replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}

/**
 * Finds the group that claims `path`, or `undefined` when the route uses the
 * same slug in every locale (the common case, handled by prefix derivation).
 */
export function findLocalizedGroup(
  path: string,
  groups: readonly LocalizedPathGroup[] | undefined,
): LocalizedPathGroup | undefined {
  if (!groups || groups.length === 0) {
    return undefined
  }

  const target = normalizeLocalizedPath(path)

  return groups.find((group) =>
    Object.values(group).some((candidate) => normalizeLocalizedPath(candidate) === target),
  )
}

/**
 * Validates declared groups against the configured locales.
 *
 * Returns a list of human-readable problems; an empty array means valid.
 * Callers decide whether to throw or warn — `@easy-web/seo` fails the build,
 * because a stale mapping produces output that is syntactically valid but
 * silently wrong, which is precisely the failure mode this model exists to
 * eliminate.
 */
export function validateLocalizedPaths(
  groups: readonly LocalizedPathGroup[],
  locales: readonly string[],
): string[] {
  const problems: string[] = []
  const claimedBy = new Map<string, number>()

  groups.forEach((group, index) => {
    const label = `localizedPaths[${index}]`
    const declared = Object.keys(group)

    const missing = locales.filter((locale) => !declared.includes(locale))
    if (missing.length > 0) {
      problems.push(`${label} is missing the locale(s): ${missing.join(', ')}.`)
    }

    const unknown = declared.filter((locale) => !locales.includes(locale))
    if (unknown.length > 0) {
      problems.push(`${label} declares unknown locale(s): ${unknown.join(', ')}.`)
    }

    const seenInGroup = new Set<string>()

    for (const locale of declared) {
      const value = group[locale] as string

      if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
        problems.push(
          `${label}.${locale} must be an absolute path beginning with a single "/", got: ${String(value)}.`,
        )
        continue
      }

      if (value.includes('?') || value.includes('#')) {
        problems.push(`${label}.${locale} must not contain a query string or hash, got: ${value}.`)
        continue
      }

      const normalized = normalizeLocalizedPath(value)

      if (seenInGroup.has(normalized)) {
        problems.push(`${label} maps more than one locale to the same path: ${normalized}.`)
      }
      seenInGroup.add(normalized)

      const owner = claimedBy.get(normalized)
      if (owner !== undefined && owner !== index) {
        problems.push(
          `${normalized} is claimed by both localizedPaths[${owner}] and ${label}; each path may belong to only one group.`,
        )
      }
      claimedBy.set(normalized, index)
    }
  })

  return problems
}
