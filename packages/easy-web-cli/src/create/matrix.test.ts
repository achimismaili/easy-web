// Generated-project matrix (plan todo 15).
//
// Drives the REAL createSite pipeline (compose -> stage -> commit) with a mocked install runner.
// Only profiles that are composable today are exercised; everything else is an explicit
// it.skip / documented gap, never fabricated coverage:
//   - legacy standalone cms + shell still conflicts; the composition-aware CMS path is covered.
//   - money: no recipe consumes the `money` trait.
//   - bilingual/regional: content generation currently accepts one locale.
//   - legal enabled/disabled: shell has no legal toggle.
//   - axe: no axe package is available in the monorepo, and none was added (documented gap).
// Real astro check + astro build ARE run on createSite output. A generated target has no
// node_modules, so its files are copied (minus .git) under packages/auth or apps/contract-fixture,
// which own the relevant test dependencies. Astro runs under the test runner's Node version without an installer.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { cp, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRecipe } from '@easy-web/auth/recipe';
import { composeRecipes, outputPath } from './compose.js';
import { parseCreateConfig, selectionsFor } from './config.js';
import type { RecipeSelection } from './config.js';
import { createSite } from './run.js';
import { git } from './git.js';
import { listFiles } from './stage.js';
import type { InstallRunner } from './install.js';

vi.setConfig({ testTimeout: 60_000 });

let root: string;
beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'easy-web-matrix-'));
    vi.stubEnv('GIT_AUTHOR_NAME', 'Matrix Test');
    vi.stubEnv('GIT_AUTHOR_EMAIL', 'matrix@example.invalid');
    vi.stubEnv('GIT_COMMITTER_NAME', 'Matrix Test');
    vi.stubEnv('GIT_COMMITTER_EMAIL', 'matrix@example.invalid');
});
afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
});

const cmsOptions = {
    composition: { contentLocales: ['en'], contentTypes: [], reservedRoutes: [] },
    backend: { repo: 'org/project/repo', tenantId: 'PLACEHOLDER', appId: 'PLACEHOLDER' },
    mediaRoots: ['src/assets/images'],
};

interface Profile {
    readonly name: string;
    readonly recipes: Record<string, unknown>;
    readonly auth: boolean;
}

const validProfiles: readonly Profile[] = [
    { name: 'minimal (shell only)', recipes: { shell: { siteName: 'Matrix Site' } }, auth: false },
    { name: 'minimal, de default locale + theme/brand name', recipes: { shell: { siteName: 'Marke', defaultLocale: 'de' } }, auth: false },
    { name: 'shell + auth', recipes: { shell: { siteName: 'Matrix Site' }, auth: {} }, auth: true },
];

async function walk(directory: string, prefix = ''): Promise<string[]> {
    const out: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === '.git') continue;
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out.push(...await walk(join(directory, entry.name), relative));
        else out.push(relative);
    }
    return out.sort();
}

