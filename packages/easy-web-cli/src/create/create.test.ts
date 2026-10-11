import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shellRecipe } from '@easy-web/core/recipes';
import { composeRecipes, mergePackageFragments, outputPath } from './compose.js';
import { parseCreateConfig, selectionsFor } from './config.js';
import { createSite } from './run.js';
import { git } from './git.js';
import { listFiles } from './stage.js';

let root: string;
vi.setConfig({ testTimeout: 30_000 });
beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'easy-web-create-test-'));
    vi.stubEnv('GIT_AUTHOR_NAME', 'Create Test');
    vi.stubEnv('GIT_AUTHOR_EMAIL', 'create-test@example.invalid');
    vi.stubEnv('GIT_COMMITTER_NAME', 'Create Test');
    vi.stubEnv('GIT_COMMITTER_EMAIL', 'create-test@example.invalid');
});
afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
});

describe('create Git boundary', () => {
    it.each([false, true])('creates one shell commit when empty directory exists=%s', async (exists) => {
        // Given
        const target = join(root, 'site');
        if (exists) await mkdir(target);
        const config = parseCreateConfig({ target });
        // When
        const result = await createSite(config);
        // Then
        expect(await git(target, ['rev-list', '--count', 'HEAD'])).toBe('1');
        expect(await listFiles(target)).toEqual(shellRecipe.outputContributions.map(outputPath).sort());
        expect(await git(target, ['status', '--porcelain'])).toBe('');
        expect(result.target).toBe(target);
        expect(await readdir(root)).toEqual(['site']);
    });

    it('keeps shell and auth output when composing their package fragments', async () => {
        // Given
        const target = join(root, 'site');
        const config = parseCreateConfig({ target, recipes: { shell: { siteName: 'Auth Site' }, auth: {} } });
        // When
        await createSite(config);
        // Then
        const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
        expect(manifest.dependencies).toMatchObject({ '@easy-web/core': '^1.5.0', '@easy-web/auth': '^1.5.0', react: '^19.1.1' });
        expect(manifest.scripts.build).toBe('astro build');
        expect(manifest.devDependencies.typescript).toBe('^5.5.0');
        expect(await listFiles(target)).toEqual([...new Set(selectionsFor(config).flatMap(({ recipe }) => recipe.outputContributions.map(outputPath)))].sort());
        expect(await git(target, ['rev-list', '--count', 'HEAD'])).toBe('1');
    });

    it.each(['visible.txt', '.hidden', '.gitignore', 'nested/.git'])('rejects occupied target %s without writes', async (path) => {
        // Given
        const target = join(root, 'site');
        await mkdir(join(target, 'nested'), { recursive: true });
        await writeFile(join(target, path), 'preserve');
        const before = await listFiles(target);
        // When
        await expect(createSite(parseCreateConfig({ target }))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        // Then
        expect(await listFiles(target)).toEqual(before);
        expect(await readFile(join(target, path), 'utf8')).toBe('preserve');
        expect(await readdir(root)).toEqual(['site']);
    });

    it('rejects a junction or symlink target', async () => {
        // Given
        const target = join(root, 'site');
        await mkdir(join(root, 'destination'));
        await symlink(join(root, 'destination'), target, process.platform === 'win32' ? 'junction' : 'dir');
        // When
        await expect(createSite(parseCreateConfig({ target }))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        // Then
        expect(await readdir(join(root, 'destination'))).toEqual([]);
    });

    it('rejects shell plus CMS before generation or partial publication', async () => {
        // Given
        const target = join(root, 'site');
        const config = parseCreateConfig({ target, recipes: { cms: {
            composition: { contentLocales: ['en'], contentTypes: [], reservedRoutes: [] },
            backend: { repo: 'org/project/repo', tenantId: 'PLACEHOLDER', appId: 'PLACEHOLDER' },
            mediaRoots: ['src/assets/images'],
        } } });
        // When
        await expect(createSite(config)).rejects.toThrow('multi-recipe astro.config.mjs merge not yet supported in Phase 1');
        // Then
        expect(await readdir(root)).toEqual([]);
    });

    it.each([false, true])('cleans staging on generation failure when target exists=%s', async (exists) => {
        // Given
        const target = join(root, 'site');
        if (exists) await mkdir(target);
        const config = parseCreateConfig({ target });
        const selected = selectionsFor(config);
        const broken = { ...selected[0], recipe: { ...selected[0].recipe, generate: () => { throw new Error('injected'); } } };
        // When
        await expect(createSite(config, [broken])).rejects.toMatchObject({ code: 'CREATE_FAILED' });
        // Then
        expect(await readdir(root)).toEqual(exists ? ['site'] : []);
        if (exists) expect(await readdir(target)).toEqual([]);
    });

    it('preserves newly occupied target on a planning race', async () => {
        // Given
        const target = join(root, 'site');
        const config = parseCreateConfig({ target });
        const selection = selectionsFor(config)[0];
        const racing = { ...selection, recipe: { ...selection.recipe, generate: async (context: Parameters<typeof selection.recipe.generate>[0]) => {
            await mkdir(target);
            await writeFile(join(target, 'raced.txt'), 'preserve');
            return selection.recipe.generate(context);
        } } };
        // When
        await expect(createSite(config, [racing])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        // Then
        expect(await readdir(root)).toEqual(['site']);
        expect(await readFile(join(target, 'raced.txt'), 'utf8')).toBe('preserve');
    });

    it('creates an isolated task worktree when caller has an empty HEAD', async () => {
        // Given
        const target = join(root, 'caller');
        await mkdir(target);
        await git(target, ['init', '--initial-branch=main', '--template=']);
        await git(target, ['commit', '--allow-empty', '-m', 'Empty base']);
        const head = await git(target, ['rev-parse', 'HEAD']);
        // When
        const result = await createSite(parseCreateConfig({ target }));
        // Then
        expect(await git(target, ['rev-parse', 'HEAD'])).toBe(head);
        expect(await git(target, ['ls-files'])).toBe('');
        expect(await readdir(target)).toEqual(['.git']);
        expect(await git(result.target, ['rev-list', '--count', `${head}..HEAD`])).toBe('1');
    });

    it('removes the task branch and worktree on staged syntax failure', async () => {
        // Given
        const target = join(root, 'caller');
        await mkdir(target);
        await git(target, ['init', '--initial-branch=main', '--template=']);
        await git(target, ['commit', '--allow-empty', '-m', 'Empty base']);
        const head = await git(target, ['rev-parse', 'HEAD']);
        const config = parseCreateConfig({ target });
        const selection = selectionsFor(config)[0];
        const broken = { ...selection, recipe: { ...selection.recipe, generate: async (context: Parameters<typeof selection.recipe.generate>[0]) => {
            const output = await selection.recipe.generate(context);
            return { files: output.files.map((file) => file.path === 'astro.config.mjs' ? { ...file, content: 'export default {' } : file) };
        } } };
        // When
        await expect(createSite(config, [broken])).rejects.toMatchObject({ code: 'CREATE_FAILED' });
        // Then
        expect(await git(target, ['rev-parse', 'HEAD'])).toBe(head);
        expect(await git(target, ['branch', '--format=%(refname:short)'])).toBe('main');
        expect(await readdir(root)).toEqual(['caller']);
        expect(await readdir(target)).toEqual(['.git']);
    });

    it('cleans published files when committing fails', async () => {
        // Given
        const target = join(root, 'site');
        await mkdir(target);
        const config = parseCreateConfig({ target });
        vi.stubEnv('GIT_AUTHOR_NAME', '');
        vi.stubEnv('GIT_COMMITTER_NAME', '');
        // When
        await expect(createSite(config)).rejects.toMatchObject({ code: 'CREATE_FAILED' });
        // Then
        expect(await readdir(target)).toEqual([]);
        expect(await readdir(root)).toEqual(['site']);
    });
});

describe('composer boundaries', () => {
    it.each(['missing', 'extra'])('rejects %s generated output', async (mode) => {
        // Given
        const selection = selectionsFor(parseCreateConfig({ target: join(root, 'site') }))[0];
        const broken = { ...selection, recipe: { ...selection.recipe, generate: async (context: Parameters<typeof selection.recipe.generate>[0]) => {
            const output = await selection.recipe.generate(context);
            return { files: mode === 'missing' ? output.files.slice(1) : [...output.files, { path: 'extra.txt', content: 'extra' }] };
        } } };
        // When
        await expect(composeRecipes([broken])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        // Then
        expect(await readdir(root)).toEqual([]);
    });
    it('is deterministic for identical inputs', async () => {
        // Given
        const selections = selectionsFor(parseCreateConfig({ target: join(root, 'site'), recipes: { auth: {} } }));
        const first = await composeRecipes(selections);
        // When
        const second = await composeRecipes([...selections].reverse());
        // Then
        expect(second).toEqual(first);
    });

    it('merges maps additively and uses last value only for colliding keys', () => {
        // Given
        const fragments = [JSON.stringify({ scripts: { dev: 'first', build: 'build' }, dependencies: { a: '1' } }),
            JSON.stringify({ scripts: { dev: 'second', check: 'check' }, dependencies: { b: '2' }, devDependencies: { c: '3' } })];
        // When
        const result = JSON.parse(mergePackageFragments(fragments));
        // Then
        expect(result).toEqual({ scripts: { dev: 'second', build: 'build', check: 'check' }, dependencies: { a: '1', b: '2' }, devDependencies: { c: '3' } });
    });

    it.each(['../escape', 'src/../../escape', '.git/config', 'C:/escape', 'src\\escape', 'NUL'])('rejects unsafe declared output %s', async (path) => {
        // Given
        const selection = selectionsFor(parseCreateConfig({ target: join(root, 'site') }))[0];
        const broken = { ...selection, recipe: { ...selection.recipe, outputContributions: [{ kind: 'file' as const, id: 'test.path', target: path }] } };
        // When
        await expect(composeRecipes([broken])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        // Then
        expect(await readdir(root)).toEqual([]);
    });
});
