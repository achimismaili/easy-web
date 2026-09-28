---
"@easy-web/cms-adapters": patch
"@easy-web/content-blocks": patch
"@easy-web/seo": patch
---

Guard the documented component import forms with export-resolution smoke tests

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
