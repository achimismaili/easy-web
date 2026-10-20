# Adoption Guide - @easy-web/swa

Use this checklist for the current sidecar-based integration. The old 0.1.x
root-sentinel and per-locale rewrite model is obsolete; do not recreate it.
See the [README](./README.md) for the API, ownership rules and URL-shape behavior.

## Adopt or review an existing installation

1. Supply the site's root 404 page and any explicitly routed localized pages.
   Use `@easy-web/core/components/NotFound` and, if needed,
   `@easy-web/core/schemas/notFound`; `@easy-web/content-blocks` is a deprecated
   compatibility package. Follow the
   [core page/content ownership guidance](https://achim.ismaili.de/easy-web/docs/packages/core/#not-found-page-ownership).
   The SWA integration does not generate pages or CMS collections.

2. For a site hosted on Azure Static Web Apps, install the add-on and register it
   alongside existing integrations. Other hosts do not need this package.

   ```sh
   pnpm add @easy-web/swa
   ```

   ```js
   import { defineConfig } from 'astro/config';
   import easyWebNotFound from '@easy-web/swa';

   export default defineConfig({
     integrations: [easyWebNotFound()],
   });
   ```

   Keep existing site configuration. The old `defaultLocale` and `locales` options
   are accepted for compatibility but do not change the output.

3. Review source `staticwebapp.config.json` and any sibling
   `staticwebapp.config.json.easy-web-managed.json` together. For static sites,
   normally place source files in `public/` so Astro copies them into the output.
   Decide whether the integration or the site owns `responseOverrides.404`:
   an existing, unclaimed override wins; a sidecar claim permits replacement.
   To hand the slot to the integration, remove the source override and rebuild.
   To take it back, supply the desired source override and remove that key's
   sidecar claim if present. Review `trailingSlash` ownership separately.

4. When upgrading from the legacy root-sentinel model, remove `$easyWebManaged`
   from source config. Review and remove obsolete locale-wide 404 rewrites only
   after identifying them; do not delete unrelated routes. The integration strips
   unknown root keys but **does not** remove old routes or infer ownership from
   the legacy sentinel. An existing 404 slot without a sidecar claim stays
   user-owned, even if an old integration originally wrote it.

5. Run the site's build and inspect its actual deployable output directory.
   Confirm `/404.html` exists for the fixed managed target; do not infer localized
   artifact paths from old examples. Check emitted config, sidecar ownership,
   rendered locale-root links and required content completeness using the
   [validation boundaries](./README.md#validation-boundaries).
   The config is reserialized, so compare unrelated values rather than formatting.

6. Separately arrange the operator-owned deployed-target HTTP checks described in
   the README. Successful local builds or artifact smoke tests do not prove live
   missing-route behavior. This checklist does not install tests, change a
   pipeline, deploy a site or provide an existing-site migration command.

## Rollback

Revert the reviewed source adoption changes: the integration registration,
dependency/lockfile edits, and any config, sidecar or page/content changes.
If removing the integration, restore a site-owned fallback appropriate to the
host. Rebuild from those sources and inspect the resulting artifact; merely
editing generated output is not a durable rollback. Live behavior needs a
separate operator check after the reverted artifact is deployed.

## See also

- [README](./README.md) - current integration contract and limitations.
- [CHANGELOG](./CHANGELOG.md) - historical release notes.
