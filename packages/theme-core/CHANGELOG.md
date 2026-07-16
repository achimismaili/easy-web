# Changelog

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
