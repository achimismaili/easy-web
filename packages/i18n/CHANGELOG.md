# @achimismaili/easy-web-i18n

## 1.2.3

## 1.2.2

### Patch Changes

- 9e5463b: Point language-switch links at the served URL form

  `LanguageSwitch` derived the alternate href with its own hardcoded rule and
  ignored `trailingSlash` entirely, so on a site configured `trailingSlash: 'never'`
  every language switch pointed at `/en/` while the site serves `/en`. In
  production Azure SWA redirects that, costing a `301` on every switch; under
  `astro preview` it is a plain `404`.

  The component now renders the href in the form the site actually serves, which
  also normalises any `alternateHref` a page passes in — so pages declaring
  `alternateHref="/en/privacy/"` no longer need editing.

  `ambientTrailingSlash()` is exported from `@easy-web/i18n` for this: components
  run outside the Astro integration and cannot read `astro.config.mjs`, so they
  read the form `@easy-web/seo` resolved at config time. `createI18n` now uses the
  same helper instead of its own copy.

## 1.2.1

### Patch Changes

- b96f19f: Keep hreflang and sitemap URLs in the form the site actually serves

  Two gaps in 1.2.0 let the URL form diverge again, both found by comparing the
  built output of a real instance rather than by unit test.

  **`createI18n` ignored the resolved URL form.** It is called from instance code,
  not from an Astro integration, so it cannot read `astro.config.mjs` and defaulted
  to trailing slashes. On a site configured with `trailingSlash: 'never'` the
  canonical correctly dropped the slash while every hreflang alternate kept it —
  including the self-referencing one, which invalidates the whole cluster. It now
  inherits the form `@easy-web/seo` resolved, and an explicit `trailingSlash`
  passed to `createI18n` still wins.

  **Sitemap entries were not re-rendered into the served form.** `<loc>` and the
  `xhtml:link` alternates came straight from `@astrojs/sitemap`, so they could
  differ from the canonical the same build emitted. Both are now rendered through
  the same helper that produces the canonical.

  One cosmetic difference remains and is intentional: the underlying `sitemap`
  library writes the site root as a bare origin (`https://example.com`) while the
  canonical writes `https://example.com/`. Those are the same URL — an empty path
  normalises to `/` before the request is sent — so no crawler sees two URLs, and
  post-processing the emitted XML to force agreement is not worth the fragility.

## 1.2.0

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

## 1.0.0

## 0.4.0

### Minor Changes

- 9298ec9: Tighten Astro peer-dependency range to `>=6.0.0 <8.0.0` (was `>=4.0.0 <7.0.0`).
  - **Drops declarative-only support for Astro 4 and 5.** These majors are effectively unmaintained (4.x last patch Aug 2025, 5.x last patch May 2026) and the package's own devDependency has been `astro: ^6.0.0` for a while, so 4.x/5.x compatibility was untested. Package source contains zero direct Astro imports, so real-world impact is limited to peer-warning noise.
  - **Adds support for Astro 7.** Enables consumers to upgrade to Astro 7 without a peer-dependency conflict.
  - Brings this package in line with the rest of the easy-web ecosystem (`easy-web-content-blocks`, `easy-web-cms-adapters` already at `>=6.0.0`).
