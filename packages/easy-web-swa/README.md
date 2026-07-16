# @achimismaili/easy-web-swa

AstroIntegration that merges a sentinel-marked `staticwebapp.config.json` slice for shared 404 handling on Azure Static Web Apps.

> **Status:** `0.1.0` is a package skeleton. The `easyWebNotFound()` export is a safe no-op that logs its intent; the actual merge logic ships in a follow-up release.

## Usage (preview)

```ts
// astro.config.mjs
import easyWebNotFound from '@achimismaili/easy-web-swa';

export default defineConfig({
  integrations: [
    easyWebNotFound(),
  ],
});
```
