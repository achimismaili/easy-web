# @easy-web/core

## 1.8.0

### Minor Changes

- fd16e96: Add the typed Card headingLevel prop (h1-h6, default h3) for accessible heading hierarchies.
  Keep PageShell's focused skip link above every shared header using the existing layer tokens,
  and retain lightboxes above sticky headers. Derive Open Graph alternate locales from configured
  hreflang links instead of inventing bilingual metadata for single-language sites.

## 1.7.1

### Patch Changes

- 9d6a2f2: Keep Card and BlogPostCard images in responsive 16:9 cover frames by overriding intrinsic HTML heights with scoped height: auto. Preserve image metadata attributes and support local assets, string paths, and legacy image props without requiring a global image reset.

## 1.7.0

### Minor Changes

- 7ffb156: Add opt-in public build information to easyWebSeo with a prerendered /version page and an explicit host-capability opt-in for /version.json, both backed by one immutable, deterministic manifest. Resolve the exact installed core artifact version and verify explicitly enabled auth, cms-adapters and swa artifacts share the fixed-family version. Reject unknown fields and unsafe labels; expose no environment, infrastructure, dependency inventory or default timestamps. Keep generated routes out of sitemaps, publish explicit noindex directives without hiding them behind robots exclusions, and preserve feature-off behavior. The minor release propagates through the existing fixed-family release group.

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

## 1.5.0

## 1.4.1

### Patch Changes

- d7c61cc: Republish @easy-web/core. Its first publish attempt (as part of the 1.4.0 release) failed with ENEEDAUTH because no npm Trusted Publisher existed yet for this brand-new package. The owner has since bootstrap-published a placeholder version and configured the Trusted Publisher (GitHub Actions, achimismaili/easy-web, release.yml); this changeset forces a fresh publish attempt so @easy-web/core reaches npm alongside the rest of the family.

## 1.4.0

### Minor Changes

- bd6320c: Add `@easy-web/core`, the new base package containing theme tokens, i18n helpers, all 28 shared components (plus the new `Media` and `StructuredData` primitives), the SEO integration and `SeoHead`, the markdown remark plugin, and the new content contracts module (base types, capability interfaces, JSON-LD mappers, and the `isPublished`/`assertImplements` helpers).

  `@easy-web/cms-adapters` gains typed Decap field builders, content-type/singleton definitions, `toAstroSchema`, `buildDecapConfig`, and a manual-init `AdminPage` path that loads a generated configuration instead of a hand-written `config.yml`.

  `@easy-web/theme-core`, `@easy-web/i18n`, `@easy-web/content-blocks`, `@easy-web/seo` and `@easy-web/markdown` become deprecated compatibility packages: every export they previously shipped keeps working unchanged, now re-exported from `@easy-web/core`. No existing import path breaks in this release; deprecated APIs point at their `@easy-web/core` replacement. Removal of the compatibility packages is planned for a future 2.0 once every site (including `darts.tv-1927.de`) has migrated.
