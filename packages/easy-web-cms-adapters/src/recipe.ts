import { z } from 'astro/zod';
import {
  contentCompositionSchema,
  type ContentComposition,
} from '@easy-web/core/contracts';
import type { RecipeMetadata } from '@easy-web/core/recipes';
import { buildDecapConfig } from './content/decap-config.js';
import { defineContentType } from './content/define.js';
import { fieldsForTraits } from './content/trait-field-sets.js';

export const CMS_MEDIA_RECIPE_ID = 'cms.decap-media';

const rootSchema = z.string().regex(/^src\/assets\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/);
const cmsMediaRecipeOptionsSchema = z.strictObject({
  composition: contentCompositionSchema,
  backend: z.strictObject({
    repo: z.string().min(1),
    tenantId: z.string().min(1),
    appId: z.string().min(1),
    branch: z.string().min(1).default('main'),
  }),
  mediaRoots: z.array(rootSchema).min(1).max(20).superRefine((roots, context) => {
    const folded = new Set<string>();
    roots.forEach((root, index) => {
      const key = root.toLocaleLowerCase('en-US');
      if (folded.has(key)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: 'Media roots must not case-collide' });
      folded.add(key);
    });
  }).readonly(),
  uiLocale: z.enum(['de', 'en']).default('de'),
});

export type CmsMediaRecipeOptions = z.infer<typeof cmsMediaRecipeOptionsSchema>;

function identifierTraits(traits: readonly string[]): readonly ('title' | 'slug')[] {
  if (traits.includes('title')) return ['title'];
  if (traits.includes('slug')) return ['slug'];
  return ['title'];
}

function runtimeDefinitions(options: CmsMediaRecipeOptions) {
  const mediaFolder = options.mediaRoots[0]!;
  const publicFolder = `/${mediaFolder}`;
  return options.composition.contentTypes.map((contentType) => {
    const traits = contentType.traits.includes('title') || contentType.traits.includes('slug')
      ? contentType.traits
      : [...identifierTraits(contentType.traits), ...contentType.traits];
    return defineContentType({
      name: contentType.id,
      label: contentType.labels[options.uiLocale] ?? Object.values(contentType.labels)[0] ?? contentType.id,
      folder: `src/content/${contentType.id}`,
      format: 'md',
      slug: '{{slug}}',
      locales: options.composition.contentLocales,
      mediaFolder,
      publicFolder,
      fields: fieldsForTraits(traits, { uiLocale: options.uiLocale, mediaFolder, publicFolder }),
    });
  });
}

function definitionsSource(composition: ContentComposition, mediaFolder: string, uiLocale: 'de' | 'en'): string {
  const definitions = composition.contentTypes.map((contentType) => {
    const traits = contentType.traits.includes('title') || contentType.traits.includes('slug')
      ? contentType.traits
      : [...identifierTraits(contentType.traits), ...contentType.traits];
    const label = contentType.labels[uiLocale] ?? Object.values(contentType.labels)[0] ?? contentType.id;
    return `export const ${contentType.id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())} = defineContentType({\n`
      + `  name: ${JSON.stringify(contentType.id)}, label: ${JSON.stringify(label)}, folder: ${JSON.stringify(`src/content/${contentType.id}`)},\n`
      + `  format: 'md', slug: '{{slug}}', locales: contentLocales,\n`
      + `  mediaFolder, publicFolder, fields: fieldsForTraits(${JSON.stringify(traits)}, { uiLocale: ${JSON.stringify(uiLocale)}, mediaFolder, publicFolder }),\n});`;
  });
  return `import { defineContentType, fieldsForTraits } from '@easy-web/cms-adapters';\n\n`
    + `export const contentLocales = ${JSON.stringify(composition.contentLocales)} as const;\n`
    + `export const mediaFolder = ${JSON.stringify(mediaFolder)};\nexport const publicFolder = ${JSON.stringify(`/${mediaFolder}`)};\n\n`
    + `${definitions.join('\n\n')}\n`;
}

