# @achimismaili/easy-web-seo

## 1.1.0

### Minor Changes

- cb8ab71: Make canonical, hreflang and sitemap URLs agree; support translated slugs

  Four defects observed on live instances. The first three share one root cause:
  both hreflang surfaces assumed a route uses the same slug in every locale, and
  each failed differently.

  **`/admin/` was advertised in the sitemap while robots.txt blocked it.**
  `@easy-web/seo` hardcoded `Disallow: /admin/` in the robots.txt route but passed
  no exclusion to `@astrojs/sitemap`. Both outputs now derive from one internal
  crawl policy, so they cannot drift again.

  **Translated slugs got no sitemap alternates.** `@astrojs/sitemap` pairs
  translations by comparing the path left after the locale prefix is stripped, so
  `/datenschutz/` and `/en/privacy/` landed in different groups and their
  `xhtml:link` alternates were dropped.

  **Translated slugs got in-page hreflang pointing at 404s.** `getAlternateLinks()`
  derived alternates by re-prefixing the current path, so the DE privacy page
  advertised `/en/datenschutz/` — a URL that does not exist.

  **Canonical and sitemap disagreed on trailing slashes.** Instances hand-write
  `pathname` props in mixed conventions, so `<SeoHead>` emitted
  `/datenschutz` while the sitemap emitted `/datenschutz/`. Both forms return 200,
  so Google saw competing duplicates with no consistent canonical.

  ## Breaking changes
  - **Every canonical, hreflang and `og:url` is now normalised** to the form the
    site actually serves, derived from Astro's `build.format` and `trailingSlash`.
    With Astro's defaults this means a trailing slash (`/about/`), which matches
    the sitemap. Expect Google to re-process canonicals after deploying.
  - `/admin/` is excluded from the sitemap and cannot be re-admitted via `filter`,
    which now composes with the crawl policy using AND semantics.
  - `noIndex: true` no longer emits a sitemap. It previously produced one that its
    own robots.txt globally blocked and never advertised.
  - Automatic hreflang tags are now language-only (`en`) instead of a guessed
    region (`en-EN`). The old heuristic uppercased the language code, which is
    correct only when language and region coincide (`de-DE`, `fr-FR`) and invented
    nonexistent regions otherwise (`en-EN`, `ja-JA`, `sv-SV`) that Google discards.
    Pass `sitemapLocales` for region-specific tags.
  - `@easy-web/seo` now requires `@easy-web/i18n` at runtime, not just for types.

  ## New

  `localizedPaths` declares routes whose slug differs per locale, and is consumed
  by both the sitemap and the page `<head>`:

  ```js
  // astro.config.mjs
  easyWebSeo({
    sitemapLocales: { de: 'de-DE', en: 'en-US' },
    localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
  });

  // src/lib/i18n.ts
  createI18n({
    locales: ['de', 'en'],
    defaultLocale: 'de',
    baseUrl: 'https://example.de',
    localizedPaths: [{ de: '/datenschutz/', en: '/en/privacy/' }],
  });
  ```

  Declare the groups once in a shared module and import it into both call sites.
  A stale, misspelled or duplicated entry fails the build rather than degrading
  silently. Routes sharing a slug across locales pair automatically and must not
  be listed.

  `createI18n` and the SEO helpers also accept `trailingSlash: 'always' | 'never'`
  for instances that do not use Astro's default `directory` output.

### Patch Changes

- Updated dependencies [cb8ab71]
  - @easy-web/i18n@1.1.0

## 1.0.0

### Patch Changes

- @achimismaili/easy-web-i18n@1.0.0

## 0.2.0

### Minor Changes

- 8247db9: Initial release: AstroIntegration wrapping @astrojs/sitemap with i18n hreflang, dynamic robots.txt route with noIndex mode, and <SeoHead> Astro component (title, canonical, OpenGraph, Twitter Cards, hreflang, theme-color, manifest link).
