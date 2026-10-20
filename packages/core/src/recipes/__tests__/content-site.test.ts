import { describe, expect, it } from 'vitest';
import { createContentSiteRecipes, generatedContentCompositionSchema } from '../content-site.js';
import { resolveCapabilityGraph } from '../graph.js';
import { shellRecipe } from '../shell-recipe.js';

const type = {
    id: 'entries', primary: true, labels: { en: 'Entries' }, routes: { en: '/entries/' },
    traits: ['title', 'slug', 'summary', 'image', 'body'],
    bindings: ['list', 'detail', 'navigation'],
};
const composition = { contentLocales: ['en'], contentTypes: [type] };

describe('content site recipes', () => {
    it.each([{ traits: ['title', 'slug', 'body'] }, { traits: type.traits }])('declares the first trait-schema runtime with traits $traits', async ({ traits }) => {
        const { content } = createContentSiteRecipes({ ...composition, contentTypes: [{ ...type, traits }] });
        const output = await content.generate({ options: {}, capabilities: [], contributions: [] });
        const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));
        expect(manifest.dependencies).toEqual({
            '@easy-web/core': '^1.6.0',
            ...(traits.includes('image') ? { sharp: '^0.35.0' } : {}),
        });
        expect(content.compatibleRuntimeRange).toBe(manifest.dependencies['@easy-web/core']);
        expect(content.outputContributions).toContainEqual(expect.objectContaining({ kind: 'dependency', target: 'package.json' }));
    });

    it('resolves content roles, rendering bindings and routes with shell navigation', async () => {
        const recipes = createContentSiteRecipes(composition);
        const graph = resolveCapabilityGraph([recipes.content, recipes.shell]);
        expect(graph.ok).toBe(true);
        if (!graph.ok) throw new Error(JSON.stringify(graph.error));
        expect(graph.value.contentTypes.primary?.id).toBe('content.type.entries');
        expect(graph.value.contributions.filter(({ kind }) => kind === 'binding')).toHaveLength(3);
        expect(graph.value.fixedPages.map(({ target }) => target)).toEqual(expect.arrayContaining(['/entries/', '/entries/[slug]']));
        const shell = await recipes.shell.generate({ options: shellRecipe.optionsSchema.parse({}), capabilities: [], contributions: [] });
        expect(shell.files.find(({ path }) => path === 'src/layouts/Base.astro')?.content).toContain('"href":"/entries/"');
        const content = await recipes.content.generate({ options: {}, capabilities: [], contributions: [] });
        expect(content.files.find(({ path }) => path === 'src/content/definitions.ts')?.content).toContain('image()');
        expect(content.files.find(({ path }) => path === 'src/lib/content/entries.ts')?.content).toContain("assertImplements<Entry['data'], HasTitle & HasSlug & HasSummary & HasImage>()");
    });

    it('omits optional image/summary fields and navigation rather than inventing capabilities', async () => {
        const recipes = createContentSiteRecipes({ ...composition, contentTypes: [{ ...type, traits: ['title', 'slug', 'body'], bindings: ['list', 'detail'] }] });
        const content = await recipes.content.generate({ options: {}, capabilities: [], contributions: [] });
        expect(content.files.some(({ path }) => path.endsWith('.svg'))).toBe(false);
        expect(content.files.find(({ path }) => path === 'src/lib/content/entries.ts')?.content).not.toContain('data.summary');
        expect(recipes.content.outputContributions.some(({ id }) => id.endsWith('.navigation'))).toBe(false);
    });

    it('uses bracket access for kebab-case collection IDs and nested route imports', async () => {
        const recipes = createContentSiteRecipes({ ...composition, contentTypes: [{ ...type, id: 'example-entry', routes: { en: '/library/entries' } }] });
        const content = await recipes.content.generate({ options: {}, capabilities: [], contributions: [] });
        expect(content.files.find(({ path }) => path === 'src/pages/library/entries/index.astro')?.content).toContain("../../../lib/content/example-entry");
        expect(content.files.find(({ path }) => path === 'src/content/definitions.ts')?.content).toContain('"example-entry": defineCollection');
    });

    it.each([
        { traits: ['title', 'slug', 'body', 'photos'] },
        { traits: ['title', 'slug', 'body', 'money'], currency: 'EUR' },
        { bindings: ['homepage', 'list', 'detail'], traits: ['title', 'slug', 'image', 'featured', 'body'] },
        { bindings: ['list'] },
        { traits: ['title', 'slug'] },
        { routes: { en: '/admin/imports/' } },
        { routes: { en: '/404/examples/' } },
        { routes: { en: '/x/[slug]/' } },
        { routes: { en: '/x/../y/' } },
    ])('rejects unsupported composition changes %j', (change) => {
        expect(generatedContentCompositionSchema.safeParse({ ...composition, reservedRoutes: [], contentTypes: [{ ...type, ...change }] }).success).toBe(false);
    });

    it('rejects overlapping routes before producing recipes', () => {
        expect(() => createContentSiteRecipes({ ...composition, contentTypes: [type, { ...type, id: 'other', primary: false, routes: { en: '/entries/example/' } }] })).toThrow('overlap');
    });

    it('rejects multiple locales and empty content selections', () => {
        expect(generatedContentCompositionSchema.safeParse({ contentLocales: ['en'], contentTypes: [] }).success).toBe(false);
        expect(generatedContentCompositionSchema.safeParse({ contentLocales: ['en', 'de'], contentTypes: [] }).success).toBe(false);
    });
});
