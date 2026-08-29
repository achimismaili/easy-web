# @easy-web/swa

Astro integration that manages Azure Static Web Apps (SWA) 404 handling via a sentinel-marked sidecar file. Ensures the integration's configuration changes are preserved across rebuilds while respecting user-authored settings.

## What it does

When you add `easyWebNotFound()` to your Astro config, the integration:

1. **Reads** the existing `staticwebapp.config.json` at build time (if present)
2. **Emits** a global 404 response override (`responseOverrides.404`) that rewrites unmatched routes to `/404.html`
3. **Tracks ownership** via a sidecar file (`staticwebapp.config.json.easy-web-managed.json`) so future builds know which settings the integration manages
4. **Preserves** all user-authored settings: `auth`, `globalHeaders`, `navigationFallback`, custom routes, and any other `responseOverrides` the user defined

## Usage

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import easyWebNotFound from '@easy-web/swa';

export default defineConfig({
  integrations: [
    easyWebNotFound(),
  ],
});
```

The integration requires no configuration. The `Options` type (with optional `defaultLocale` and `locales` fields) is retained for API compatibility but has no effect in v0.2.0+.

## How it works

### The sidecar file

SWA's `staticwebapp.config.json` schema uses `additionalProperties: false` at the root, which means the config file cannot store metadata about which keys are managed by which tool. To solve this, the integration maintains a sibling file:

```json
// staticwebapp.config.json.easy-web-managed.json
{
  "keys": ["responseOverrides.404"],
  "version": "0.2.0",
  "docs": "https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md"
}
```

On the next build, the integration reads this sidecar to determine which keys it previously claimed. If the sidecar says it owns `responseOverrides.404`, the integration updates it; otherwise, it leaves the user's 404 override untouched.

### Single global 404 limitation

Azure Static Web Apps supports only **one global 404 response override**. This integration emits a single, locale-agnostic 404 handler. If your site uses i18n:

- Unmatched routes in any locale will serve the **default-locale 404 body** (from `/404.html`)
- Per-locale 404 content is **not supported** by this integration
- If you need locale-specific 404 pages, you must implement them outside this integration (e.g., via Astro routing or a custom SWA configuration)

See [ADR 0013 — Shared Not-Found Primitives](https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md) for the full rationale.

## Preservation guarantees

The integration **only manages** `responseOverrides.404`. All other settings are preserved exactly as you authored them:

- ✅ `auth` — untouched
- ✅ `globalHeaders` — untouched
- ✅ `navigationFallback` — untouched
- ✅ `routes` — untouched
- ✅ Other `responseOverrides` — untouched
- ✅ All other root keys — untouched

If you define your own `responseOverrides.404` before the integration runs, the integration will detect this and skip managing the 404 override, logging a warning instead.

## Compatibility

- **Astro:** `>=6.0.0 <8.0.0`
- **Node.js:** `>=18.0.0`
