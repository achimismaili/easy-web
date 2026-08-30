# @easy-web/seo

Shared SEO primitives for the `@easy-web/*` ecosystem.

## Usage

```ts
// astro.config.mjs
import easyWebSeo from '@easy-web/seo';

export default defineConfig({
  site: 'https://yoursite.example',
  integrations: [
    easyWebSeo({
      sitemapLocales: { de: 'de-DE', en: 'en-US' },
      // noIndex: true  // set on staging/dev sites
    }),
  ],
});
```

## Routes whose slug differs per locale

`@astrojs/sitemap` pairs translations by comparing the path left after the
locale prefix is stripped. `/datenschutz/` and `/en/privacy/` therefore never
pair, and their hreflang alternates are dropped. Declare such routes explicitly:

```ts
easyWebSeo({
  sitemapLocales: { de: 'de-DE', en: 'en-US' },
  localizedPaths: [
    { de: '/datenschutz/', en: '/en/privacy/' },
    { de: '/kontakt/', en: '/en/contact/' },
  ],
});
```

Routes that use the same slug in every locale (`/impressum/` ↔ `/en/impressum/`)
pair automatically and must not be listed.

Pass the same groups to `createI18n` from `@easy-web/i18n` so the page `<head>`
and the sitemap agree. Declare them once in a shared module:

```ts
// src/lib/localized-paths.ts
export const localizedPaths = [
  { de: '/datenschutz/', en: '/en/privacy/' },
] as const;
```

A group that names an unknown locale, omits a configured one, claims a path
already owned by another group, or points at a route that was never built fails
the build.

## Crawl policy

robots.txt and the sitemap derive from one internal policy, so they cannot
disagree:

| Mode | robots.txt | Sitemap |
| :--- | :--- | :--- |
| default | `Disallow: /admin/`, `Allow: /`, `Sitemap:` line | emitted, `/admin/` excluded |
| `noIndex: true` | `Disallow: /` | not emitted |

A caller-supplied `filter` composes with this policy using AND semantics and
cannot re-admit a blocked path.

## URL form

`<SeoHead>` normalises the canonical and `og:url` to the form the site actually
serves, resolved from Astro's `build.format` and `trailingSlash`. With Astro's
defaults that is a trailing slash (`/about/`), matching the sitemap `<loc>` and
the self-referencing hreflang.

This matters because `/about` and `/about/` both return 200 on Azure Static Web
Apps. If the canonical and the sitemap disagree, Google sees competing
duplicates. Pages may therefore pass `pathname` in either spelling — the emitted
URL is the same either way.

## hreflang locale tags

Provide `sitemapLocales` to control the emitted tags. Without it the integration
falls back to language-only tags (`de`, `en`) and warns. It deliberately does not
guess a region: uppercasing the language code is correct only when the two
coincide (`de-DE`, `fr-FR`) and produces invalid tags otherwise (`en-EN`,
`ja-JA`), which Google discards.

## SeoHead

```astro
// In your Base layout:
import SeoHead from '@easy-web/seo/components/SeoHead.astro';

<SeoHead
  title={title}
  description={description}
  pathname={pathname}
  locale={locale}
  siteName="My Site"
/>
```

Full implementation: see package source.
