# Changelog — @itci/easy-web-cms-adapters

## 1.9.1

### Patch Changes

- c730c4a: Correct generated dependency minima to match emitted runtime APIs: content sites
  require core 1.6.0 for trait schemas, and content-plus-CMS sites require core and
  CMS adapters 1.9.0 for the composition helper and coupled core APIs. Keep the
  shell-only range unchanged and require 1.6.0 for the standalone CMS media recipe's
  fieldsForTraits import, and declare the markdown processor needed by its Astro 7
  configuration. Adopt the corrected
  recipe owners in the CLI and cover generated sites with packed-CLI, published
  minimum-runtime consumer checks without weakening release-age policy.
- Updated dependencies [c730c4a]
  - @easy-web/core@1.9.1

## 1.9.0

### Minor Changes

- 3f659ac: Connect CMS-independent content composition to deterministic site generation. Generate typed collections, example content, contract adapters, list/detail routes, navigation and SEO for a single content locale, rejecting unsupported traits and bindings explicitly. Keep logical graph contributions separate from generated file paths.

  Generated shells include their own Astro typecheck configuration and shared SEO head, with robots output owned solely by the SEO integration. Extend first-party recipe compatibility to the CLI 0.2 line; application-auth mounting remains deferred.

  Add opt-in CMS editor generation from the same top-level composition, exposing only cms-admin-bound collections. Keep core as the sole schema and Astro-config owner while composing the existing AdminPage, markdown source-image handling and explicit media preview mappings. Reject missing bindings, duplicated composition and overlapping media roots before generation. Preserve the standalone CMS recipe API.

### Patch Changes

- Updated dependencies [3f659ac]
  - @easy-web/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [fd16e96]
  - @easy-web/core@1.8.0

## 1.7.1

### Patch Changes

- 9d6a2f2: Resolve AdminPage's shared admin-content helpers from the published dist directory so packed consumers build successfully on Astro 6 and 7.
- Updated dependencies [9d6a2f2]
  - @easy-web/core@1.7.1

## 1.7.0

### Minor Changes

- b3929b2: Add a typed, single-language admin-page singleton for editor notices and footer links, with localized German and English starter content, constrained notice levels, and safe public-link validation. Add an opt-in standalone AdminPage shell that mounts Decap in a dedicated scrolling region between the notice and footer while preserving existing rendering when the new content is not supplied.

### Patch Changes

- Updated dependencies [7ffb156]
  - @easy-web/core@1.7.0

## 1.6.0

### Minor Changes

- 91878a0: Add the building blocks for generating a complete site with `easy-web create`. All changes are additive, existing exports are unchanged.

  `@easy-web/core` now ships a capability recipe system. A recipe describes what a feature needs and what it provides, and a deterministic resolver turns a set of requested capabilities into an ordered graph. The graph can be exported as stable JSON or as a Mermaid diagram, so the same input always yields the same output. The new entry points are `@easy-web/core/recipes`, `@easy-web/core/recipes/schema` and `@easy-web/core/recipes/registry`.

  Core also gains:
  - Create-time localization and formatting contracts in `@easy-web/core/i18n`, covering locale parsing, format contexts and explicit date, number and currency formatters.
  - Generic content traits and presentation bindings, so a content type can be composed from reusable traits and bound to a visual block.
  - Demo content and legal page generators in `@easy-web/core/demo`.
  - A `site.shell` recipe that generates the Astro and package configuration, base layout, header, footer, navigation, fixed pages, localized paths, 404 page, SEO setup, Static Web Apps config, theme and brand files, and robots and sitemap output. Generated sites target Astro 7 and include the pnpm 11 build-script allowance they need.

  `@easy-web/auth` adds an `auth.single-island` recipe (`@easy-web/auth/recipe`). It generates a Microsoft sign-in mount that lives in exactly one React island, and checks that rule before output is written.

  `@easy-web/cms-adapters` adds a `cms.decap-media` recipe. It generates typed content definitions, the Decap configuration and admin page, and paired source and public media folders with bounded preview copies.

### Patch Changes

- Updated dependencies [91878a0]
  - @easy-web/core@1.6.0

## 1.5.0

### Minor Changes

- f61fc69: Add the opt-in `easyWebCmsPreviewAssets()` Astro integration for secure local source-image previews and bounded production preview renditions at Decap's literal `/src/assets/...` paths.

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