describe('generated-project matrix: valid profiles', () => {
    for (const profile of validProfiles) {
        describe(profile.name, () => {
            it('creates one commit, emits graphs, has structural routes and the right auth island count', async () => {
                // Given
                const target = join(root, 'site');
                const runner = vi.fn<InstallRunner>();
                const config = parseCreateConfig({ target, recipes: profile.recipes });
                // When
                const result = await createSite(config, undefined, { install: false, runner });
                // Then: one commit, clean tree, no install spawned
                expect(await git(target, ['rev-list', '--count', 'HEAD'])).toBe('1');
                expect(await git(target, ['status', '--porcelain'])).toBe('');
                expect(runner).not.toHaveBeenCalled();
                // graphs
                expect(result.graphJson.length).toBeGreaterThan(0);
                expect(result.graphMermaid.length).toBeGreaterThan(0);
                expect(JSON.parse(result.graphJson)).toBeTypeOf('object');
                expect(result.graphJson).toContain('site.shell');
                expect(result.graphMermaid).toContain('site.shell');
                expect(result.graphJson.includes('auth.single-island')).toBe(profile.auth);
                // structural routes: every declared contribution exists as a file
                const files = await walk(target);
                const declared = selectionsFor(config).flatMap(({ recipe }) => recipe.outputContributions.map(outputPath));
                for (const path of declared) expect(files, `missing ${path}`).toContain(path);
                expect(files).toContain('src/pages/index.astro');
                expect(files).toContain('src/pages/404.astro');
                expect(files).toContain('pnpm-lock.yaml');
                // structural single-island rule: exactly one client island directive iff auth selected
                let islands = 0;
                const leaks: string[] = [];
                for (const path of files.filter((file) => /\.(astro|tsx|ts|mjs|json)$/.test(file))) {
                    const text = await readFile(join(target, path), 'utf8');
                    islands += (text.match(/client:(?:only|load|idle|visible)/g) ?? []).length;
                    if (/\[object Object\]|\bundefined\b(?=["'<])|NaN</.test(text)) leaks.push(path);
                }
                expect(islands).toBe(profile.auth ? 1 : 0);
                expect(leaks).toEqual([]);
                expect(files.includes('src/components/AuthMount.astro')).toBe(profile.auth);
                // default locale flows into the generated layout
                if (profile.name.includes('de default')) {
                    expect(await readFile(join(target, 'src/layouts/Base.astro'), 'utf8')).toContain('const currentLang = "de"');
                }
            });

            it('is deterministic: two independent creations give identical graph JSON, Mermaid and file bytes', async () => {
                // Given
                const first = join(root, 'a');
                const second = join(root, 'b');
                const opts = { install: false } as const;
                // When
                const one = await createSite(parseCreateConfig({ target: first, recipes: profile.recipes }), undefined, opts);
                const two = await createSite(parseCreateConfig({ target: second, recipes: profile.recipes }), undefined, opts);
                // Then
                expect(two.graphJson).toBe(one.graphJson);
                expect(two.graphMermaid).toBe(one.graphMermaid);
                const names = await listFiles(first);
                expect(await listFiles(second)).toEqual(names);
                for (const name of names) {
                    expect(await readFile(join(second, name), 'utf8')).toBe(await readFile(join(first, name), 'utf8'));
                }
            });
        });
    }

    it('mocked installer runs only on explicit install, after the commit, offline', async () => {
        // Given
        const target = join(root, 'site');
        const runner = vi.fn<InstallRunner>(async (cwd) => {
            expect(await git(cwd, ['rev-list', '--count', 'HEAD'])).toBe('1');
        });
        // When
        await createSite(parseCreateConfig({ target, recipes: { auth: {} } }), undefined, { install: true, runner });
        // Then
        expect(runner).toHaveBeenCalledOnce();
    });
});

const here = dirname(fileURLToPath(import.meta.url));
const authPackage = resolve(here, '..', '..', '..', 'auth');
const contentPackage = resolve(authPackage, '..', '..', 'apps', 'contract-fixture');
const authSource = join(authPackage, 'src', 'index.ts').replaceAll('\\', '/');
const astroPackage = join(authPackage, 'node_modules', 'astro');
const astroBin = resolve(astroPackage, JSON.parse(readFileSync(join(astroPackage, 'package.json'), 'utf8')).bin.astro);

function runAstro(command: 'check' | 'build', root: string): Promise<string> {
    return new Promise((done, fail) => {
        const child = spawn(process.execPath, [astroBin, command, '--root', root], {
            cwd: root, env: { ...process.env, CI: 'true', NO_COLOR: '1' },
        });
        let output = '';
        child.stdout.on('data', (chunk) => { output += String(chunk); });
        child.stderr.on('data', (chunk) => { output += String(chunk); });
        const timer = setTimeout(() => { child.kill(); fail(new Error(`astro ${command} timed out\n${output}`)); }, 120_000);
        child.on('error', (error) => { clearTimeout(timer); fail(error); });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) done(output); else fail(new Error(`astro ${command} exit ${code}\n${output}`));
        });
    });
}

