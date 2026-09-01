# @achimismaili/easy-web-seo

## 1.2.3

### Patch Changes

- 84c3d42: Stop the built 404 documents from being indexable

  Azure Static Web Apps returns the correct `404` status for a genuine miss, but
  the 404 documents themselves are ordinary files, so requesting `/404` or
  `/<locale>/404` directly answers `200`. That is a soft 404: a page whose content
  says "not found" while its status says otherwise. Worse, it carried a
  self-referencing canonical, actively asserting it was a canonical destination.

  `<SeoHead>` now emits `noindex, nofollow` and omits the canonical when the route
  is a 404. An explicit `noIndex` prop still applies as before, and every other
  route is unchanged.

  This is deliberately a metadata fix rather than a routing one. Forcing a real
  `404` status would mean the integration writing SWA route rules, and ADR 0013
  amendment A2 records why that surface is treated carefully: a previous version
  generated a greedy per-locale route that shadowed an entire language of the site.
  Exact-match status rules would not repeat that failure, but they interact with
  `navigationFallback` in ways that need live verification, so they are tracked as
  follow-up work rather than bundled here.
  - @easy-web/i18n@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [9e5463b]
  - @easy-web/i18n@1.2.2

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

- Updated dependencies [b96f19f]
  - @easy-web/i18n@1.2.1

## 1.2.0

### Minor Changes

- a22aa62: Derive the SWA trailingSlash redirect from Astro config

  Azure Static Web Apps serves `/about` and `/about/` with `200` by default, so
  both forms are reachable and only the canonical tag disambiguates them. Microsoft
  recommends configuring an explicit `trailingSlash` strategy so one form `301`s to
  the other; until now every instance had to remember to hand-edit
  `staticwebapp.config.json` to get it, and nothing stopped that value from
  contradicting the canonical URLs `@easy-web/seo` emits.

  `easyWebNotFound()` now derives `trailingSlash` from the same Astro configuration
  that drives canonical, hreflang and sitemap URLs, and manages it through the
  existing sidecar so it stays upgrade-safe:

  | Astro config                                | Emitted `trailingSlash`                                                |
  | :------------------------------------------ | :--------------------------------------------------------------------- |
  | `trailingSlash: 'always'` or `'never'`      | used as-is — an explicit statement of intent outranks the output shape |
  | `build.format: 'directory'` (Astro default) | `always`                                                               |
  | `build.format: 'file'`                      | `never`                                                                |
  | `build.format: 'preserve'`                  | left unmanaged, with a warning                                         |

  `preserve` mirrors the source tree, so some routes emit as files and others as
  directories. No single redirect rule is correct for the whole site, so the key is
  left alone rather than guessed.

  A `trailingSlash` you set yourself in `staticwebapp.config.json` still wins, with
  a warning, exactly as a user-defined `responseOverrides.404` already does. Remove
  it to hand control back to the integration.

  Also fixes `@easy-web/seo`'s resolution of the same value. It previously ignored
  an explicit `trailingSlash: 'always'` whenever `build.format` was not `directory`,
  and silently treated `preserve` as no-slash. Both packages now apply the same
  precedence.

  Behaviour change on upgrade: instances on Astro defaults will start emitting
  `"trailingSlash": "always"`, so SWA begins `301`-ing `/about` to `/about/`. To
  get the opposite form, set `trailingSlash: 'never'` in `astro.config.mjs` — one
  line, and the canonical, hreflang, sitemap and redirect all follow it together.

### Patch Changes

- @easy-web/i18n@1.2.0

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