function contentConfigSource(composition: ContentComposition): string {
  const imports = composition.contentTypes.map((contentType) => contentType.id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()));
  const entries = composition.contentTypes.map((contentType, index) => {
    const name = imports[index]!;
    return `  ${JSON.stringify(contentType.id)}: defineCollection({ loader: glob({ pattern: '**/*.md', base: ${JSON.stringify(`./src/content/${contentType.id}`)} }), schema: toAstroSchema(${name}) }),`;
  });
  return `import { defineCollection } from 'astro:content';\nimport { glob } from 'astro/loaders';\nimport { toAstroSchema } from '@easy-web/cms-adapters';\nimport { ${imports.join(', ')} } from './content/definitions';\n\nexport const collections = {\n${entries.join('\n')}\n};\n`;
}

const adminHtml = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Content Manager</title><link rel="cms-config-url" href="/admin/config.yml" type="text/yaml"></head><body><script src="https://unpkg.com/decap-cms@3.16.3/dist/decap-cms.js"></script></body></html>\n`;

export const cmsMediaRecipe = {
  id: CMS_MEDIA_RECIPE_ID,
  version: '1.5.0',
  protocolVersion: 1,
  compatibleCliRange: '^0.1.0',
  compatibleRuntimeRange: '^1.5.0',
  provides: ['cms.decap-media', 'content.typed-definitions', 'media.preview-copy'],
  requires: ['site.astro-shell'],
  conflicts: [],
  order: { priority: 30, key: 'cms' },
  optionsSchema: cmsMediaRecipeOptionsSchema,
  outputContributions: [
    { kind: 'dependency', id: 'cms.dependencies', target: 'package.json' },
    { kind: 'content', id: 'cms.definitions', target: 'src/content/definitions.ts' },
    { kind: 'configuration', id: 'cms.schema', target: 'src/content.config.ts' },
    { kind: 'configuration', id: 'cms.decap-config', target: 'public/admin/config.yml' },
    { kind: 'route', id: 'cms.admin', target: 'public/admin/index.html' },
    { kind: 'configuration', id: 'cms.astro-markdown-preview', target: 'astro.config.mjs' },
  ],
  validators: [],
  generate: ({ options }) => {
    const parsed = cmsMediaRecipeOptionsSchema.parse(options);
    const definitions = runtimeDefinitions(parsed);
    const config = buildDecapConfig({
      backend: { name: 'azure', repo: parsed.backend.repo, tenant_id: parsed.backend.tenantId, app_id: parsed.backend.appId, branch: parsed.backend.branch },
      mediaFolder: parsed.mediaRoots[0]!, publicFolder: `/${parsed.mediaRoots[0]!}`, locale: parsed.uiLocale,
      contentTypes: definitions,
    });
    const folders = parsed.mediaRoots.map((source) => ({ source, publicPath: `/${source}` }));
    return { files: [
      { path: 'package.json', content: `${JSON.stringify({ dependencies: { '@easy-web/core': '^1.5.0', '@easy-web/cms-adapters': '^1.5.0', astro: '^7.3.5', sharp: '^0.35.0' } }, null, 2)}\n` },
      { path: 'src/content/definitions.ts', content: definitionsSource(parsed.composition, parsed.mediaRoots[0]!, parsed.uiLocale) },
      { path: 'src/content.config.ts', content: contentConfigSource(parsed.composition) },
      { path: 'public/admin/config.yml', content: `${JSON.stringify(config, null, 2)}\n` },
      { path: 'public/admin/index.html', content: adminHtml },
      { path: 'astro.config.mjs', content: `import { defineConfig } from 'astro/config';\nimport easyWebMarkdown from '@easy-web/core/markdown';\nimport { easyWebCmsPreviewAssets } from '@easy-web/cms-adapters';\n\nexport default defineConfig({ markdown: { remarkPlugins: [easyWebMarkdown] }, integrations: [easyWebCmsPreviewAssets({ folders: ${JSON.stringify(folders)} })] });\n` },
    ] };
  },
} satisfies RecipeMetadata<CmsMediaRecipeOptions>;

export default cmsMediaRecipe;
