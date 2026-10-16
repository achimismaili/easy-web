# easy-web

[![CI](https://github.com/achimismaili/easy-web/actions/workflows/ci.yml/badge.svg)](https://github.com/achimismaili/easy-web/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@easy-web/content-blocks?label=%40easy-web%2F%2A)](https://www.npmjs.com/package/@easy-web/content-blocks)
[![License: MIT](https://img.shields.io/github/license/achimismaili/easy-web)](LICENSE)

Baseline `@easy-web/*` package family — a shared Astro component and integration library for building multilingual, themeable, statically-hosted sites. Every site instance consumes these packages from public npm.

- **Showcase** (live component gallery): [achim.ismaili.de/easy-web](https://achim.ismaili.de/easy-web/)
- **Documentation**: [achim.ismaili.de/easy-web/docs](https://achim.ismaili.de/easy-web/docs/)
- **Technology map** — which technologies each package uses, which Node.js and Astro versions are recommended or supported, and how each one is validated: [achim.ismaili.de/easy-web/docs/architecture/technology-map](https://achim.ismaili.de/easy-web/docs/architecture/technology-map/)
- **Architecture** — package graph, release flow, how one change propagates to every site, and the single-source SEO model: [`docs/architecture.md`](docs/architecture.md)
- **Design system** — the `--ew-*` tokens and the component contract: [`DESIGN.md`](DESIGN.md)

## Packages

All packages except `@easy-web/cli` are released together as a fixed version group, so their version numbers always match. The npm badge above shows the current release for that group. The CLI is versioned on its own.

Install `@easy-web/core` for a working site. Everything else is opt-in.

**Base**

| Package | Description |
| :--- | :--- |
| `@easy-web/core` | Theme tokens, i18n, SEO integration, markdown plugin, 31 Astro components (page chrome, sections, cards, galleries, media, `<NotFound>`, `<SeoHead>`) and the content contracts (`Item`, `Article`, `Event`, `HasImage`, `assertImplements`, ...). Subpaths: `/contracts`, `/theme`, `/i18n`, `/seo`, `/markdown`, `/components/*`, `/schemas/*`, `/styles/*`. |

**Add-ons**

| Package | Description |
| :--- | :--- |
| `@easy-web/cms-adapters` | Decap CMS: typed content definitions (`field`, `fieldSets`, `defineContentType`) that generate both the Decap form and the Astro schema, plus the standalone `AdminPage` |
| `@easy-web/swa` | Astro integration for sentinel-safe Azure Static Web Apps 404 config |
| `@easy-web/auth` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@easy-web/brand` | Brand asset generation (favicons, icons) plus the `easy-web-brand` CLI |

**Tooling**

| Package | Description |
| :--- | :--- |
| `@easy-web/cli` | Config-driven, create-only site generator: `easy-web create --config`. Needs Node.js 24 or later. Not part of the fixed version group |

**Reserved**

| Package | Description |
| :--- | :--- |
| `@easy-web/create` | **Reserved placeholder** for a future `pnpm create` entry point. Ships no source; don't add it as a dependency. To generate a site today, use `@easy-web/cli` |

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

## Requirements

| Tier | Node.js | pnpm | Astro |
| :--- | :--- | :--- | :--- |
| Recommended for new work | 24 | 10 | 7 |
| Supported consumer floor | 22 | not prescribed | 6 |

New sites, and everything in this repository, start on Node.js 24, pnpm 10 and Astro 7. Node.js 22 with Astro 6 stays supported for existing sites, for the packages that the compatibility lane in [`ci.yml`](.github/workflows/ci.yml) builds on that pairing. Node.js is a build-time requirement: easy-web sites are static output, so Node.js builds a site but is not needed to serve it. `@easy-web/cli` is the exception and needs Node.js 24 or later, because it only runs on the machine that generates a site. The [technology map](https://achim.ismaili.de/easy-web/docs/architecture/technology-map/) lists the lane that validates each package.

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | The `@easy-web/*` workspace packages |
| `apps/showcase/` | Live component gallery — the reference consumer; redeployed whenever `packages/` or `apps/` change on `main` |
| `apps/contract-fixture/` | Test site proving the per-site conformance gate fails on broken contracts |
| `apps/compat-fixture/` | Test site proving the deprecated compatibility packages still build |
| `apps/docs/` | Documentation site, deployed alongside the showcase under `/docs/` |
| `DESIGN.md` | Design-system contract: the `--ew-*` tokens, components, states and accessibility constraints |
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

Package publication and website deployment are separate. The deploy workflow builds this repository's showcase and docs for GitHub Pages; it does not publish npm packages. Pilot and customer sites keep their own lockfiles and Azure pipelines, so a published version changes no deployed site until that repository accepts a dependency update, validates it and deploys its own artifact. Rollout is pilot-first.

## License

MIT — see [`LICENSE`](LICENSE).
