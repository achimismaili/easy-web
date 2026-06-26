# easy-web

Baseline `@achimismaili/easy-web-*` package family — shared library for the ismaili.de web ecosystem. All site instances consume these packages via npm.

For full architecture, role boundaries, and how this repo relates to instance repos, see [`WebSites/docs/repos/easy-web.md`](https://github.com/achimismaili/easy-web/blob/main/docs/repos/easy-web.md).

## Packages

| Package | Version | Description |
| :--- | :--- | :--- |
| `@achimismaili/easy-web-theme-core` | `^0.3.x` | CSS design tokens, light/dark theme, no-flash script |
| `@achimismaili/easy-web-i18n` | `^0.3.x` | `localizedHref`, `getLocaleFromPath`, alternate-link helpers |
| `@achimismaili/easy-web-content-blocks` | `^0.2.x` | Hero, Section, CardGrid, Card, Header, Footer, ThemeToggle |
| `@achimismaili/easy-web-auth` | `^0.1.x` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@achimismaili/easy-web-cms-adapters` | `^0.1.x` | Admin page mounting, config scaffolding, and frontmatter types for Decap CMS |
| `@achimismaili/easy-web-azure-functions-utils` | stub | Server-side Azure Functions helpers |
| `@achimismaili/create-easy-web` | stub | Scaffold CLI for new site instances (ADR 0003) |

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | `@achimismaili/easy-web-*` workspace packages |
| `examples/` | Reference instances consuming the packages locally |
| `scripts/` | Workspace-level tooling |
| `docs/` | Repo-local notes; canonical docs live in `WebSites/docs/` |
| `.github/workflows/` | CI/CD — build on every push, publish on merged changesets |

## Publishing

Packages are published automatically by CI via GitHub Actions and Changesets. See `AGENTS.md → Publishing packages` for the exact release workflow.

## Related

- **GitHub**: [`github.com/achimismaili/easy-web`](https://github.com/achimismaili/easy-web)
- **Index repo**: [`WebSites`](https://github.com/achimismaili/websites) — architecture, ADRs, topology
- **First instance**: [`dev.ismaili.de`](https://github.com/achimismaili/dev.ismaili.de) — pilot deployment
