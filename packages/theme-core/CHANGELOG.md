# Changelog

## 1.5.0

### Patch Changes

- @easy-web/core@1.5.0

## 1.4.1

### Patch Changes

- Updated dependencies [d7c61cc]
  - @easy-web/core@1.4.1

## 1.4.0

### Minor Changes

- bd6320c: Add `@easy-web/core`, the new base package containing theme tokens, i18n helpers, all 28 shared components (plus the new `Media` and `StructuredData` primitives), the SEO integration and `SeoHead`, the markdown remark plugin, and the new content contracts module (base types, capability interfaces, JSON-LD mappers, and the `isPublished`/`assertImplements` helpers).

  `@easy-web/cms-adapters` gains typed Decap field builders, content-type/singleton definitions, `toAstroSchema`, `buildDecapConfig`, and a manual-init `AdminPage` path that loads a generated configuration instead of a hand-written `config.yml`.

  `@easy-web/theme-core`, `@easy-web/i18n`, `@easy-web/content-blocks`, `@easy-web/seo` and `@easy-web/markdown` become deprecated compatibility packages: every export they previously shipped keeps working unchanged, now re-exported from `@easy-web/core`. No existing import path breaks in this release; deprecated APIs point at their `@easy-web/core` replacement. Removal of the compatibility packages is planned for a future 2.0 once every site (including `darts.tv-1927.de`) has migrated.

### Patch Changes

- Updated dependencies [bd6320c]
  - @easy-web/core@1.4.0

## 1.3.3

### Patch Changes

- 4f42e39: Fix unreadable links on legal pages in dark mode

  `LegalLayout` styled every element except `a`, so links on `/impressum` and
  `/datenschutz`-style pages fell back to the browser default
  `rgb(0, 0, 238)`. Against a dark surface (`#111827`) that is a 1.89:1
  contrast ratio — under half of the WCAG AA minimum (4.5:1) for normal text.
  - `theme-core`: add `--ew-link` (defaults to `var(--ew-primary)`) and a
    regression test that computes WCAG contrast for the default theme's link
    and body-text colors in both light and dark, so a future edit to either
    token that drops below AA fails CI instead of shipping silently.
  - `content-blocks`: `LegalLayout` now styles `a` the same way `Prose` already
    does; `Prose` itself switches from hardcoding `--ew-primary` to
    `--ew-link` so both components share one token.

  `--ew-link` defaults to an alias of `--ew-primary` rather than a fixed shade
  of a color ramp, because a fixed step (e.g. `-700`) cannot be guaranteed to
  pass AA against an arbitrary instance surface, and most instances only
  override the single `--ew-primary` token rather than the full ramp. Instances
  whose brand primary fails AA on their surface (as Harley's light-mode orange
  does, at 3.38:1) should override `--ew-link` directly with a compliant shade,
  the way `harleyrentflorida.de` now does with its existing `--ew-primary-dark`.

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.3

## 1.2.2

## 1.2.1

## 1.2.0

## 1.1.0

## 1.0.0

## [0.5.0] — 2026-06-25

### Added

- `--ew-accent` semantic color token (default: amber `#f59e0b`, dark: `#fbbf24`). CMS-customizable per instance via `theme.json`.

## [0.4.0] — 2026-06-24

### Added

- **Shadow tokens**: 7-level scale (`--ew-shadow-xs` through `--ew-shadow-2xl`) + `--ew-shadow-inner`. Shadows automatically increase opacity in dark mode via the `--ew-shadow-color` primitive.
- **Motion tokens**: 6 duration steps (`--ew-duration-instant` through `--ew-duration-slower`) + 5 easing curves (`--ew-ease-default`, `--ew-ease-in`, `--ew-ease-out`, `--ew-ease-in-out`, `--ew-ease-spring`). All durations reset to `0ms` under `prefers-reduced-motion: reduce`.
- **Breakpoint constants**: TypeScript `breakpoints` export with 5 Tailwind-compatible pixel values (`sm`/`md`/`lg`/`xl`/`2xl`). CSS reference variables (`--ew-bp-*`) also added.
- **Z-index scale**: 9 semantic layers from `--ew-z-hide` (−1) to `--ew-z-toast` (1500), preventing z-index conflicts across components.
- **Opt-in self-hosted fonts** (`./fonts.css`): `@font-face` for Inter Variable + JetBrains Mono Variable, with `--ew-font-sans` / `--ew-font-mono` variable overrides. Zero cost for sites that do not import this file.
- TypeScript: new `tokens.shadow`, `tokens.motion`, `tokens.zIndex` categories.
- New `breakpoints` constant and `Breakpoint` type exported from package root.
- New CSS export: `@itci/easy-web-theme-core/fonts.css`.
