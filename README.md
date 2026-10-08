# easy-web

[![CI](https://github.com/achimismaili/easy-web/actions/workflows/ci.yml/badge.svg)](https://github.com/achimismaili/easy-web/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@easy-web/content-blocks?label=%40easy-web%2F%2A)](https://www.npmjs.com/package/@easy-web/content-blocks)
[![License: MIT](https://img.shields.io/github/license/achimismaili/easy-web)](LICENSE)

Baseline `@easy-web/*` package family — a shared Astro component and integration library for building multilingual, themeable, statically-hosted sites. Every site instance consumes these packages from public npm.

- **Showcase** (live component gallery): [achim.ismaili.de/easy-web](https://achim.ismaili.de/easy-web/)
- **Documentation**: [achim.ismaili.de/easy-web/docs](https://achim.ismaili.de/easy-web/docs/)
- **Architecture** — package graph, release flow, how one change propagates to every site, and the single-source SEO model: [`docs/architecture.md`](docs/architecture.md)

## Packages

All packages are released together as a fixed version group, so their version numbers always match. The npm badge above shows the current release for all of them.

Install `@easy-web/core` for a working site. Everything else is opt-in.

**Base**

| Package | Description |
| :--- | :--- |
| `@easy-web/core` | Theme tokens, i18n, SEO integration, markdown plugin, 31 Astro components (page chrome, sections, cards, galleries, media, `<NotFound>`, `<SeoHead>`) and the content contracts (`Item`, `Article`, `Event`, `HasImage`, `assertImplements`, ...). Subpaths: `/contracts`, `/theme`, `/i18n`, `/seo`, `/markdown`, `/components/*`, `/schemas/*`, `/styles/*`. **Reserved on npm, pending its first publish** |

**Add-ons**

| Package | Description |
| :--- | :--- |
| `@easy-web/cms-adapters` | Decap CMS: typed content definitions (`field`, `fieldSets`, `defineContentType`) that generate both the Decap form and the Astro schema, plus the standalone `AdminPage` |
| `@easy-web/swa` | Astro integration for sentinel-safe Azure Static Web Apps 404 config |
| `@easy-web/auth` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@easy-web/brand` | Brand asset generation (favicons, icons) plus the `easy-web-brand` CLI |

**Reserved**

| Package | Description |
| :--- | :--- |
| `@easy-web/create` | **Reserved placeholder** for the future scaffold CLI. Ships no source; don't add it as a dependency |

**Deprecated compatibility packages**

These five were folded into `@easy-web/core`. Each one now only re-exports core with `@deprecated` markers, so existing imports keep working for the whole 1.x line. They're removed in 2.0, once every site has migrated. See the [migration guide](https://achim.ismaili.de/easy-web/docs/guides/migrating-to-core/).

| Package | Replacement |
| :--- | :--- |
| `@easy-web/theme-core` | `@easy-web/core/theme`, `@easy-web/core/styles/tokens.css` |
| `@easy-web/i18n` | `@easy-web/core/i18n` |
| `@easy-web/content-blocks` | `@easy-web/core/components/*`, `@easy-web/core/schemas/*` |
| `@easy-web/seo` | `@easy-web/core/seo`, `@easy-web/core/components/SeoHead` |
| `@easy-web/markdown` | `@easy-web/core/markdown` |

Several site instances consume these packages: a pilot that validates every release first, and the customer sites. New releases land on the pilot before any customer site is bumped.

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | The `@easy-web/*` workspace packages |
| `apps/showcase/` | Live component gallery — the reference consumer; redeployed whenever `packages/` or `apps/` change on `main` |
| `apps/contract-fixture/` | Test site proving the per-site conformance gate fails on broken contracts |
| `apps/compat-fixture/` | Test site proving the deprecated compatibility packages still build |
| `apps/docs/` | Documentation site, deployed alongside the showcase under `/docs/` |
| `docs/` | Repo-local architecture notes and diagrams |
| `.changeset/` | Pending release notes; each one drives the next version bump |
| `.github/workflows/` | CI (build and test on every push), Release (changesets), Deploy (GitHub Pages) |

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first, and [`AGENTS.md`](AGENTS.md) for repo orientation and the publishing workflow.

Every user-visible change needs a changeset:

```bash
pnpm changeset
```

## Publishing

Publishing is fully automated. Pushing to `main` with pending changesets opens a `chore: version packages` pull request; merging that pull request publishes the whole fixed version group to npm via GitHub Actions and npm Trusted Publishing (OIDC). No manual `npm publish`, and no npm token in CI.

## License

MIT — see [`LICENSE`](LICENSE).
