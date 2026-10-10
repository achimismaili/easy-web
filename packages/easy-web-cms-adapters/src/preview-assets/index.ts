import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { createPreviewMiddleware } from './dev-middleware.js';
import { emitPreviewAssets } from './emitter.js';
import type { CmsPreviewAssetOptions } from './types.js';
import { validateMappings } from './validation.js';

export type { CmsPreviewAssetFolder, CmsPreviewAssetOptions } from './types.js';

class CmsPreviewAssetHookOrderError extends Error {
  readonly name = 'CmsPreviewAssetHookOrderError';

  constructor(readonly hookName: string) {
    super(`[easy-web-cms-preview-assets] ${hookName} ran before astro:config:setup initialized config.root`);
  }
}

export function easyWebCmsPreviewAssets(options: CmsPreviewAssetOptions): AstroIntegration {
  validateMappings(path.parse(fileURLToPath(import.meta.url)).root, options.folders);
  let state: { readonly root: string; readonly mappings: ReturnType<typeof validateMappings> } | undefined;
  const requireState = (hookName: string) => {
    if (!state) throw new CmsPreviewAssetHookOrderError(hookName);
    return state;
  };
  return {
    name: '@easy-web/cms-adapters/preview-assets',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const root = path.resolve(fileURLToPath(config.root));
        state = { root, mappings: validateMappings(root, options.folders) };
      },
      'astro:server:setup': ({ server }) => {
        const { root, mappings } = requireState('astro:server:setup');
        server.middlewares.use(createPreviewMiddleware(root, mappings));
      },
      'astro:build:done': async ({ dir, logger }) => {
        const { mappings } = requireState('astro:build:done');
        await emitPreviewAssets(path.resolve(fileURLToPath(dir)), mappings, logger);
      },
    },
  };
}
