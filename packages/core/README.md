# @easy-web/core

The base package for the `@easy-web/*` family. It owns the shared content contracts and, as the consolidation continues, the reusable components, theme, internationalization, SEO, and markdown primitives used by easy-web sites.

## Subpaths

- `@easy-web/core/contracts` - content and capability contracts
- `@easy-web/core/theme` - theme helpers and tokens
- `@easy-web/core/i18n` - localization helpers
- `@easy-web/core/seo` - SEO integration and components
- `@easy-web/core/markdown` - markdown processing helpers
- `@easy-web/core/components/*` - Astro components
- `@easy-web/core/schemas/*` - content schemas
- `@easy-web/core/styles/tokens.css` and `@easy-web/core/styles/fonts.css` - shared styles

## Add-ons

Four concerns remain separate because they depend on a specific platform or runtime: `@easy-web/swa` for Azure Static Web Apps, the `cms-adapters` package for Decap CMS, `@easy-web/auth` for React and MSAL authentication, and `@easy-web/brand` for brand tooling.

This package is private while the consolidation is in progress and is made publishable only by the family release task.
