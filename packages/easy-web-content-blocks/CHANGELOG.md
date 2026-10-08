# @itci/easy-web-content-blocks

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

- Updated dependencies [4f42e39]
  - @easy-web/theme-core@1.3.3
  - @easy-web/i18n@1.3.3

## 1.3.2

### Patch Changes

- da56f4d: Guard the documented component import forms with export-resolution smoke tests

  Issue #17 shipped because nothing in this repo ever resolved an import
  specifier. The `exports` maps were read by humans and by consumers, never by a
  test, so `@easy-web/cms-adapters/components/AdminPage.astro` could resolve to
  `AdminPage.astro.astro` and fail with `ERR_PACKAGE_PATH_NOT_EXPORTED` while
  every gate stayed green.

  Each of the three packages that declares subpath component or schema exports
  now carries an `exports-resolution.test.ts`. It reads the package's own
  `package.json`, expands every wildcard key against the real files on disk, and
  resolves the resulting specifiers through Node's actual package-exports
  algorithm via `createRequire(<that package.json>).resolve()`. Nothing is
  mocked and no specifier is hardcoded, so the probe list grows on its own as
  components and schemas are added.

  Coverage is per package:
  - **cms-adapters** — all three declared spellings of `AdminPage`
    (`./components/AdminPage`, `./components/AdminPage.astro`,
    `./src/components/AdminPage.astro`) must resolve to one and the same file.
  - **content-blocks** — every `.astro` component through both the extensionless
    and the `.astro`-suffixed form, plus every `./schemas/*` entry.
  - **seo** — `SeoHead` through both forms it declares.

  `@easy-web/cms-adapters` had no test script at all and now runs `vitest run`
  like its siblings, so the root `pnpm test` covers it.

  Verified as a real regression gate rather than a tautology: with the
  `"./components/*.astro"` keys from the #17 fix removed again, all three suites
  fail with `Cannot find module '…/<Component>.astro.astro'`, and restoring the
  keys turns them green.

  Tests only — no runtime, type, or `exports` surface changed.
  - @easy-web/i18n@1.3.2
  - @easy-web/theme-core@1.3.2

## 1.3.1

### Patch Changes

