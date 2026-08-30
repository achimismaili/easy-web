# @easy-web/i18n

Bilingual i18n utilities for IT-CI web projects. Built for static-prerender sites on Azure Static Web Apps using Astro and Paraglide-JS.

## Installation

Add the package and its peer dependencies. Install from npm.

```bash
pnpm add @easy-web/i18n @inlang/paraglide-js astro
```

## Quick start

Create a central i18n instance using the factory. This ensures consistency across your routing, SEO, and formatting.

```ts
import { createI18n } from '@easy-web/i18n';

export const i18n = createI18n({
  locales: ['de', 'en'] as const,
  defaultLocale: 'de',
  baseUrl: 'https://dev.ismaili.de'
});
```

## Paraglide setup

This library works alongside [Paraglide-JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs).

1. Initialize paraglide in your project.
2. Store your translation files in `messages/{locale}.json` (e.g., `messages/de.json`, `messages/en.json`).
3. Commit the generated paraglide output to git to ensure reliable builds.

## Astro config

Use the factory output to configure Astro's native i18n settings in `astro.config.mjs`:

```ts
import { defineConfig } from 'astro/config';
import { i18n } from './src/lib/i18n'; // path to your factory instance

export default defineConfig({
  i18n: {
    locales: i18n.locales,
    defaultLocale: i18n.defaultLocale,
    routing: {
      prefixDefaultLocale: false
    }
  }
});
```

## Intl formatters

The factory provides type-safe wrappers around standard `Intl` formatters.

```ts
const { format } = i18n;
const locale = 'de';

format.date(locale, new Date());
format.number(locale, 1234.56);
format.currency(locale, 99.99, 'EUR');
format.relativeTime(locale, -1, 'day');
format.list(locale, ['Apfel', 'Birne', 'Banane']);
```

## SEO hreflang

Automatically generate alternate links for your head section.

```astro
---
// BaseLayout.astro
import { i18n } from '../lib/i18n';
const links = i18n.getAlternateLinks(Astro.url.pathname);
---

<head>
  {links.map(link => (
    <link rel="alternate" hreflang={link.hreflang} href={link.href} />
  ))}
  <link rel="canonical" href={i18n.getCanonicalUrl(Astro.url.pathname, Astro.currentLocale)} />
</head>
```

### Routes whose slug differs per locale

By default alternates are derived by re-prefixing the current path, which
assumes the slug is identical in every locale. When it is not — DE
`/datenschutz/` versus EN `/en/privacy/` — that derivation produces
`/en/datenschutz/`, a URL that does not exist. Declare such routes:

```ts
export const i18n = createI18n({
  locales: ['de', 'en'] as const,
  defaultLocale: 'de',
  baseUrl: 'https://dev.ismaili.de',
  localizedPaths: [
    { de: '/datenschutz/', en: '/en/privacy/' },
    { de: '/kontakt/', en: '/en/contact/' },
  ],
});
```

Matching ignores trailing slashes, query strings and hashes. Routes sharing a
slug across locales need no entry. `x-default` points at the default-locale
member of the group, and a locale absent from a group is omitted rather than
guessed.

Pass the same groups to `easyWebSeo()` from `@easy-web/seo` so the sitemap and
the page `<head>` agree — declare them once in a shared module and import it
into both.

### URL form

`getCanonicalUrl` and `getAlternateLinks` emit the URL form the site actually
serves, so the canonical and the self-referencing hreflang always match. The
default is a trailing slash, matching Astro's `directory` build output. Pass
`trailingSlash: 'never'` if the instance uses `build.format: 'file'`:

```ts
export const i18n = createI18n({
  locales: ['de', 'en'] as const,
  defaultLocale: 'de',
  baseUrl: 'https://dev.ismaili.de',
  trailingSlash: 'never',
});
```

Callers may pass `/about` or `/about/` — the emitted URL is identical either way.

## Migration from v0.1

| v0.1 Primitive | v0.3 Factory (Recommended) | v0.3 Primitive |
| :--- | :--- | :--- |
| `localizedHref('/about', 'en')` | `i18n.localizedHref('/about', 'en')` | `localizedHref({path, locale, defaultLocale})` |
| `getLocaleFromPath(pathname)` | `i18n.getLocaleFromPath(pathname)` | `getLocaleFromPath({pathname, locales, defaultLocale})` |

Note: The `SupportedLocale` type is removed. Use the generic `L` inferred from the `createI18n` config.

## SSR caveat

`@easy-web/i18n` does not support SSR features like `Accept-Language` header detection or middleware. It is designed for static-prerender deployments on Azure Static Web Apps.
