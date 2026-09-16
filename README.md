# easy-web

Baseline `@easy-web/*` package family — a shared Astro component and integration library for building multilingual, themeable, statically-hosted sites. Every site instance consumes these packages from public npm.

- **Showcase** (live component gallery): [achim.ismaili.de/easy-web](https://achim.ismaili.de/easy-web/)
- **Documentation**: [achim.ismaili.de/easy-web/docs](https://achim.ismaili.de/easy-web/docs/)
- **Architecture** — package graph, release flow, how one change propagates to every site, and the single-source SEO model: [`docs/architecture.md`](docs/architecture.md)

## Packages

All packages are released together as a fixed version group, so their version numbers always match.

| Package | Version | Description |
| :--- | :--- | :--- |
| `@easy-web/theme-core` | `1.2.3` | CSS design tokens, light/dark theme, no-flash script |
| `@easy-web/i18n` | `1.2.3` | `localizedHref`, `getLocaleFromPath`, alternate-link helpers, `localizedPaths` and `trailingSlash` support |
| `@easy-web/content-blocks` | `1.2.3` | Page chrome (`PageShell`, header variants, footer, theme toggle, language switch), hero/CTA/contact sections, cards and grids, a CMS-driven gallery system, plus `<NotFound>` and `notFoundSchema` |
| `@easy-web/auth` | `1.2.3` | MSAL.js auth, Microsoft Graph, SharePoint components |
| `@easy-web/brand` | `1.2.3` | Brand asset generation (favicons, icons) plus the `easy-web-brand` CLI |
| `@easy-web/markdown` | `1.2.3` | Remark plugin normalising markdown-body image URLs for Astro's image resolver |
| `@easy-web/seo` | `1.2.3` | `easyWebSeo()` integration (sitemap, hreflang, robots.txt) and `<SeoHead>` |
| `@easy-web/swa` | `1.2.3` | Astro integration for sentinel-safe Azure Static Web Apps 404 config |
| `@easy-web/cms-adapters` | `1.2.3` | Admin page mounting, config scaffolding, and frontmatter types for Decap CMS |
| `@easy-web/azure-functions-utils` | `1.2.3` | **Reserved placeholder** — no implementation yet |
| `@easy-web/create` | `1.2.3` | **Reserved placeholder** — future scaffold CLI for new site instances |

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
