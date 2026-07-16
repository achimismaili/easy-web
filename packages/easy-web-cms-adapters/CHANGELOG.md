# Changelog — @itci/easy-web-cms-adapters

## 1.0.0

### Major Changes

- 28cdb72: Declare astro peer range as >=6.0.0 <8.0.0 to match easy-web-i18n precedent.

## [0.1.0] — 2026-06-16

### Added

- `AdminPage` Astro component: standalone HTML shell loading Decap CMS from CDN (`unpkg.com/decap-cms@3.14.0`). No site layout, no MSAL — isolated to prevent OAuth hash fragment conflicts.
- Frontmatter TypeScript types: `BlogFrontmatter`, `PageFrontmatter`, `SiteConfig` (and `NavItem`, `FooterColumn`, `SocialLink`) for type-safe content collections.
- Config scaffold utility: `generateDecapConfigString()` (returns YAML string) and `generateDecapConfig()` (writes file, refuses overwrite) with `DecapConfigOptions`.
- Config template: `src/scaffold/config-template.yml` — reference template for Azure DevOps backend with per-locale blog, pages, and site-config collections.
