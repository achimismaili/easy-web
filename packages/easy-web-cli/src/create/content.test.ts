import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { composeRecipes } from './compose.js';
import { parseCreateConfig, selectionsFor } from './config.js';
import { createSite } from './run.js';
import { git } from './git.js';
import { listFiles } from './stage.js';

let root: string;
const composition = {
    contentLocales: ['en'],
    contentTypes: [{
        id: 'entries', primary: true, labels: { en: 'Entries' }, routes: { en: '/entries/' },
        traits: ['title', 'slug', 'summary', 'image', 'body'], bindings: ['list', 'detail', 'navigation'],
    }],
};
const cmsOptions = {
    backend: { repo: 'org/project/repo', tenantId: 'TENANT_PLACEHOLDER', appId: 'APP_PLACEHOLDER' },
    mediaRoots: ['src/assets/images'], uiLocale: 'en',
};
const cmsComposition = {
    ...composition, contentTypes: [{ ...composition.contentTypes[0], bindings: ['list', 'detail', 'navigation', 'cms-admin'] }],
};

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'easy-web-content-'));
    vi.stubEnv('GIT_AUTHOR_NAME', 'Content Test');
    vi.stubEnv('GIT_AUTHOR_EMAIL', 'content@example.invalid');
    vi.stubEnv('GIT_COMMITTER_NAME', 'Content Test');
    vi.stubEnv('GIT_COMMITTER_EMAIL', 'content@example.invalid');
});
afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
});

describe('content-aware CLI composition', () => {
    it('creates a deterministic, single-commit site with logical graph nodes, not fictitious files', async () => {
        const first = await createSite(parseCreateConfig({ target: join(root, 'a'), composition }));
        const second = await createSite(parseCreateConfig({ target: join(root, 'b'), composition }));
        expect(await git(first.target, ['rev-list', '--count', 'HEAD'])).toBe('1');
        expect(await git(first.target, ['status', '--porcelain'])).toBe('');
        expect(second.graphJson).toBe(first.graphJson);
        expect(second.graphMermaid).toBe(first.graphMermaid);
        const files = await listFiles(first.target);
        expect(files).toEqual(await listFiles(second.target));
        for (const file of files) expect(await readFile(join(first.target, file), 'utf8')).toBe(await readFile(join(second.target, file), 'utf8'));
        expect(files).toContain('src/pages/entries/index.astro');
        expect(files).toContain('src/pages/entries/[slug].astro');
        expect(files).not.toContain('primary');
        expect(files).not.toContain('content.type.entries');
        const graph = JSON.parse(first.graphJson);
        expect(graph.contentTypes.primary.id).toBe('content.type.entries');
        expect(graph.bindings).toHaveLength(3);
        expect(await readFile(join(first.target, 'src/layouts/Base.astro'), 'utf8')).toContain('"href":"/entries/"');
    }, 30_000);

    it('resolves multiple collection definitions and only selected navigation bindings', async () => {
        const selected = selectionsFor(parseCreateConfig({
            target: join(root, 'site'),
            composition: { ...composition, contentTypes: [
                ...composition.contentTypes,
                { ...composition.contentTypes[0], id: 'notes', primary: false, routes: { en: '/notes/' }, bindings: ['list', 'detail'] },
            ] },
        }));
        const output = await composeRecipes(selected);
        expect(await composeRecipes([...selected].reverse())).toEqual(output);
        const graph = JSON.parse(output.graphJson);
        expect(graph.contentTypes.additional[0].id).toBe('content.type.notes');
        const layout = String(output.files.find(({ path }) => path.endsWith('Base.astro'))?.content);
        expect(layout).toContain('/entries/');
        expect(layout).not.toContain('/notes/');
    });

    it('creates deterministic CMS output without duplicate owners or backend data in the graph', async () => {
        const selected = selectionsFor(parseCreateConfig({
            target: join(root, 'site'), composition: cmsComposition, recipes: { cms: cmsOptions },
        }));
        const output = await composeRecipes(selected);
        expect(await composeRecipes([...selected].reverse())).toEqual(output);
        expect(selected.filter(({ recipe }) => recipe.provides.includes('content.typed-definitions'))).toHaveLength(1);
        for (const file of ['astro.config.mjs', 'src/content/definitions.ts', 'src/content.config.ts']) {
            expect(output.files.filter(({ path }) => path === file)).toHaveLength(1);
        }
        expect(output.graphJson).toContain('cms.decap-editor');
        expect(output.graphJson).toContain('content.binding.entries.cms-admin');
        for (const backendValue of ['org/project/repo', 'TENANT_PLACEHOLDER', 'APP_PLACEHOLDER']) {
            expect(output.graphJson).not.toContain(backendValue);
            expect(output.graphMermaid).not.toContain(backendValue);
        }
        expect(output.files.some(({ path }) => path === 'src/pages/admin.astro')).toBe(true);
        expect(output.files.some(({ path }) => path === 'public/admin/config.yml')).toBe(false);
    });

    it('rejects a second CMS-owned composition even when it matches the top-level selection', () => {
        expect(() => parseCreateConfig({
            target: join(root, 'site'), composition: cmsComposition,
            recipes: { cms: { ...cmsOptions, composition: cmsComposition } },
        })).toThrow('Declare composition only once');
    });

    it.each([
        { composition: { ...composition, contentTypes: [{ ...composition.contentTypes[0], traits: ['title', 'slug'] }] } },
        { composition: { ...composition, contentTypes: [{ ...composition.contentTypes[0], traits: ['title', 'slug', 'body', 'photos'] }] } },
        { composition, recipes: { shell: { defaultLocale: 'de' } } },
        { composition, recipes: { auth: {} } },
        { composition, recipes: { cms: {
            composition, backend: { repo: 'org/project/repo', tenantId: 'PLACEHOLDER', appId: 'PLACEHOLDER' }, mediaRoots: ['src/assets/images'],
        } } },
        { composition: cmsComposition },
        { composition, recipes: { cms: cmsOptions } },
        { recipes: { cms: cmsOptions } },
        { composition: cmsComposition, recipes: { cms: { ...cmsOptions, mediaRoots: ['src/assets/images', 'src/assets/images/nested'] } } },
        { composition: cmsComposition, recipes: { cms: cmsOptions, auth: {} } },
    ])('rejects unsupported input before staging: %j', async (input) => {
        expect(() => parseCreateConfig({ target: join(root, 'site'), ...input })).toThrow();
        expect(await readdir(root)).toEqual([]);
    });
});
