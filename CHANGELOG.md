# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] — 2026-05-31

### @itci/easy-web-theme-core

- **BREAKING**: Replaced `theme.light` / `theme.dark` exports with `tokens` object + CSS subpath export.
- Added 4 token systems: color (semantic + 11-stop neutral/primary ramps), typography (fluid `clamp()` scale + system-ui), spacing (13 rem stops), radius (6 sizes).
- Added theme helper: `applyTheme`, `getPreferredTheme`, `subscribeToSystem`.
- Added `noFlashScript` export (IIFE string for inline `<head>` use).
- Added `[data-theme="dark"]` override block and `prefers-color-scheme` media query fallback.
- Added CSS subpath export: `@itci/easy-web-theme-core/tokens.css`.
- Added typed TypeScript token mirror: `tokens` const with all CSS var references.

### @itci/easy-web-i18n

- **BREAKING**: `localizedHref` / `getLocaleFromPath` now take options-object args; `defaultLocale` no longer hardcoded.
- **BREAKING**: Removed `SupportedLocale` type (replaced by generic `L extends string`).
- Added `createI18n<L extends string>` typed factory combining routing, SEO, and formatters.
- Added Intl formatters: `formatDate`, `formatNumber`, `formatRelativeTime`, `formatList`, `formatCurrency` (memoized).
- Added SEO helpers: `getAlternateLinks` (with `x-default`), `getCanonicalUrl`.
- Added peer deps: `@inlang/paraglide-js@^2.0.0`, `astro@>=4.0.0 <7.0.0` (NOT bundled).

### Migration

See package READMEs for v0.1/v0.2 → v0.3 migration tables.

---

## [0.2.1] — 2026-05-30 (placeholder release, no code changes)
## [0.2.0] — 2026-05-30 (placeholder release, no code changes)
## [0.1.1] — see git history
## [0.1.0] — initial release
