# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] — shared NotFound + SWA 404 integration

This release introduces a shared 404 primitive across the easy-web ecosystem. All site instances using Azure Static Web Apps can now delegate their 404 handling to a single, well-tested set of building blocks rather than duplicating config and components per instance.

See [ADR 0013 — Shared NotFound Primitives](https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md) for the full design rationale.

### @achimismaili/easy-web-content-blocks (1.0.0 → 1.1.0)

- New export: `<NotFound>` — an Astro component rendering a localised 404 page (heading, body copy, back-home CTA). Accepts `lang`, `title`, `body`, and `homePath` props; falls back to sensible English defaults.
- New export: `notFoundSchema` — a Zod schema and TypeScript type for the 404 content collection entry. Instances declare a `notFound` collection and let Decap CMS edit the copy at runtime.
- Both exports are additive and backward compatible; no existing imports break.

### @achimismaili/easy-web-swa (new package, 0.1.0) — superseded by 0.2.0

- New package: `@achimismaili/easy-web-swa` — an Astro integration that generates a sentinel-safe `staticwebapp.config.json` at build time.
- The integration rewrites the SWA navigation fallback to point at the site's own 404 route instead of serving a bare Azure SWA error page.
- Sentinel-safe: if a `staticwebapp.config.json` already exists in `public/`, the integration merges only the `navigationFallback` block instead of overwriting the entire file.
- Usage: add `easywWebSwa()` to `astro.config.ts` integrations array; no further config needed for the standard case.

> ⚠️ **Do not adopt 0.1.0.** Its root-level `$easyWebManaged` sentinel is rejected by the Azure SWA schema, which causes the *entire* config — including `auth` and `globalHeaders` — to be discarded at runtime. Use `0.2.0` or later.

### @achimismaili/easy-web-swa (0.1.0 → 0.2.0)

Defect-remediation release. Both changes are consumer-visible in the emitted build output.

- **BREAKING** — the sentinel moved off the config root into a **sidecar file**, `staticwebapp.config.json.easy-web-managed.json`. The SWA schema sets `additionalProperties: false` at the root and whitelists 11 keys, so 0.1.0's `$easyWebManaged` root key made the SWA CLI reject and **discard the whole config** (dropping `auth`, `globalHeaders`, `navigationFallback` and every route). The emitted `staticwebapp.config.json` now contains only schema-legal root keys. Rebuilding with 0.2.0 strips the legacy root sentinel automatically — no source change required in consuming instances.
- **BREAKING** — the greedy per-locale `/{locale}/*` rewrite routes are gone; the integration is now **`responseOverrides.404`-centric** and emits no routes at all. Azure evaluates routes first-match-wins, so a `/{locale}/*` catch-all shadows every real page in that locale when it sits ahead of the instance's own routes — it 404'd an entire English customer site during adoption. *Accepted limitation:* SWA supports exactly one global 404 override, so unmatched localized paths serve the **default-locale** 404 body; per-locale 404 content is out of scope.
- **Fixed** — a user-owned `responseOverrides.404` preserved on build *N* was clobbered on build *N+1*. Ownership is now driven by the sidecar's declared `keys`; an absent sidecar or empty `keys` list leaves an existing 404 user-owned.
- **Fixed** — config and sidecar reads are validated and report the failing path on parse error; unchecked `as` casts removed.
- **Removed** — the unused `@achimismaili/easy-web-i18n` peer dependency (never imported by the integration). `astro` remains the only peer dep.
- **Docs** — README rewritten for the real 0.2.0 behaviour; the stale "package skeleton / safe no-op" claim is gone.

See [ADR 0013 — Shared NotFound Primitives](https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md) for the sidecar decision and the single-global-404 rationale.

---

## [0.6.0] — 2026-06-22

### @itci/easy-web-content-blocks

- Added optional `logo?: string` prop to all 4 header components (`Header`, `HeaderCentered`, `HeaderHideOnScroll`, `HeaderFlyout`). When provided, renders an `<img>` in the brand area instead of site name text. Backward compatible.
- Added visual separator (border-left) between nav links and actions area on desktop. Removed on mobile (border-top already present).

---

## [0.5.0] — 2026-06-20

### @itci/easy-web-content-blocks

- Added `actions` named slot to `Header.astro` (backward compatible — fallback renders `ThemeToggle` + `LanguageSwitch`). Mobile toggle JS refactored to scoped `initHeader(el)` pattern; safe for multi-header pages. `data-testid="header-classic"` added.
- New component: `HeaderCentered.astro` — brand centered, nav links split left/right. Same props + slot + scoped JS.
- New component: `HeaderHideOnScroll.astro` — `position: fixed` header that hides on scroll-down and reappears on scroll-up (`translateY`). Body padding offset applied via JS.
- New component: `HeaderFlyout.astro` — nav items with `children[]` show flyout dropdown panels (hover/focus desktop, click mobile, full keyboard accessibility with `aria-expanded`/`aria-haspopup`).

### @itci/easy-web-cms-adapters

- `NavItem` interface extended with optional `children?: NavItem[]` (recursive, backward compatible).

---

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
