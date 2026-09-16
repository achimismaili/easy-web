# easy-web

[![CI](https://github.com/achimismaili/easy-web/actions/workflows/ci.yml/badge.svg)](https://github.com/achimismaili/easy-web/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@easy-web/content-blocks?label=%40easy-web%2F%2A)](https://www.npmjs.com/package/@easy-web/content-blocks)
[![License: MIT](https://img.shields.io/github/license/achimismaili/easy-web)](LICENSE)

Baseline `@easy-web/*` package family — a shared Astro component and integration library for building multilingual, themeable, statically-hosted sites. Every site instance consumes these packages from public npm.

- **Showcase** (live component gallery): [achim.ismaili.de/easy-web](https://achim.ismaili.de/easy-web/)
- **Documentation**: [achim.ismaili.de/easy-web/docs](https://achim.ismaili.de/easy-web/docs/)
- **Architecture** — package graph, release flow, how one change propagates to every site, and the single-source SEO model: [`docs/architecture.md`](docs/architecture.md)

## Packages

All packages are released together as a fixed version group, so their version numbers always match — the npm badge above shows the current release for all of them.

| Package | Description |
| :--- | :--- |
| `@easy-web/theme-core` | CSS design tokens, light/dark theme, no-flash script |
| `@easy-web/i18n` | `localizedHref`, `getLocaleFromPath`, alternate-link helpers, `localizedPaths` and `trailingSlash` support |
| `@easy-web/content-blocks` | Page chrome (`PageShell`, header variants, footer, theme toggle, language switch), hero/CTA/contact sections, cards and grids, a CMS-driven gallery system, plus `<NotFound>` and `notFoundSchema` |
| `@easy-web/auth` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@easy-web/brand` | Brand asset generation (favicons, icons) plus the `easy-web-brand` CLI |
| `@easy-web/markdown` | Remark plugin normalising markdown-body image URLs for Astro's image resolver |
| `@easy-web/seo` | `easyWebSeo()` integration (sitemap, hreflang, robots.txt) and `<SeoHead>` |
| `@easy-web/swa` | Astro integration for sentinel-safe Azure Static Web Apps 404 config |
| `@easy-web/cms-adapters` | Admin page mounting, config scaffolding, and frontmatter types for Decap CMS |
| `@easy-web/azure-functions-utils` | **Reserved placeholder** — no implementation yet |
| `@easy-web/create` | **Reserved placeholder** — future scaffold CLI for new site instances |

> The two placeholders are published to reserve the names. They ship no source; do not add them as dependencies.

Three site instances currently consume these packages: a pilot that validates every release first, and two customer sites. New releases land on the pilot before any customer site is bumped.

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | The `@easy-web/*` workspace packages |
| `apps/showcase/` | Live component gallery — the reference consumer; redeployed whenever `packages/` or `apps/` change on `main` |
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
