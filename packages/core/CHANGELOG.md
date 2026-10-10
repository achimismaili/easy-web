# @easy-web/core

## 1.5.0

## 1.4.1

### Patch Changes

- d7c61cc: Republish @easy-web/core. Its first publish attempt (as part of the 1.4.0 release) failed with ENEEDAUTH because no npm Trusted Publisher existed yet for this brand-new package. The owner has since bootstrap-published a placeholder version and configured the Trusted Publisher (GitHub Actions, achimismaili/easy-web, release.yml); this changeset forces a fresh publish attempt so @easy-web/core reaches npm alongside the rest of the family.

## 1.4.0

### Minor Changes

- bd6320c: Add `@easy-web/core`, the new base package containing theme tokens, i18n helpers, all 28 shared components (plus the new `Media` and `StructuredData` primitives), the SEO integration and `SeoHead`, the markdown remark plugin, and the new content contracts module (base types, capability interfaces, JSON-LD mappers, and the `isPublished`/`assertImplements` helpers).

  `@easy-web/cms-adapters` gains typed Decap field builders, content-type/singleton definitions, `toAstroSchema`, `buildDecapConfig`, and a manual-init `AdminPage` path that loads a generated configuration instead of a hand-written `config.yml`.

  `@easy-web/theme-core`, `@easy-web/i18n`, `@easy-web/content-blocks`, `@easy-web/seo` and `@easy-web/markdown` become deprecated compatibility packages: every export they previously shipped keeps working unchanged, now re-exported from `@easy-web/core`. No existing import path breaks in this release; deprecated APIs point at their `@easy-web/core` replacement. Removal of the compatibility packages is planned for a future 2.0 once every site (including `darts.tv-1927.de`) has migrated.