describe('generated-project matrix: real astro check + build on createSite output', () => {
    const contentComposition = {
        contentLocales: ['en'],
        contentTypes: [{
            id: 'entries', primary: true, labels: { en: 'Entries' }, routes: { en: '/library/entries/' },
            traits: ['title', 'slug', 'summary', 'image', 'body'], bindings: ['list', 'detail', 'navigation'],
        }, {
            id: 'example-note', labels: { en: 'Notes' }, routes: { en: '/notes/' },
            traits: ['title', 'slug', 'body'], bindings: ['list', 'detail'],
        }],
    };
    const cmsComposition = {
        ...contentComposition, contentTypes: contentComposition.contentTypes.map((type, index) => ({
            ...type, bindings: [...type.bindings, ...(index === 0 ? ['cms-admin'] : [])],
        })),
    };
    const editorOptions = {
        backend: cmsOptions.backend, mediaRoots: ['src/assets/images'], uiLocale: 'en',
    };
    const realProfiles: readonly { readonly name: string; readonly recipes: Record<string, unknown>; readonly auth: boolean; readonly composition?: unknown; readonly noIndex?: boolean; readonly locale?: string; readonly cms?: boolean }[] = [
        { name: 'minimal (shell only)', recipes: { shell: { siteName: 'Matrix Site' } }, auth: false },
        { name: 'shell + auth', recipes: { shell: { siteName: 'Matrix Site' }, auth: {} }, auth: true },
        { name: 'content, public SEO', recipes: { shell: { siteName: 'Content Site' } }, composition: contentComposition, auth: false },
        { name: 'content, noIndex SEO', recipes: { shell: { siteName: 'Content Site', noIndex: true } }, composition: contentComposition, noIndex: true, auth: false },
        { name: 'CMS, public SEO', recipes: { cms: editorOptions }, composition: cmsComposition, cms: true, auth: false },
        { name: 'CMS, noIndex SEO', recipes: { shell: { noIndex: true }, cms: editorOptions }, composition: cmsComposition, cms: true, noIndex: true, auth: false },
        { name: 'CMS, de without images or summaries', recipes: { shell: { defaultLocale: 'de', noIndex: true }, cms: { ...editorOptions, uiLocale: 'de' } }, composition: {
            contentLocales: ['de'], contentTypes: [{
                id: 'entries', labels: { de: 'Eintraege' }, routes: { de: '/library/entries/' },
                traits: ['title', 'slug', 'body'], bindings: ['list', 'detail', 'navigation', 'cms-admin'],
            }],
        }, locale: 'de', cms: true, noIndex: true, auth: false },
        { name: 'content, de without images or summaries', recipes: { shell: { siteName: 'Inhalte', defaultLocale: 'de' } }, composition: {
            contentLocales: ['de'], contentTypes: [{
                id: 'entries', labels: { de: 'Eintraege' }, routes: { de: '/library/entries/' },
                traits: ['title', 'slug', 'body'], bindings: ['list', 'detail', 'navigation'],
            }],
        }, locale: 'de', auth: false },
    ];
    for (const profile of realProfiles) {
        it(`${profile.name}: astro check and astro build exit 0 and emit structural pages`, async () => {
            // Given: a real committed createSite target (installer mocked)
            const target = join(root, 'site');
            const runner = vi.fn<InstallRunner>();
            await createSite(parseCreateConfig({ target, recipes: profile.recipes, ...(profile.composition ? { composition: profile.composition } : {}) }), undefined, { install: false, runner });
            const fixture = await mkdtemp(join(profile.composition ? contentPackage : authPackage, '.matrix-fixture-'));
            try {
                for (const entry of await readdir(target)) {
                    if (entry !== '.git') await cp(join(target, entry), join(fixture, entry), { recursive: true });
                }
                if (profile.auth) {
                    const config = JSON.parse(await readFile(join(fixture, 'tsconfig.json'), 'utf8'));
                    await writeFile(join(fixture, 'tsconfig.json'), `${JSON.stringify({
                        ...config, compilerOptions: { baseUrl: '.', paths: { '@easy-web/auth': [authSource] } },
                    }, null, 2)}\n`);
                }
                if (profile.cms && !profile.locale) {
                    const entryPath = join(fixture, 'src', 'content', 'entries', 'example.md');
                    const entry = await readFile(entryPath, 'utf8');
                    await writeFile(entryPath, entry.replace('../../assets/images/content-example.svg', '/src/assets/images/content-example.svg')
                        + '\n![CMS body image](/src/assets/images/content-example.svg)\n');
                }
                // When
                const check = await runAstro('check', fixture);
                const build = await runAstro('build', fixture);
                // Then
                expect(check).toContain('0 errors');
                expect(build).toContain('Complete!');
                const dist = await walk(join(fixture, 'dist'));
                expect(dist).toContain('index.html');
                expect(dist).toContain('404.html');
                expect(dist.includes('sitemap-index.xml')).toBe(!profile.noIndex);
                const robots = await readFile(join(fixture, 'dist', 'robots.txt'), 'utf8');
                expect(robots).toContain(profile.noIndex ? 'Disallow: /\n' : 'Sitemap:');
                if (profile.noIndex) {
                    expect(dist.filter((path) => /sitemap.*\.xml$/.test(path))).toEqual([]);
                    expect(robots).not.toContain('Sitemap:');
                }
                const html = await readFile(join(fixture, 'dist', 'index.html'), 'utf8');
                expect(html).toContain(`<html lang="${profile.locale ?? 'en'}"`);
                expect(html).not.toMatch(/\[object Object\]/);
                if (profile.cms) {
                    const admin = await readFile(join(fixture, 'dist', 'admin', 'index.html'), 'utf8');
                    expect(admin).toContain('name="robots" content="noindex"');
                    expect(admin).toContain('decap-cms@3.16.3');
                    expect(admin).toContain('window.CMS_MANUAL_INIT = true');
                    expect(admin).not.toContain('MsalProvider');
                    const match = admin.match(/window\.initCMS\(\{ config: ([\s\S]*?) \}\);/);
                    if (!match) throw new Error('Missing built Decap configuration');
                    const editor = JSON.parse(match[1]);
                    expect(editor.collections).toHaveLength(1);
                    expect(editor.locale).toBe(profile.locale ?? 'en');
                    expect(editor.collections[0].folder).toBe('src/content/entries');
                    expect(editor.collections[0].fields.map(({ name }: { name: string }) => name)).toEqual(
                        profile.locale ? ['title', 'slug', 'body'] : ['title', 'slug', 'summary', 'image', 'body']);
                    if (!profile.locale) {
                        expect(editor.collections[0].fields.find(({ name }: { name: string }) => name === 'image').fields)
                            .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'alt', required: true })]));
                        expect(dist).toContain('src/assets/images/content-example.svg');
                        const detail = await readFile(join(fixture, 'dist', 'library', 'entries', 'example', 'index.html'), 'utf8');
                        expect(detail).toContain('alt="CMS body image"');
                        expect(detail).not.toContain('src="/src/assets');
                    }
                    expect(editor.public_folder).toBe('/src/assets/images');
                    expect(editor.backend.branch).toBe('main');
                    expect(editor.publish_mode).toBeUndefined();
                    expect(dist).not.toContain('admin/config.yml');
                    if (!profile.noIndex) expect(await readFile(join(fixture, 'dist', 'sitemap-0.xml'), 'utf8')).not.toContain('/admin');
                }
                if (profile.composition) {
                    const list = await readFile(join(fixture, 'dist', 'library', 'entries', 'index.html'), 'utf8');
                    const detail = await readFile(join(fixture, 'dist', 'library', 'entries', 'example', 'index.html'), 'utf8');
                    expect(list).toContain('href="/library/entries/example/"');
                    expect(detail).toContain(profile.locale === 'de' ? 'Ersetze diesen Beispielinhalt' : 'Replace this example content');
                    expect(detail).toContain('https://replace-with-your-domain.example/library/entries/example/');
                    for (const page of [html, list, detail]) {
                        expect(page).toContain('href="/library/entries/"');
                        expect(/name="robots" content="noindex, nofollow"/.test(page)).toBe(!!profile.noIndex);
                    }
                    if (!profile.locale) {
                        expect(list).toContain('alt="Circle on a dark background"');
                        expect(detail).toContain('alt="Circle on a dark background"');
                        expect(detail).toMatch(/src="\/_astro\/content-example[^"]*\.svg"/);
                        expect(detail).not.toContain('../../assets');
                        expect(dist).toContain('notes/example/index.html');
                        const note = await readFile(join(fixture, 'dist', 'notes', 'example', 'index.html'), 'utf8');
                        expect(note).toContain('Notes - Example');
                        expect(note).not.toContain('href="/notes/"');
                    }
                    if (!profile.noIndex) {
                        const sitemap = await readFile(join(fixture, 'dist', 'sitemap-0.xml'), 'utf8');
                        expect(sitemap).toContain('/library/entries/example/');
                    }
                    if (profile.name === 'content, public SEO' || profile.name === 'CMS, public SEO') {
                        const entryPath = join(fixture, 'src', 'content', 'entries', 'example.md');
                        const original = await readFile(entryPath, 'utf8');
                        await writeFile(entryPath, original.replace('"alt": "Circle on a dark background"', '"alt": ""'));
                        await expect(runAstro('build', fixture)).rejects.toThrow(/alt/);
                        await writeFile(entryPath, original);
                        if (profile.cms) {
                            await writeFile(entryPath, original.replace(/ {2}"summary": [^\n]+\n/, ''));
                            await expect(runAstro('build', fixture)).rejects.toThrow(/summary/);
                            await writeFile(entryPath, original.replace('"slug": "example"', '"slug": "Invalid Slug"'));
                            await expect(runAstro('build', fixture)).rejects.toThrow(/slug/);
                            await writeFile(entryPath, original);
                        }
                        await writeFile(join(fixture, 'src', 'content', 'entries', 'duplicate.md'), original);
                        await expect(runAstro('build', fixture)).rejects.toThrow('Duplicate content slug: example');
                        await rm(join(fixture, 'src', 'content', 'entries', 'duplicate.md'));
                        const adapterPath = join(fixture, 'src', 'lib', 'content', 'entries.ts');
                        const adapter = await readFile(adapterPath, 'utf8');
                        await writeFile(adapterPath, adapter.replace('title: data.title', 'title: 123'));
                        await expect(runAstro('check', fixture)).rejects.toThrow(/not assignable/);
                    }
                }
                // Rendered island count. FINDING: the shell+auth recipe output never mounts AuthMount (the Base layout
                // and index page do not reference it), so the built page has 0 islands even with auth selected.
                // Pinned deliberately so that wiring auth into the shell flips this to 1 on purpose.
                expect(html.match(/<astro-island\b/g) ?? []).toHaveLength(0);
                expect(await readFile(join(target, 'src/layouts/Base.astro'), 'utf8')).not.toContain('AuthMount');
            } finally {
                await rm(fixture, { recursive: true, force: true });
            }
        }, 300_000);
    }
});

