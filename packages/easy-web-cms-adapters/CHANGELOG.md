# Changelog — @itci/easy-web-cms-adapters

## 1.4.0

### Minor Changes

- bd6320c: Add `@easy-web/core`, the new base package containing theme tokens, i18n helpers, all 28 shared components (plus the new `Media` and `StructuredData` primitives), the SEO integration and `SeoHead`, the markdown remark plugin, and the new content contracts module (base types, capability interfaces, JSON-LD mappers, and the `isPublished`/`assertImplements` helpers).

  `@easy-web/cms-adapters` gains typed Decap field builders, content-type/singleton definitions, `toAstroSchema`, `buildDecapConfig`, and a manual-init `AdminPage` path that loads a generated configuration instead of a hand-written `config.yml`.

  `@easy-web/theme-core`, `@easy-web/i18n`, `@easy-web/content-blocks`, `@easy-web/seo` and `@easy-web/markdown` become deprecated compatibility packages: every export they previously shipped keeps working unchanged, now re-exported from `@easy-web/core`. No existing import path breaks in this release; deprecated APIs point at their `@easy-web/core` replacement. Removal of the compatibility packages is planned for a future 2.0 once every site (including `darts.tv-1927.de`) has migrated.

### Patch Changes

- Updated dependencies [bd6320c]
  - @easy-web/core@1.4.0

## 1.3.3

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

## 1.3.0

## 1.2.3

## 1.2.2

## 1.2.1

## 1.2.0

## 1.1.0

## 1.0.0

### Major Changes

- 28cdb72: Declare astro peer range as >=6.0.0 <8.0.0 to match easy-web-i18n precedent.

## [0.1.0] — 2026-06-16

### Added

- `AdminPage` Astro component: standalone HTML shell loading Decap CMS from CDN (`unpkg.com/decap-cms@3.14.0`). No site layout, no MSAL — isolated to prevent OAuth hash fragment conflicts.
- Frontmatter TypeScript types: `BlogFrontmatter`, `PageFrontmatter`, `SiteConfig` (and `NavItem`, `FooterColumn`, `SocialLink`) for type-safe content collections.
- Config scaffold utility: `generateDecapConfigString()` (returns YAML string) and `generateDecapConfig()` (writes file, refuses overwrite) with `DecapConfigOptions`.
- Config template: `src/scaffold/config-template.yml` — reference template for Azure DevOps backend with per-locale blog, pages, and site-config collections.
