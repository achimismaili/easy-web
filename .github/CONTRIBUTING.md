# Contributing to easy-web

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository: `git clone https://github.com/achimismaili/easy-web.git`
2. Install dependencies: `pnpm install`
3. Build all packages: `pnpm build`
4. Run tests: `pnpm test`

## Making Changes

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes
4. **Create a changeset**: `pnpm changeset`
   - Select the packages you changed
   - Describe the change (patch/minor/major)
   - This creates a file in `.changeset/` — commit it with your changes
5. Ensure tests pass: `pnpm test`
6. Ensure build passes: `pnpm build`
7. Open a Pull Request

## Changeset Workflow

This project uses [Changesets](https://github.com/changesets/changesets) for version management.
Every PR that changes a publishable package MUST include a changeset file.

Run `pnpm changeset` to create one interactively.

## Package Structure

| Directory | Package | Purpose |
|-----------|---------|---------|
| `packages/theme-core/` | `@easy-web/theme-core` | CSS design tokens, light/dark theme |
| `packages/i18n/` | `@easy-web/i18n` | i18n helpers for Astro sites |
| `packages/easy-web-content-blocks/` | `@easy-web/content-blocks` | Astro UI components |
| `packages/auth/` | `@easy-web/auth` | MSAL.js auth integration |
| `packages/easy-web-brand/` | `@easy-web/brand` | Brand asset generation and the `easy-web-brand` CLI |
| `packages/easy-web-markdown/` | `@easy-web/markdown` | Remark plugin for markdown-body image URLs |
| `packages/seo/` | `@easy-web/seo` | Sitemap, hreflang, robots.txt and `<SeoHead>` |
| `packages/easy-web-swa/` | `@easy-web/swa` | Azure Static Web Apps 404 config integration |
| `packages/easy-web-cms-adapters/` | `@easy-web/cms-adapters` | Decap CMS integration |
| `packages/create-easy-web/` | `@easy-web/create` | Scaffold CLI for new instances (stub) |
| `packages/easy-web-azure-functions-utils/` | `@easy-web/azure-functions-utils` | Server-side Azure Functions helpers (stub) |

Directory names do not always match package names — check the table before `cd`-ing into a package.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](.github/CODE_OF_CONDUCT.md).
