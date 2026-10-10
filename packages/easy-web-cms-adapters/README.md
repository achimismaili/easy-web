# @easy-web/cms-adapters

Decap CMS integration package for the [easy-web](https://github.com/achimismaili/easy-web) ecosystem. It provides typed content definitions, Decap config generation, the standalone admin page, and an opt-in Astro integration for previewing source assets.

## What's included

- **`AdminPage` Astro component** — standalone HTML page with no site layout or MSAL. Generated-config mode defaults to Decap CMS 3.16.3; legacy no-config mode remains on 3.14.0.
- **Typed content definitions** — one model generates the Decap form, Astro schema, and TypeScript data type.
- **`easyWebCmsPreviewAssets()`** — serves source images in development and emits bounded CMS preview renditions in production.
- **Legacy frontmatter types and config scaffold utilities** — retained for 1.x compatibility.

## Usage

## Source-asset previews

Definitions with `mediaFolder: 'src/assets/...'` and `publicFolder: '/src/assets/...'` intentionally produce Astro `ImageMetadata`. Frontend pages therefore keep optimized `/_astro/...` URLs. Decap, however, requests `public_folder` literally. Enable explicit source-to-public mappings when editors need those previews:

```ts
import { defineConfig } from 'astro/config';
import { easyWebCmsPreviewAssets } from '@easy-web/cms-adapters';

export default defineConfig({
  integrations: [
    easyWebCmsPreviewAssets({
      folders: [
        { source: 'src/assets/galleries', publicPath: '/src/assets/galleries' },
      ],
    }),
  ],
});
```

Party200 maps both `src/assets/images` and `src/assets/galleries`; Harley maps its one `src/assets/images` folder. The pilot stores editor images under `public/images`, so it does not need this integration.

During local development, owned paths serve contained original browser images with `no-store` and `nosniff` headers. Production builds emit renditions at the same `/src/assets/...` paths: raster images are auto-oriented, fitted inside 1600x1600 without enlargement, and retain their extension; SVG and GIF files pass through unchanged. Inputs over 25 MiB, outputs over 5 MiB, videos (including MOV), unknown formats, malformed images, symlink escapes, and collisions are skipped or rejected as appropriate. Source and public suffixes must match exactly, and overlapping ownership is forbidden.

Install `sharp@^0.35.0` in consumers that enable the integration. Sharp is an optional peer and is loaded only when the integration emits a build. No raw source tree is mirrored.

## Other usage

See the documentation site and `docs/entra-cms-setup.md` in your instance repo for content definitions and Entra ID app registration guidance.

```ts
import AdminPage from '@easy-web/cms-adapters/components/AdminPage.astro';
import type { BlogFrontmatter } from '@easy-web/cms-adapters';
import { generateDecapConfig } from '@easy-web/cms-adapters';
```

## Architecture

Part of the `@easy-web/*` package family. See [ADR 0006](https://github.com/achimismaili/websites/blob/main/docs/decisions/0006-cms-agnostic-adapter-pattern.md) for the design rationale.