const binPath = join(here, '..', '..', 'dist', 'bin.js');

describe('generated-project matrix: invalid / conflict profiles', () => {
    const conflicting = (recipeId: string, claim: string): RecipeSelection => ({
        options: {},
        recipe: { ...authRecipe, id: recipeId, provides: [recipeId], conflicts: [claim], outputContributions: [], validators: [], generate: async () => ({ files: [] }), order: { priority: 77, key: recipeId } },
    });

    it.each([
        ['shell + cms', { cms: cmsOptions }],
        ['shell + cms + auth', { cms: cmsOptions, auth: {} }],
    ])('%s: astro.config.mjs collision rejects with INVALID_INPUT and leaves no commit (fresh target)', async (_name, recipes) => {
        // Given
        const target = join(root, 'site');
        // When
        await expect(createSite(parseCreateConfig({ target, recipes }))).rejects.toMatchObject({
            code: 'INVALID_INPUT',
            message: expect.stringContaining('multi-recipe astro.config.mjs merge not yet supported in Phase 1'),
        });
        // Then
        expect(existsSync(target)).toBe(false);
        expect(await readdir(root)).toEqual([]);
    });

    it('shell + cms in a Git-backed target: HEAD unchanged, no extra branch, no worktree files', async () => {
        // Given
        const target = join(root, 'caller');
        await mkdir(target);
        await git(target, ['init', '--initial-branch=main', '--template=']);
        await git(target, ['commit', '--allow-empty', '-m', 'Empty base']);
        const head = await git(target, ['rev-parse', 'HEAD']);
        // When
        await expect(createSite(parseCreateConfig({ target, recipes: { cms: cmsOptions } }))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        // Then
        expect(await git(target, ['rev-parse', 'HEAD'])).toBe(head);
        expect(await git(target, ['rev-list', '--count', 'HEAD'])).toBe('1');
        expect(await git(target, ['branch', '--format=%(refname:short)'])).toBe('main');
        expect(await readdir(target)).toEqual(['.git']);
        expect(await readdir(root)).toEqual(['caller']);
    });

    it('hand-built conflicting recipe against auth is rejected as conflicting-capability with no commit', async () => {
        // Given
        const target = join(root, 'site');
        const config = parseCreateConfig({ target, recipes: { auth: {} } });
        const selections = [...selectionsFor(config), conflicting('test.no-auth', 'auth.single-island')];
        // When
        await expect(createSite(config, selections)).rejects.toMatchObject({
            code: 'INVALID_INPUT',
            message: expect.stringContaining('conflicting-capability'),
        });
        // Then
        expect(existsSync(target)).toBe(false);
        expect(await readdir(root)).toEqual([]);
    });

    it('hand-built conflicting recipe against the shell is rejected and composeRecipes alone also rejects', async () => {
        // Given
        const config = parseCreateConfig({ target: join(root, 'site') });
        const selections = [...selectionsFor(config), conflicting('test.no-shell', 'site.shell')];
        // When / Then
        await expect(composeRecipes(selections)).rejects.toMatchObject({ code: 'INVALID_INPUT', message: expect.stringContaining('conflicting-capability') });
        await expect(createSite(config, selections)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
        expect(await readdir(root)).toEqual([]);
    });

    it('CLI bin maps the shell + cms conflict to exit code 3 with no target created', async () => {
        // Given
        if (!existsSync(binPath)) throw new Error(`dist/bin.js missing; run pnpm --filter @easy-web/cli build first: ${binPath}`);
        const target = join(root, 'site');
        const configPath = join(root, 'config.json');
        const { writeFile } = await import('node:fs/promises');
        await writeFile(configPath, JSON.stringify({ target, recipes: { cms: cmsOptions } }));
        // When
        const run = spawnSync(process.execPath, [binPath, 'create', '--config', configPath, '--json'], { encoding: 'utf8', timeout: 30_000, env: process.env });
        // Then
        expect(run.status).toBe(3);
        expect(JSON.parse(run.stderr.trim())).toMatchObject({ code: 'INVALID_INPUT', level: 'error', command: 'create' });
        expect(existsSync(target)).toBe(false);
    });
});

describe('generated-project matrix: documented gaps (skipped, not faked)', () => {
    it.skip('money profile - no recipe consumes the money trait', () => undefined);
    it.skip('bilingual / regional locale modes - content generation currently accepts one locale', () => undefined);
    it.skip('legal enabled/disabled - shell has no legal toggle; legal links are unconditional', () => undefined);
    it.skip('legacy nested-composition CMS and application-auth composition - no single configuration owner', () => undefined);
    it.skip('axe accessibility scan - no axe package exists in the monorepo and none was added', () => undefined);
    it.skip('rendered auth island in shell+auth output - AuthMount is never mounted by the generated layout/page (pinned above as 0)', () => undefined);
});
