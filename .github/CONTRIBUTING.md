# Contributing to easy-web

Thank you for your interest in contributing!

## Development Setup

Use **Node.js 24** and **pnpm 10**. Volta and `packageManager` in the root `package.json` select them for you. The packed consumer lane proves Node.js 22 with Astro 6 for core, CMS adapters and the compatibility packages; it does not make that claim for every add-on. See the [root contributing guide](../CONTRIBUTING.md) for the toolchain and validation boundaries.

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

The [root contributing guide](../CONTRIBUTING.md#package-versions-dependencies-and-releases)
defines the fixed family, independent CLI, dependency strategy and the distinction
between a version PR, verified npm publication and site adoption. Repository-only
documentation changes that alter no published package do not need a changeset.

## Package Structure

| Directory | Package | Purpose |
|-----------|---------|---------|
| `packages/core/` | `@easy-web/core` | Base: theme tokens, i18n, SEO, markdown, Astro components and content contracts |
| `packages/easy-web-cms-adapters/` | `@easy-web/cms-adapters` | Add-on: Decap CMS integration |
| `packages/easy-web-swa/` | `@easy-web/swa` | Add-on: Azure Static Web Apps 404 config integration |
| `packages/auth/` | `@easy-web/auth` | Add-on: MSAL.js auth integration |
| `packages/easy-web-brand/` | `@easy-web/brand` | Add-on: brand asset generation and the `easy-web-brand` CLI |
| `packages/easy-web-cli/` | `@easy-web/cli` | Tooling: create-only site generator (Node.js 24 or later, versioned on its own) |
| `packages/create-easy-web/` | `@easy-web/create` | Reserved name, ships no source |
| `packages/theme-core/` | `@easy-web/theme-core` | Deprecated: re-exports `@easy-web/core/theme` |
| `packages/i18n/` | `@easy-web/i18n` | Deprecated: re-exports `@easy-web/core/i18n` |
| `packages/easy-web-content-blocks/` | `@easy-web/content-blocks` | Deprecated: re-exports core components and schemas |
| `packages/seo/` | `@easy-web/seo` | Deprecated: re-exports `@easy-web/core/seo` |
| `packages/easy-web-markdown/` | `@easy-web/markdown` | Deprecated: re-exports `@easy-web/core/markdown` |

Directory names do not always match package names — check the table before `cd`-ing into a package. The [technology map](https://achim.ismaili.de/easy-web/docs/architecture/technology-map/) lists the technologies and the validation lane of every package.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](.github/CODE_OF_CONDUCT.md).
