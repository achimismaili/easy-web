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
        expect(content.files.find(({ path }) => path === 'src/pages/entries/index.astro')?.content)
            .toContain('.map(toItem).sort((left, right) => left.href < right.href');
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

    it('rejects unsupported locale sets and empty content selections', () => {
        expect(generatedContentCompositionSchema.safeParse({ contentLocales: ['en'], contentTypes: [] }).success).toBe(false);
        expect(generatedContentCompositionSchema.safeParse({
            contentLocales: ['de', 'fr'], contentTypes: [{ ...type, labels: { de: 'Einträge', fr: 'Entrées' }, routes: { de: '/beitraege/', fr: '/entrees/' } }],
        }).success).toBe(false);
    });

    it('generates localized collections, routes and translation-aware links for the DE/EN pair', async () => {
        const bilingual = {
            contentLocales: ['de', 'en'],
            contentTypes: [{
                ...type,
                labels: { de: 'Beiträge', en: 'Entries' },
                routes: { de: '/beitraege/', en: '/entries/' },
                traits: ['title', 'slug', 'summary', 'body'],
            }],
        };
        const recipes = createContentSiteRecipes(bilingual);
        const content = await recipes.content.generate({ options: {}, capabilities: [], contributions: [] });
        const paths = content.files.map(({ path }) => path);
        expect(paths).toEqual(expect.arrayContaining([
            'src/content/entries/de/example.md', 'src/content/entries/en/example.md',
            'src/pages/beitraege/index.astro', 'src/pages/beitraege/[slug].astro',
            'src/pages/entries/index.astro', 'src/pages/entries/[slug].astro',
        ]));
        const german = content.files.find(({ path }) => path === 'src/content/entries/de/example.md')!.content;
        const english = content.files.find(({ path }) => path === 'src/content/entries/en/example.md')!.content;
        expect(german).toContain('"locale": "de"');
        expect(german).toContain('"translationKey": "example"');
        expect(german).toContain('Beiträge - Beispiel');
        expect(english).toContain('Entries - Example');
        const definitions = content.files.find(({ path }) => path === 'src/content/definitions.ts')!.content;
        expect(definitions).toContain('locale: z.enum(["de","en"])');
        expect(definitions).toContain('translationKey: z.string().min(1)');
        const detail = content.files.find(({ path }) => path === 'src/pages/beitraege/[slug].astro')!.content;
        expect(detail).toContain('candidate.data.translationKey === entry.data.translationKey');
        expect(detail).toContain('routeBases[candidate.data.locale] + \'/\' + candidate.data.slug + \'/\'');
        expect(detail).toContain('locale={"de"}');
        const list = content.files.find(({ path }) => path === 'src/pages/entries/index.astro')!.content;
        expect(list).toContain('data.locale === "en"');
        expect(list).toContain('locale={"en"}');
        expect(list.indexOf('.sort((left, right) => left.data.slug')).toBeLessThan(list.indexOf('.map((entry) => toItem(entry, "en", sitePrefix))'));
        expect(recipes.content.compatibleRuntimeRange).toBe('^1.10.0');
        expect(recipes.shell.outputContributions).toContainEqual(expect.objectContaining({ target: '/en/' }));
        expect(recipes.content.outputContributions).toContainEqual(expect.objectContaining({ target: '/beitraege/[slug]' }));
    });

    it('preserves the single-locale runtime minimum', async () => {
        const { content } = createContentSiteRecipes(composition);
        const output = await content.generate({ options: {}, capabilities: [], contributions: [] });
        const manifest = JSON.parse(String(output.files.find(({ path }) => path === 'package.json')?.content));
        expect(manifest.dependencies['@easy-web/core']).toBe('^1.6.0');
        expect(content.compatibleRuntimeRange).toBe('^1.6.0');
    });
});
