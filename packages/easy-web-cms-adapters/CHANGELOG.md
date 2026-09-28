# Changelog — @itci/easy-web-cms-adapters

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
