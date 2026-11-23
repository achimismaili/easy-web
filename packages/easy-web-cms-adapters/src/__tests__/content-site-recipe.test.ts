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
  it.each([
    [false, false, '^1.6.0', '^1.9.0'],
    [false, true, '^1.10.0', '^1.10.0'],
    [true, false, '^1.10.0', '^1.10.0'],
    [true, true, '^1.10.0', '^1.10.0'],
  ])('uses the correct runtime floors and pipeline for bilingual=%s order=%s', async (bilingual, ordered, coreFloor, cmsFloor) => {
    const selected = {
      contentLocales: bilingual ? ['de', 'en'] : ['de'],
      contentTypes: [{
        id: 'entries', primary: true,
        labels: bilingual ? { de: 'Eintraege', en: 'Entries' } : { de: 'Eintraege' },
        routes: bilingual ? { de: '/eintraege/', en: '/entries/' } : { de: '/eintraege/' },
        traits: ['title', 'slug', 'body', ...(ordered ? ['order'] : [])],
        bindings: ['list', 'detail', 'cms-admin'],
      }],
    };
    const recipes = createCmsContentSiteRecipes(selected, options);
    expect(recipes.content.compatibleRuntimeRange).toBe(coreFloor);
    expect(recipes.cms.compatibleRuntimeRange).toBe(cmsFloor);
    const output = await recipes.content.generate({ options: {}, capabilities: [], contributions: [] });
    const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));
    expect(manifest.dependencies['@easy-web/core']).toBe(coreFloor);
    const cmsOutput = await recipes.cms.generate({ options: {}, capabilities: [], contributions: [] });
    const cmsManifest = JSON.parse(String(cmsOutput.files.find(({ path }) => path === 'package.json')?.content));
    expect(cmsManifest.dependencies['@easy-web/core']).toBe(cmsFloor);
    expect(cmsManifest.dependencies['@easy-web/cms-adapters']).toBe(cmsFloor);
    const list = String(output.files.find(({ path }) => path === 'src/pages/eintraege/index.astro')?.content);
    if (bilingual) {
      expect(list.indexOf('data.locale === "de"')).toBeLessThan(list.indexOf('.sort('));
      expect(list.indexOf('.sort(')).toBeLessThan(list.indexOf('.map((entry) => toItem(entry, "de", sitePrefix))'));
    }
    if (ordered) expect(list).toContain('compareContentOrder(');
    else if (bilingual) expect(list).toContain('.sort((left, right) => left.data.slug');
    else expect(list).toContain('.map(toItem).sort((left, right) => left.href < right.href ? -1 : left.href > right.href ? 1 : 0)');
  });

  it('requires the first composition-helper release for both directly used packages', async () => {
    const { cms } = createCmsContentSiteRecipes(composition, options);
    const output = await cms.generate({ options: {}, capabilities: [], contributions: [] });
    const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));
    expect(manifest.dependencies['@easy-web/core']).toBe('^1.9.0');
    expect(manifest.dependencies['@easy-web/cms-adapters']).toBe('^1.9.0');
    expect(cms.compatibleRuntimeRange).toBe(manifest.dependencies['@easy-web/cms-adapters']);
  });

  it('generates localized Decap collections from the same DE/EN composition', () => {
    const bilingual = contentCompositionSchema.parse({
      contentLocales: ['de', 'en'],
      contentTypes: [{
        id: 'entries', primary: true, labels: { de: 'Beiträge', en: 'Entries' },
        routes: { de: '/beitraege/', en: '/entries/' },
        traits: ['title', 'slug', 'body'],
        bindings: ['list', 'detail', 'navigation', 'cms-admin'],
      }],
    });
    const config = buildContentCompositionDecapConfig(bilingual, options);
    expect(config.collections).toHaveLength(2);
    expect(config.collections.map((collection) => [collection.name, collection.label, collection.folder])).toEqual([
      ['entries_de', 'Beiträge (DE)', 'src/content/entries/de'],
      ['entries_en', 'Entries (EN)', 'src/content/entries/en'],
    ]);
    for (const collection of config.collections) {
      if (!('folder' in collection)) throw new Error('Expected a localized folder collection');
      expect(collection.fields.map(({ name }) => name)).toEqual(['title', 'slug', 'locale', 'translationKey', 'body']);
    }
  });

  it('raises the generated runtime floor only for bilingual CMS output', async () => {
    const bilingual = contentCompositionSchema.parse({
      contentLocales: ['de', 'en'],
      contentTypes: [{
        id: 'entries', primary: true, labels: { de: 'Beiträge', en: 'Entries' },
        routes: { de: '/beitraege/', en: '/entries/' },
        traits: ['title', 'slug', 'body'],
        bindings: ['list', 'detail', 'navigation', 'cms-admin'],
      }],
    });
    const { cms } = createCmsContentSiteRecipes(bilingual, options);
    const output = await cms.generate({ options: {}, capabilities: [], contributions: [] });
    const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));
    expect(manifest.dependencies['@easy-web/core']).toBe('^1.10.0');
    expect(manifest.dependencies['@easy-web/cms-adapters']).toBe('^1.10.0');
  });

  it('raises the generated runtime floor when optional order support is selected', async () => {
    const ordered = {
      ...composition,
      contentTypes: [{
        ...composition.contentTypes[0]!,
        traits: ['title', 'slug', 'summary', 'image', 'body', 'order'],
      }],
    };
    const { cms } = createCmsContentSiteRecipes(ordered, options);
    const output = await cms.generate({ options: {}, capabilities: [], contributions: [] });
    const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));

    expect(manifest.dependencies['@easy-web/core']).toBe('^1.10.0');
    expect(manifest.dependencies['@easy-web/cms-adapters']).toBe('^1.10.0');
    expect(cms.compatibleRuntimeRange).toBe('^1.10.0');
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

  it('exposes an optional, unbounded integer order field in CMS forms', () => {
    const ordered = {
      ...composition,
      contentTypes: [{
        ...composition.contentTypes[0]!,
        traits: ['title', 'slug', 'summary', 'image', 'body', 'order'],
      }],
    };
    const config = buildContentCompositionDecapConfig(ordered, options);
    const collection = config.collections[0];
    if (!collection || !('folder' in collection)) throw new Error('Missing folder collection');
    const order = collection.fields.find(({ name }) => name === 'order');

    expect(order).toMatchObject({
      name: 'order',
      widget: 'number',
      required: false,
      value_type: 'int',
    });
    expect(order?.min).toBeUndefined();
    expect(order?.max).toBeUndefined();
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
