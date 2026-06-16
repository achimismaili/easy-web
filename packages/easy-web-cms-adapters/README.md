# @itci/easy-web-cms-adapters

Decap CMS integration package for the [easy-web](https://dev.azure.com/IT-CI/WebSites/_git/easy-web) ecosystem.

## What's included

- **`AdminPage` Astro component** — standalone HTML page loading Decap CMS from CDN (`unpkg.com/decap-cms@3.14.0`). No site layout, no MSAL.
- **Frontmatter TypeScript types** — `BlogFrontmatter`, `PageFrontmatter`, `SiteConfig` for type-safe Astro content collections.
- **Config scaffold utility** — `generateDecapConfigString()` and `generateDecapConfig()` to generate Decap `config.yml` for any instance.

## Usage

See `docs/entra-cms-setup.md` in your instance repo for Entra ID app registration guidance.

```ts
import AdminPage from '@itci/easy-web-cms-adapters/components/AdminPage.astro';
import type { BlogFrontmatter } from '@itci/easy-web-cms-adapters';
import { generateDecapConfig } from '@itci/easy-web-cms-adapters';
```

## Consumed by

- `dev.ismaili.de` — pilot instance

## Architecture

Part of the `@itci/easy-web-*` package family. See [ADR 0006](https://dev.azure.com/IT-CI/WebSites/_git/WebSites?path=/docs/decisions/0006-cms-agnostic-adapter-pattern.md) for the design rationale.
