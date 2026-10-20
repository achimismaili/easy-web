import { describe, expect, it } from 'vitest';
import { resolveCapabilityGraph, shellRecipe } from '@easy-web/core/recipes';
import { contentCompositionSchema } from '@easy-web/core/contracts';
import { createCmsContentSiteRecipes, buildContentCompositionDecapConfig, cmsSiteOptionsSchema } from '../index.js';

const composition = contentCompositionSchema.parse({
  contentLocales: ['en'],
  contentTypes: [{
    id: 'entries', primary: true, labels: { en: 'Entries' }, routes: { en: '/entries/' },
    traits: ['title', 'slug', 'summary', 'image', 'body'],
    bindings: ['list', 'detail', 'navigation', 'cms-admin'],
  }, {
    id: 'notes', labels: { en: 'Notes' }, routes: { en: '/notes/' },
    traits: ['title', 'slug', 'body'], bindings: ['list', 'detail'],
  }],
});
const options = cmsSiteOptionsSchema.parse({
  backend: { repo: 'org/project/repo', tenantId: 'TENANT', appId: 'APP' },
  mediaRoots: ['src/assets/editor/images', 'src/assets/uploads'], uiLocale: 'en',
});

describe('CMS content-site recipes', () => {
  it('requires the first composition-helper release for both directly used packages', async () => {
    const { cms } = createCmsContentSiteRecipes(composition, options);
    const output = await cms.generate({ options: {}, capabilities: [], contributions: [] });
    const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));
    expect(manifest.dependencies['@easy-web/core']).toBe('^1.9.0');
    expect(manifest.dependencies['@easy-web/cms-adapters']).toBe('^1.9.0');
    expect(cms.compatibleRuntimeRange).toBe(manifest.dependencies['@easy-web/cms-adapters']);
  });

  it('has exactly one schema/config owner and declares its dependency on typed definitions', async () => {
    const recipes = createCmsContentSiteRecipes(composition, options);
    expect(resolveCapabilityGraph(Object.values(recipes)).ok).toBe(true);
    expect(resolveCapabilityGraph([recipes.shell, recipes.cms]).ok).toBe(false);
    expect(Object.values(recipes).filter(({ provides }) => provides.includes('content.typed-definitions'))).toEqual([recipes.content]);
    const claims = Object.values(recipes).flatMap(({ outputContributions }) => outputContributions);
    for (const target of ['astro.config.mjs', 'src/content.config.ts', 'src/content/definitions.ts']) {
      expect(claims.filter((claim) => claim.target === target)).toHaveLength(1);
    }
    const shell = await recipes.shell.generate({ options: shellRecipe.optionsSchema.parse({ noIndex: true }), capabilities: [], contributions: [] });
    const config = shell.files.find(({ path }) => path === 'astro.config.mjs')?.content;
    expect(config).toContain('easyWebSeo({ noIndex: true })');
    expect(config).toContain('easyWebCmsPreviewAssets');
    expect(config).toContain('remarkPlugins: [easyWebMarkdown]');
    expect(config).toContain('src/assets/uploads');
    const content = await recipes.content.generate({ options: {}, capabilities: [], contributions: [] });
    expect(content.files.find(({ path }) => path === 'src/content/entries/example.md')?.content).toContain('../../assets/editor/images/content-example.svg');
    const cms = await recipes.cms.generate({ options: {}, capabilities: [], contributions: [] });
    expect(cms.files.map(({ path }) => path)).toEqual(['package.json', 'src/config/cms.ts', 'src/pages/admin.astro']);
    expect(cms.files.find(({ path }) => path === 'src/pages/admin.astro')?.content).toContain("import { composition } from '../content/definitions'");
    expect(recipes.cms.optionsSchema.safeParse(options).success).toBe(false);
  });

  it('uses the selected traits, labels and folders for only cms-admin-bound collections', () => {
    const config = buildContentCompositionDecapConfig(composition, options);
    expect(config.backend.branch).toBe('main');
    expect(config.publish_mode).toBeUndefined();
    expect(config.load_config_file).toBe(false);
    expect(config.media_folder).toBe('src/assets/editor/images');
    expect(config.public_folder).toBe('/src/assets/editor/images');
    expect(config.collections).toHaveLength(1);
    const [entries] = config.collections;
    if (!entries || !('folder' in entries)) throw new Error('Missing folder collection');
    expect(entries.folder).toBe('src/content/entries');
    expect(entries.label).toBe('Entries');
    expect(entries.fields.map(({ name }) => name)).toEqual(['title', 'slug', 'summary', 'image', 'body']);
    expect(entries.fields.find(({ name }) => name === 'image')?.fields?.find(({ name }) => name === 'alt')?.required).toBe(true);
    expect(entries.fields.find(({ name }) => name === 'slug')?.pattern).toBeDefined();
    expect(entries.fields.some(({ name }) => name === 'locale' || name === 'translationKey')).toBe(false);
  });

  it('requires an editor binding instead of exposing every content type', () => {
    expect(() => createCmsContentSiteRecipes({ ...composition, contentTypes: [composition.contentTypes[1]] }, options)).toThrow('cms-admin');
  });

  it.each([
    ['src/assets/images', 'src/assets/images'],
    ['src/assets/images', 'src/assets/images/nested'],
    ['src/assets/images/nested', 'src/assets/images'],
    ['src/assets/../images'],
    ['public/images'],
  ])('rejects unsafe, duplicate or overlapping roots: %j', (...mediaRoots) => {
    expect(() => cmsSiteOptionsSchema.parse({ ...options, mediaRoots })).toThrow();
  });
});