- a0a82f5: Let component imports carry the `.astro` extension, as the READMEs already document

  Each of these three packages exposes its Astro components through a single
  wildcard export, `"./components/*": "./src/components/*.astro"`. The target
  appends the extension to whatever the wildcard captured, so the extension has
  to be absent from the specifier. Write it the way the READMEs show —
  `@easy-web/cms-adapters/components/AdminPage.astro` or
  `@easy-web/seo/components/SeoHead.astro` — and the capture is
  `AdminPage.astro`, the resolved target becomes
  `./src/components/AdminPage.astro.astro`, and the import fails with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`.

  The documented form and the working form had drifted apart, and only the
  undocumented one resolved.

  Each package now also declares `"./components/*.astro"` pointing at the same
  target, so the extension-bearing specifier captures the bare component name
  and resolves to the same file. Node prefers the longer trailer when two
  patterns share a prefix, so `.astro` specifiers select the new key and
  everything else keeps selecting the old one.

  This is purely additive. The extensionless form is untouched and still
  resolves exactly as before, so no consumer has to change an import — both
  spellings now reach the same component, and sites can adopt the documented
  one whenever it suits them.

  Fixes #17
  - @easy-web/i18n@1.3.1
  - @easy-web/theme-core@1.3.1

## 1.3.0

### Minor Changes

- 08cb136: Ship a `<PageShell>` landmark scaffold, make the crawl policy reach the page, and let single-locale sites drop the language switch

  **`<PageShell>` (new, content-blocks)** — a layout that renders
  `<Header /> <slot /> <Footer />` produces a document with no `<main>`
  landmark and no way to bypass the navigation, failing WCAG 2.1 SC 2.4.1
  "Bypass Blocks" (Level A) on every route whose content does not open with
  a heading. axe-core reports this via its `bypass` rule, which carries
  `reviewOnFail` — so it surfaces as _incomplete_, not a violation, and a
  gate asserting `violations.length === 0` stays green while the failure
  ships. `PageShell` owns the skip link, the `<main>` landmark, and the DOM
  order between them, because the skip link must precede the header to be
  the first focusable element — which a caller cannot arrange if it renders
  the header itself.

  **Crawl policy now reaches the document (seo)** — `easyWebSeo()` resolves
  the policy once and publishes it to `EASY_WEB_SEO_NO_INDEX`, which
  `robots.txt` generation consumed but `<SeoHead>` did not: its `noIndex`
  prop defaulted to `false`. The result was an integration and a document
  disagreeing about the same policy — sitemap suppressed and robots.txt
  disallowing everything, while every page still shipped without a robots
  meta tag. `<SeoHead>` now defaults the prop from the published policy.
  An explicit prop still wins, so a single page can opt out of a site-wide
  setting, and 404 routes remain unconditionally noindexed.

  **Optional `locales` prop on all four header variants (content-blocks)** —
  the language switch rendered unconditionally, so a single-locale site
  shipped a control that navigates to a route it does not build. Pass the
  locales the site actually serves and the switch is omitted when there is
  only one. Omitting the prop keeps the previous behaviour, so existing
  consumers are unaffected.

### Patch Changes

- 914872c: Make header `navId` stable so consuming builds are reproducible

  All four header variants (`Header`, `HeaderCentered`, `HeaderFlyout`,
  `HeaderHideOnScroll`) derived their nav element's DOM id from
  `Math.random()`. The id is only used to pair the menu button's
  `aria-controls` with the `<nav>`'s `id` — the component's own script
  resolves both by class, scoped to the header element, so nothing reads
  the id from JS. The randomness therefore bought nothing and made every
  consuming site's build output differ byte-for-byte between two
  consecutive runs, defeating build reproducibility checks and producing
  noisy diffs in any pipeline that compares build artefacts.

  Each variant now uses a stable default id (`ew-header-nav`,
  `ew-header-centered-nav`, `ew-header-flyout-nav`, `ew-header-hos-nav`)
  and accepts an optional `navId` prop to override it — needed only when
  rendering more than one of the same header variant on a single page.
  The per-variant prefixes mean different variants cannot collide even
  when rendered together.

  Verified against the in-repo showcase app: two consecutive builds
  produced 12 of 12 HTML files byte-identical after the change, versus
  12 of 12 differing before it.
  - @easy-web/i18n@1.3.0
  - @easy-web/theme-core@1.3.0

## 1.2.3

### Patch Changes

- @easy-web/i18n@1.2.3
- @easy-web/theme-core@1.2.3

## 1.2.2

### Patch Changes

- 9e5463b: Point language-switch links at the served URL form

  `LanguageSwitch` derived the alternate href with its own hardcoded rule and
  ignored `trailingSlash` entirely, so on a site configured `trailingSlash: 'never'`
  every language switch pointed at `/en/` while the site serves `/en`. In
  production Azure SWA redirects that, costing a `301` on every switch; under
  `astro preview` it is a plain `404`.

  The component now renders the href in the form the site actually serves, which
  also normalises any `alternateHref` a page passes in — so pages declaring
  `alternateHref="/en/privacy/"` no longer need editing.

  `ambientTrailingSlash()` is exported from `@easy-web/i18n` for this: components
  run outside the Astro integration and cannot read `astro.config.mjs`, so they
  read the form `@easy-web/seo` resolved at config time. `createI18n` now uses the
  same helper instead of its own copy.

- Updated dependencies [9e5463b]
  - @easy-web/i18n@1.2.2
  - @easy-web/theme-core@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [b96f19f]
  - @easy-web/i18n@1.2.1
  - @easy-web/theme-core@1.2.1

## 1.2.0

### Patch Changes

- @easy-web/i18n@1.2.0
- @easy-web/theme-core@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [cb8ab71]
  - @easy-web/i18n@1.1.0
  - @easy-web/theme-core@1.1.0

## 1.1.0

### Minor Changes

- 17632de: Add NotFound component + notFoundSchema for shared brand-conform 404 pages.

## 1.0.0

### Major Changes

- 82a0036: Declare astro peer range as >=6.0.0 <8.0.0 to match easy-web-i18n precedent.

### Minor Changes

- 0e16226: Add UniversalMedia dispatch tests and README documentation.

### Patch Changes

- @achimismaili/easy-web-theme-core@1.0.0

## 0.6.1

### Patch Changes

- 084ab66: Align `ThemeToggle` and `LanguageSwitch` to a shared header-control height (2.25rem / 36px) so the two utility controls form a consistent row inside the header actions area.
  - `ThemeToggle` becomes an explicit 36×36 square icon button (removes padding, adds `width`/`height`, sets `box-sizing: border-box`).
  - `LanguageSwitch` gains an explicit height of 36px, keeps `min-width: 2.5rem`, and switches to horizontal-only padding — vertical size is now driven by `height`, so its aspect ratio reads as "nearly square" next to the toggle instead of landscape.
  - Both use `box-sizing: border-box` for predictable sizing regardless of any downstream site's global reset.
  - No visual behaviour, no API change, no class-name change — this is a self-contained CSS-only refinement.

## 0.2.0

### Features

- `CtaSection` component — standalone call-to-action banner with three variants (`default`, `muted`, `primary`)
- `ContactSection` component — centered mailto-only contact CTA
- `Gallery` component — pure CSS grid image gallery, responsive 3 → 2 → 1 columns, no JavaScript, no lightbox

### Peer dependencies

- Bumped Astro peer dependency to `>= 6.0.0`

## 0.1.0

### Features

- Header component with responsive navigation and mobile hamburger menu
- ThemeToggle component for light/dark mode switching
- LanguageSwitch component for locale switching with alternate href support
- Footer component with copyright and legal links
- Hero component with centered/left-aligned variants and optional CTA
- Section component for content wrapping
- CardGrid component with responsive CSS grid
- Card component with optional image and link
- LegalLayout component for narrow legal content pages
- DraftBanner component for draft content notices
- LanguageNotice component for translation binding notices
- Prose component for styled Markdown/HTML content
- BlogPostCard component for blog listing cards
