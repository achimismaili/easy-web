# easy-web

Baseline `@itci/easy-web-*` package family — shared library for the ismaili.de web ecosystem. All site instances consume these packages via the `websites` Azure Artifacts feed.

For full architecture, role boundaries, and how this repo relates to instance repos, see [`WebSites/docs/repos/easy-web.md`](https://dev.azure.com/IT-CI/WebSites/_git/WebSites?path=/docs/repos/easy-web.md).

## Packages

| Package | Version | Description |
| :--- | :--- | :--- |
| `@itci/easy-web-theme-core` | `^0.3.x` | CSS design tokens, light/dark theme, no-flash script |
| `@itci/easy-web-i18n` | `^0.3.x` | `localizedHref`, `getLocaleFromPath`, alternate-link helpers |
| `@itci/easy-web-content-blocks` | `^0.2.x` | Hero, Section, CardGrid, Card, Header, Footer, ThemeToggle |
| `@itci/easy-web-auth` | `^0.1.x` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@itci/easy-web-cms-adapters` | stub | CMS adapter contract (ADR 0006) |
| `@itci/easy-web-azure-functions-utils` | stub | Server-side Azure Functions helpers |
| `@itci/create-easy-web` | stub | Scaffold CLI for new site instances (ADR 0003) |

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | `@itci/easy-web-*` workspace packages |
| `examples/` | Reference instances consuming the packages locally |
| `scripts/` | Workspace-level tooling |
| `docs/` | Repo-local notes; canonical docs live in `WebSites/docs/` |
| `azure-pipelines.yml` | CI/CD — build on every push, publish on `v*` tags or `chore(release):` commits |

## Publishing

Packages are published automatically by CI via `azure-pipelines.yml`. See `AGENTS.md → Publishing packages` for the exact release workflow.

## Related

- **Index repo**: [`WebSites`](https://dev.azure.com/IT-CI/WebSites/_git/WebSites) — architecture, ADRs, topology
- **First instance**: [`dev.ismaili.de`](https://dev.azure.com/IT-CI/WebSites/_git/dev.ismaili.de) — pilot deployment
- **Customer instance**: [`harleyrentflorida.de`](https://dev.azure.com/IT-CI/WebSites/_git/harleyrentflorida.de) — Harley-Davidson rental site
