import { z } from 'astro/zod';
import { createContentSiteRecipes, generatedContentCompositionSchema } from '@easy-web/core/recipes';
import type { RecipeMetadata } from '@easy-web/core/recipes';
import { buildContentCompositionDecapConfig, cmsSiteOptionsSchema } from './recipe.js';

/** Compose package-owned contributions before generation; never merge or rewrite generated JavaScript. */
export function createCmsContentSiteRecipes(rawComposition: unknown, rawOptions: unknown) {
  const composition = generatedContentCompositionSchema.parse(rawComposition);
  const options = cmsSiteOptionsSchema.parse(rawOptions);
  buildContentCompositionDecapConfig(composition, options);
  const folders = options.mediaRoots.map((source) => ({ source, publicPath: `/${source}` }));
  const contentSite = createContentSiteRecipes(composition, {
    mediaFolder: options.mediaRoots[0],
    shellConfiguration: {
      imports: [
        "import { unified } from '@astrojs/markdown-remark';",
        "import easyWebMarkdown from '@easy-web/core/markdown';",
        "import { easyWebCmsPreviewAssets } from '@easy-web/cms-adapters';",
      ],
      markdownProcessor: 'unified({ remarkPlugins: [easyWebMarkdown] })',
      integrations: [`easyWebCmsPreviewAssets({ folders: ${JSON.stringify(folders)} })`],
    },
  });
  const cms: RecipeMetadata = {
    id: 'cms.decap-editor', version: '1.7.1', protocolVersion: 1,
    compatibleCliRange: '^0.1.0 || ^0.2.0', compatibleRuntimeRange: '^1.7.1',
    provides: ['cms.decap-editor', 'media.preview-copy'],
    requires: ['site.shell', 'content.typed-definitions'], conflicts: [],
    order: { priority: 30, key: 'cms' }, optionsSchema: z.strictObject({}),
    outputContributions: [
      { kind: 'dependency', id: 'cms.editor.dependencies', target: 'package.json' },
      { kind: 'configuration', id: 'cms.editor.options', target: 'src/config/cms.ts' },
      { kind: 'route', id: 'cms.editor.admin', target: '/admin' },
    ],
    validators: [],
    generate: () => ({ files: [
        { path: 'package.json', content: `${JSON.stringify({ dependencies: {
          '@easy-web/cms-adapters': '^1.7.1', '@astrojs/markdown-remark': '^7.3.1', sharp: '^0.35.0',
        } }, null, 2)}\n` },
        { path: 'src/config/cms.ts', content: `export const cmsOptions = ${JSON.stringify(options, null, 2)} as const;\n` },
        { path: 'src/pages/admin.astro', content: `---
import AdminPage from '@easy-web/cms-adapters/components/AdminPage.astro';
import { buildContentCompositionDecapConfig } from '@easy-web/cms-adapters';
import { composition } from '../content/definitions';
import { cmsOptions } from '../config/cms';

const config = buildContentCompositionDecapConfig(composition, cmsOptions);
---
<AdminPage config={config} lang={cmsOptions.uiLocale} />
` },
      ] }),
  };
  return { ...contentSite, cms };
}
