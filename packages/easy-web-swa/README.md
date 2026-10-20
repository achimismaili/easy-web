# @easy-web/swa

Astro integration that manages Azure Static Web Apps (SWA) 404 handling via a sentinel-marked sidecar file. Ensures the integration's configuration changes are preserved across rebuilds while respecting user-authored settings.

## What it does

When you add `easyWebNotFound()` to your Astro config, the integration:

1. **Reads** the existing `staticwebapp.config.json` at build time (if present)
2. **Emits** a global 404 response override (`responseOverrides.404`) that rewrites unmatched routes to `/404.html`
3. **Derives** `trailingSlash` from your Astro config, unless user-owned, to align with the canonical URLs `@easy-web/core/seo` emits
4. **Tracks ownership** via a sidecar file (`staticwebapp.config.json.easy-web-managed.json`) so future builds know which settings the integration manages
5. **Preserves values** of unrelated schema-legal settings, including `auth`, `globalHeaders`, `navigationFallback`, custom routes, and other `responseOverrides`, while reserializing the config

It does **not** create 404 pages or localized routes. The site supplies the
`/404.html` artifact and owns its layout and content; the host-independent
[`NotFound` component and artifact checks](https://achim.ismaili.de/easy-web/docs/packages/core/#not-found-page-ownership)
live in `@easy-web/core`. SWA is optional, not a requirement for core consumers.

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
  "keys": ["responseOverrides.404", "trailingSlash"],
  "version": "1.2.0",
  "docs": "https://github.com/achimismaili/easy-web/blob/main/packages/easy-web-swa/README.md"
}
```

At `astro:build:done`, the integration reads the config and sidecar from Astro's
reported output directory, then writes both there. For a static build, source
config normally reaches that directory via Astro's `public/` copy. A config left
only at the repository root is not read by this integration. If ownership metadata
must survive a clean build, it must also reach the output directory (for example,
via a reviewed sidecar in `public/`); an old output file is not a durable source of
ownership.

If the sidecar claims `responseOverrides.404`, that slot is refreshed. If the slot
exists without a sidecar claim, the user's override wins with a warning and remains
unclaimed. If it is absent, the integration creates and claims it. The same
ownership rule applies to `trailingSlash`, subject to the derivation below.
Sidecar `version` is a bookkeeping marker, not the installed package version.
Do not put the old `$easyWebManaged` metadata key in the SWA config root.

### Single global 404 limitation

Azure Static Web Apps supports only **one global 404 response override**. This integration emits a single, locale-agnostic 404 handler. If your site uses i18n:

- When the managed override handles a missing route, it serves `/404.html`,
  regardless of locale prefix. Make that artifact the site's default-locale body.
- Explicitly authored localized 404 pages can still render localized content, but
  the global fallback does not select them by the missing URL's locale.
- Adding locales does not generate routes, pages or additional overrides.

Do not add greedy `/<locale>/*` rewrites to imitate localized fallbacks: they can
shadow valid pages. Existing routes and `navigationFallback` are preserved, not
repaired; they may intercept requests before this 404 override is used.

### Trailing slash

The integration derives an explicit `trailingSlash` from your Astro config - the same config that drives canonical, hreflang and sitemap URLs emitted by `@easy-web/core/seo`. A user-owned SWA value still wins and must be reviewed for consistency.

| Astro config | Emitted `trailingSlash` | SWA behaviour |
| :--- | :--- | :--- |
| `trailingSlash: 'always'` / `'never'` | used as-is | explicit intent outranks the output shape |
| `build.format: 'directory'` (default) | `always` | `/about` -> 301 -> `/about/` |
| `build.format: 'file'` | `never` | `/about/` -> 301 -> `/about` |
| `build.format: 'preserve'` | *unmanaged* | emits both shapes, so no single rule is correct |

To choose the other form, set it once in `astro.config.mjs`:

```ts
export default defineConfig({
  trailingSlash: 'never',
});
```

The canonical tag, hreflang alternates, sitemap `<loc>` entries and the SWA redirect all follow that one value.

Setting `trailingSlash` yourself in `staticwebapp.config.json` still wins, with a warning. Remove it to hand control back to the integration.

## Preservation guarantees

The not-found managed surface is **only `responseOverrides.404`**:

```json
{
  "responseOverrides": {
    "404": { "rewrite": "/404.html", "statusCode": 404 }
  }
}
```

The integration also manages `trailingSlash` as described above; it emits no
locale-wide rewrite routes. Unrelated schema-legal root values and other response
overrides survive the merge, but preservation is **value-based, not byte-for-byte**:
the whole JSON file is rewritten with two-space indentation and a trailing newline.
Unknown root keys, including the legacy `$easyWebManaged` key, are omitted with a
warning. This filtering is not full SWA schema validation.

Malformed JSON, non-object documents, malformed sidecar metadata and a non-object
`responseOverrides` fail the build. Review source configuration and ownership
together; changing a managed output slot alone will be undone when its sidecar
claim is present. See the [adoption checklist](./MIGRATION.md) for ownership changes.

## Validation boundaries

Package merge tests exercise config/sidecar ownership and serialization; they do
not prove a consuming site's 404 page exists or that a deployed host uses it.
Alongside the [core artifact checks](https://achim.ismaili.de/easy-web/docs/packages/core/#validate-artifacts-separately-from-hosting),
inspect the site's emitted `staticwebapp.config.json` and sibling sidecar:

- If integration-owned, verify `responseOverrides.404` is exactly the managed
  rewrite/status above and `/404.html` exists in the deployable artifact.
- Verify sidecar claims match the intended ownership, no metadata root key or
  unintended locale-wide rewrite was introduced, and unrelated values remain.
- Review retained routes, `navigationFallback`, and trailing-slash behavior for
  conflicts. Preserving their values does not certify their routing or auth behavior.

After deployment, the site operator should request a unique nonexistent URL on
the actual target, including locale-prefixed paths, and check HTTP 404 plus the
expected global fallback body and home link. Request valid pages too, to catch
overbroad rewrites. This is a separate operator-owned check, not something the
integration, `astro preview`, or this guide runs automatically. No SWA CLI or
browser harness is required for filesystem/HTML artifact checks; local simulation
alone cannot establish deployed-platform behavior.

## Compatibility

- **Astro:** `>=6.0.0 <8.0.0`
- **Node.js:** `>=18.0.0`
