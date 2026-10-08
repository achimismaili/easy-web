# @easy-web/seo (deprecated)

This package is a compatibility layer. The SEO integration, crawl policy, `robots.txt` route and `<SeoHead>` component now live in [`@easy-web/core`](../core/README.md). Every export keeps working and re-exports the core implementation unchanged, but new code should import from `@easy-web/core`.

| Old import | New import |
| :--- | :--- |
| `import easyWebSeo from '@easy-web/seo'` | `import easyWebSeo from '@easy-web/core/seo'` |
| `import { createCrawlPolicy, isDisallowedPath, type CrawlPolicy, type Options, type LocalizedPathGroup } from '@easy-web/seo'` | `import { ... } from '@easy-web/core/seo'` |
| `import SeoHead from '@easy-web/seo/components/SeoHead'` | `import SeoHead from '@easy-web/core/components/SeoHead'` |
| `import SeoHead from '@easy-web/seo/components/SeoHead.astro'` | `import SeoHead from '@easy-web/core/components/SeoHead.astro'` |

The `robots.txt` route is injected from `@easy-web/core`, so this package no longer ships `src/routes`.
