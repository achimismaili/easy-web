import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { createPreviewMiddleware } from './dev-middleware.js';
import { emitPreviewAssets } from './emitter.js';
import type { CmsPreviewAssetOptions } from './types.js';
import { validateMappings } from './validation.js';

export type { CmsPreviewAssetFolder, CmsPreviewAssetOptions } from './types.js';

export function easyWebCmsPreviewAssets(options: CmsPreviewAssetOptions): AstroIntegration {
  const root = process.cwd();
  const mappings = validateMappings(root, options.folders);
  return {
    name: '@easy-web/cms-adapters/preview-assets',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(createPreviewMiddleware(root, mappings));
      },
      'astro:build:done': async ({ dir, logger }) => {
        await emitPreviewAssets(path.resolve(fileURLToPath(dir)), mappings, logger);
      },
    },
  };
}
