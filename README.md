# easy-web

Baseline `@easy-web/*` package family — shared library for the ismaili.de web ecosystem. All site instances consume these packages via npm.

For full architecture, role boundaries, and how this repo relates to instance repos, see [`websites/docs/repos/easy-web.md`](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/repos/easy-web.md).

Diagrams of the package graph, the release flow, how one change propagates to every site, and the single-source SEO model: [`docs/architecture.md`](docs/architecture.md).

## Packages

| Package | Version | Description |
| :--- | :--- | :--- |
| `@easy-web/theme-core` | `1.1.0` | CSS design tokens, light/dark theme, no-flash script |
| `@easy-web/i18n` | `1.1.0` | `localizedHref`, `getLocaleFromPath`, alternate-link helpers, `localizedPaths` and `trailingSlash` support |
| `@easy-web/content-blocks` | `1.1.0` | Hero, Section, CardGrid, Card, Header, Footer, ThemeToggle; includes the `<NotFound>` component and `notFoundSchema` |
| `@easy-web/auth` | `1.1.0` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@easy-web/brand` | `1.1.0` | Brand asset generation (favicons, icons) plus the `easy-web-brand` CLI |
| `@easy-web/markdown` | `1.1.0` | Remark plugin normalising markdown-body image URLs for Astro's image resolver |
| `@easy-web/seo` | `1.1.0` | `easyWebSeo()` integration (sitemap, hreflang, robots.txt) and `<SeoHead>` |
| `@easy-web/swa` | `1.1.0` | Astro integration for sentinel-safe Azure SWA 404 config |
| `@easy-web/cms-adapters` | `1.1.0` | Admin page mounting, config scaffolding, and frontmatter types for Decap CMS |
| `@easy-web/azure-functions-utils` | `1.1.0` (stub) | Server-side Azure Functions helpers |
| `@easy-web/create` | `1.1.0` (stub) | Scaffold CLI for new site instances (ADR 0003) |

> **Version column** is the published package version. Both active instances consume every package they use at `^1.1.0`. For the per-instance adoption matrix see the [websites meta-repo](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/architecture/package-adoption.md).
>
> The `<NotFound>` component and the `easy-web-swa` integration implement the shared 404 primitive described in [ADR 0013 — Shared NotFound Primitives](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/decisions/0013-shared-not-found-primitives.md).

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | `@easy-web/*` workspace packages |
| `examples/` | Reference instances consuming the packages locally |
| `scripts/` | Workspace-level tooling |
| `docs/` | [`architecture.md`](docs/architecture.md) diagrams plus repo-local notes; canonical docs live in the `websites` meta-repo |
| `.github/workflows/` | CI/CD — build on every push, publish on merged changesets |

## Publishing

Packages are published automatically by CI via GitHub Actions and Changesets. See `AGENTS.md → Publishing packages` for the exact release workflow.

## Related

- **GitHub**: [`github.com/achimismaili/easy-web`](https://github.com/achimismaili/easy-web)
- **Index repo**: [`websites`](https://dev.azure.com/it-ci/websites/_git/websites) — architecture, ADRs, topology
- **First instance**: [`dev.ismaili.de`](https://dev.azure.com/it-ci/websites/_git/dev.ismaili.de) — pilot deployment
