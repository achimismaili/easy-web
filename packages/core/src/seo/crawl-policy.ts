/**
 * Single source of truth for what crawlers may see.
 *
 * robots.txt and the sitemap previously decided this independently: the route
 * handler hardcoded `Disallow: /admin/` while the sitemap integration applied
 * no exclusions at all, so every instance shipped a sitemap advertising the
 * very path its robots.txt blocked. Both outputs now derive from this module,
 * which makes that class of contradiction unrepresentable.
 */

export interface CrawlPolicy {
  readonly disallow: readonly string[]
  readonly allow: readonly string[]
  /** Whether this site publishes a sitemap at all — read by both robots.txt and the integration. */
  readonly sitemap: boolean
}

const PUBLIC_DISALLOW = ['/admin/'] as const

export function createCrawlPolicy(noIndex: boolean): CrawlPolicy {
  return noIndex
    ? { disallow: ['/'], allow: [], sitemap: false }
    : { disallow: [...PUBLIC_DISALLOW], allow: ['/'], sitemap: true }
}

export function isDisallowedPath(pathname: string, policy: CrawlPolicy): boolean {
  return policy.disallow.some((rule) => {
    if (rule === '/') {
      return true
    }

    const prefix = rule.endsWith('/') ? rule : `${rule}/`

    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)
  })
}
