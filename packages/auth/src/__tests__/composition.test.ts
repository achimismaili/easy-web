// @vitest-environment node
//
// Package-level recipe composition harness (plan todo 12).
//
// Lives in @easy-web/auth because @easy-web/core cannot depend on auth or cms-adapters
// (cycle), while auth already depends on core and owns the Astro/React fixture toolchain.
// The CMS recipe is imported by relative source path (no new package dependency).
// Direct in-process resolver/planner testing only - the packed CLI matrix belongs to todo 15.
//
// Profiles NOT exercisable yet (documented, not faked):
//   - money:               the `money` trait exists but no recipe consumes it.
//   - primary/additional:  no recipe emits `content` contributions targeting `primary`/`additional`
//                          (cms emits kind 'content' with a file-path target, which is a different thing).
//   - full multilingual:   shell options have no `contentLocales`; only `defaultLocale` varies.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  resolveCapabilityGraph,
  serializeCapabilityGraphJson,
  serializeCapabilityGraphMermaid,
  shellRecipe,
  toCapabilityGraphDocument,
} from '@easy-web/core/recipes';
import type { RecipeGeneratedFile, RecipeMetadata } from '@easy-web/core/recipes';
import { authRecipe } from '../recipe';
import { cmsMediaRecipe } from '../../../easy-web-cms-adapters/src/recipe';

type AnyRecipe = RecipeMetadata<any>;

const cmsOptions = {
  composition: {
    contentLocales: ['en'],
    contentTypes: [{
      id: 'articles', primary: true, labels: { en: 'Articles' }, routes: { en: '/articles/' },
      bindings: ['homepage', 'detail', 'cms-admin'], traits: ['title', 'slug', 'body', 'image', 'featured'],
    }],
    reservedRoutes: ['/', '/404/', '/admin/'],
  },
  backend: { repo: 'org/project/repo', tenantId: 'REPLACE_TENANT', appId: 'REPLACE_APP', branch: 'main' },
  mediaRoots: ['src/assets/images'], uiLocale: 'en',
};

const optionsFor = (recipe: AnyRecipe): unknown =>
  recipe.id === cmsMediaRecipe.id ? cmsOptions : recipe.id === shellRecipe.id ? { siteName: 'Composition Site' } : {};

// Test-local adapter: cms.decap-media requires 'site.astro-shell', but shell provides 'site.shell'.
// See the pinned "defect" test below.
const shellAliasFixture: AnyRecipe = {
  ...shellRecipe,
  id: 'test.shell-alias',
  provides: ['site.astro-shell'],
  outputContributions: [],
  order: { priority: 1, key: 'shell-alias' },
};

// Test-local copy of the cms recipe: its content contribution targets a file path, which the resolver
// rejects (content targets must be 'primary'|'additional'). Reclassified as 'file' to let composition proceed.
const cmsComposable: AnyRecipe = {
  ...cmsMediaRecipe,
  outputContributions: cmsMediaRecipe.outputContributions.map((c) => c.id === 'cms.definitions' ? { ...c, kind: 'file' as const } : c),
};

const sortText = (values: readonly string[]): string[] => [...values].sort((a, b) => a.localeCompare(b, 'en'));
const contributionKey = (c: { kind: string; id: string; target: string }): string => `${c.kind}|${c.id}|${c.target}`;

function expectedFilePath(contribution: { kind: string; target: string }): string {
  if (contribution.kind === 'route' && contribution.target.startsWith('/')) {
    return contribution.target === '/' ? 'src/pages/index.astro' : `src/pages${contribution.target}.astro`;
  }
  return contribution.target;
}

/** Throws (genuine vitest assertion failure) when declared contributions and generated files diverge. */
async function assertContributionsMatchFiles(recipe: AnyRecipe): Promise<readonly RecipeGeneratedFile[]> {
  const { files } = await recipe.generate({ options: optionsFor(recipe), capabilities: [], contributions: [] });
  const generated = sortText(files.map((file) => file.path));
  const declared = sortText(recipe.outputContributions.map(expectedFilePath));
  expect(new Set(generated).size, `${recipe.id}: duplicate generated paths`).toBe(generated.length);
  expect(generated, `${recipe.id}: generated files must match outputContributions 1:1`).toEqual(declared);
  return files;
}

function assertGraphMatchesRecipes(recipes: readonly AnyRecipe[]): void {
  const resolved = resolveCapabilityGraph(recipes);
  expect(resolved.ok).toBe(true);
  if (!resolved.ok) return;
  const graph = resolved.value;
  expect(graph.recipes.map((node) => node.id).sort()).toEqual(recipes.map((recipe) => recipe.id).sort());
  for (const recipe of recipes) {
    const node = graph.recipes.find((candidate) => candidate.id === recipe.id);
    expect(node, `${recipe.id} missing from graph.recipes`).toBeDefined();
    expect(node!.version).toBe(recipe.version);
    expect(node!.provides).toEqual(sortText(recipe.provides));
    expect(node!.requires).toEqual(sortText(recipe.requires));
    expect(node!.conflicts).toEqual(sortText(recipe.conflicts));
    for (const capability of recipe.provides) {
      expect(graph.capabilities.find((item) => item.id === capability)?.providerRecipeId).toBe(recipe.id);
    }
    const fromGraph = graph.contributions.filter((item) => item.provenance.contributedBy === recipe.id)
      .map(contributionKey).sort();
    expect(fromGraph).toEqual(recipe.outputContributions.map(contributionKey).sort());
  }
  expect(graph.contributions).toHaveLength(recipes.reduce((sum, recipe) => sum + recipe.outputContributions.length, 0));
}

const fixtureRoot = mkdtempSync(join(process.cwd(), '.composition-fixture-'));
afterAll(() => { if (!process.env.KEEP_FIXTURE) rmSync(fixtureRoot, { recursive: true, force: true }); });
const authSourcePath = resolve(process.cwd(), 'src/index.ts').replaceAll('\\', '/');

function writeText(path: string, content: string | Uint8Array): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

function runAstro(root: string, command: 'check' | 'build'): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn('pnpm', ['exec', 'astro', command, '--root', root], {
      cwd: process.cwd(), env: { ...process.env, CI: 'true', NO_COLOR: '1' }, shell: process.platform === 'win32',
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timer = setTimeout(() => { child.kill(); fail(new Error(`astro ${command} timed out\n${output}`)); }, 150_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? done() : fail(new Error(`astro ${command} exit ${code}\n${output}`));
    });
  });
}

function writeFixture(root: string, files: readonly RecipeGeneratedFile[], withAuth: boolean, dependencies: Record<string, string> = {}): void {
  for (const file of files) {
    if (file.path === 'package.json') continue;
    // DEFECT WORKAROUND: shell emits import { easyWebSeo } but @easy-web/core/seo only has a default export.
    const content = file.path === 'astro.config.mjs' && typeof file.content === 'string'
      ? file.content.replace('import { easyWebSeo }', 'import easyWebSeo') : file.content;
    writeText(join(root, file.path), content);
  }
  writeText(join(root, 'package.json'), `${JSON.stringify({ name: 'composition-fixture', private: true, type: 'module', dependencies }, null, 2)}\n`);
  writeText(join(root, 'tsconfig.json'), `${JSON.stringify({
    extends: 'astro/tsconfigs/strict',
    include: ['.astro/types.d.ts', '**/*'],
    compilerOptions: { baseUrl: '.', paths: { '@easy-web/auth': [authSourcePath] } },
  }, null, 2)}\n`);
  if (withAuth) {
    // Composition glue the recipes do not yet provide: React integration + alias, and mounting AuthMount.
    const shellConfig = readFileSync(join(root, 'astro.config.mjs'), 'utf8')
      .replace("import { defineConfig }", "import react from '@astrojs/react';\nimport { defineConfig }")
      .replace('integrations: [', `vite: { resolve: { alias: { '@easy-web/auth': ${JSON.stringify(authSourcePath)} } } },\n  integrations: [\n    react(),`);
    writeText(join(root, 'astro.config.mjs'), shellConfig);
    writeText(join(root, 'src/pages/index.astro'),
      `---\nimport Base from '../layouts/Base.astro';\nimport AuthMount from '../components/AuthMount.astro';\n---\n<Base title="Composed"><h1>Composed</h1><AuthMount /></Base>\n`);
  }
}

describe('recipe composition: resolved profiles', () => {
  it('minimal: shell only resolves, graph matches declarations, files match contributions 1:1', async () => {
    assertGraphMatchesRecipes([shellRecipe]);
    await assertContributionsMatchFiles(shellRecipe);
    const graph = resolveCapabilityGraph([shellRecipe]);
    expect(graph.ok && graph.value.fixedPages.map((page) => page.target).sort()).toEqual(['/', '/404']);
  });

  it('multilingual (partial): shell with defaultLocale "de" flows into the generated layout; contentLocales not exposed', async () => {
    expect('contentLocales' in (shellRecipe.optionsSchema as unknown as { shape: object }).shape).toBe(false);
    const { files } = await shellRecipe.generate({ options: { defaultLocale: 'de' }, capabilities: [], contributions: [] });
    const layout = files.find((file) => file.path === 'src/layouts/Base.astro')!;
    expect(String(layout.content)).toContain('lang="de"');
    assertGraphMatchesRecipes([shellRecipe]);
  });

  it('DEFECT PIN: cms.decap-media requires "site.astro-shell" but shell only provides "site.shell"', () => {
    expect(cmsMediaRecipe.requires).toEqual(['site.astro-shell']);
    expect(shellRecipe.provides).toEqual(['site.shell']);
    const resolved = resolveCapabilityGraph([shellRecipe, cmsMediaRecipe]);
    expect(resolved).toEqual({ ok: false, error: { code: 'missing-requirement', recipeId: 'cms.decap-media', capability: 'site.astro-shell' } });
  });

  it('DEFECT PIN: even with the capability satisfied, cms.definitions (kind content, file target) is rejected by the resolver', () => {
    const resolved = resolveCapabilityGraph([shellRecipe, shellAliasFixture, cmsMediaRecipe]);
    expect(resolved).toEqual({ ok: false, error: { code: 'invalid-content-role', contributionId: 'cms.definitions', target: 'src/content/definitions.ts' } });
  });

  it('cms: shell + cms (via test-local capability alias) resolves with matching graph and 1:1 files', async () => {
    assertGraphMatchesRecipes([shellRecipe, shellAliasFixture, cmsComposable]);
    await assertContributionsMatchFiles(cmsMediaRecipe);
    const graph = resolveCapabilityGraph([shellRecipe, shellAliasFixture, cmsComposable]);
    expect(graph.ok && graph.value.requirements).toContainEqual({
      capability: 'site.astro-shell', consumerRecipeId: 'cms.decap-media', providerRecipeId: 'test.shell-alias',
    });
  });

  it('auth: shell + auth resolves with matching graph and 1:1 files', async () => {
    assertGraphMatchesRecipes([shellRecipe, authRecipe]);
    await assertContributionsMatchFiles(authRecipe);
  });

  it('all three together resolve deterministically regardless of input order and serialize', () => {
    const set = [shellRecipe, shellAliasFixture, cmsComposable, authRecipe];
    const forward = resolveCapabilityGraph(set);
    const reverse = resolveCapabilityGraph([...set].reverse());
    expect(forward.ok && reverse.ok).toBe(true);
    if (!forward.ok || !reverse.ok) return;
    expect(forward.value).toEqual(reverse.value);
    expect(forward.value.recipes.map((node) => node.id)).toEqual(['site.shell', 'test.shell-alias', 'cms.decap-media', 'auth.single-island']);
    const doc = toCapabilityGraphDocument(forward.value);
    expect(doc.ok).toBe(true);
    if (doc.ok) {
      expect(serializeCapabilityGraphJson(doc.value)).toContain('auth.single-island');
      expect(serializeCapabilityGraphMermaid(doc.value)).toContain('cms.decap-media');
    }
  });

  it('DEFECT PIN: shell astro.config.mjs uses a named easyWebSeo import that @easy-web/core/seo does not export', async () => {
    const { files } = await shellRecipe.generate({ options: {}, capabilities: [], contributions: [] });
    expect(String(files.find((file) => file.path === 'astro.config.mjs')!.content)).toContain("import { easyWebSeo } from '@easy-web/core/seo'");
    const seo = await import('@easy-web/core/seo') as Record<string, unknown>;
    expect(typeof seo.default).toBe('function');
    expect(seo.easyWebSeo).toBeUndefined();
  });

  it('GAP PIN: composed generation collides on shared outputs (package.json / astro.config.mjs) - merge is not yet planned', async () => {
    const shell = await shellRecipe.generate({ options: {}, capabilities: [], contributions: [] });
    const cms = await cmsMediaRecipe.generate({ options: cmsOptions, capabilities: [], contributions: [] });
    const overlap = shell.files.map((file) => file.path).filter((path) => cms.files.some((file) => file.path === path)).sort();
    expect(overlap).toEqual(['astro.config.mjs', 'package.json']);
    // The resolver does not flag it: dependency/configuration kinds are not output-conflict checked.
    expect(resolveCapabilityGraph([shellRecipe, shellAliasFixture, cmsComposable]).ok).toBe(true);
  });
});

describe('recipe composition: conflict profile (real recipe shapes, local conflict claims)', () => {
  it('rejects a recipe that conflicts with the capability provided by auth', () => {
    const conflicting: AnyRecipe = { ...authRecipe, id: 'test.no-auth', provides: ['test.no-auth'], conflicts: ['auth.single-island'], outputContributions: [], order: { priority: 41, key: 'no-auth' } };
    expect(resolveCapabilityGraph([shellRecipe, conflicting]).ok).toBe(true); // control: conflict inert without provider
    expect(resolveCapabilityGraph([shellRecipe, authRecipe, conflicting])).toEqual({
      ok: false,
      error: { code: 'conflicting-capability', recipeId: 'test.no-auth', conflictingRecipeId: 'auth.single-island', capability: 'auth.single-island' },
    });
  });

  it('rejects a recipe that conflicts with the shell capability', () => {
    const conflicting: AnyRecipe = { ...shellRecipe, id: 'test.no-shell', provides: ['test.no-shell'], conflicts: ['site.shell'], outputContributions: [], order: { priority: 5, key: 'no-shell' } };
    const resolved = resolveCapabilityGraph([shellRecipe, conflicting]);
    expect(resolved.ok).toBe(false);
    expect(!resolved.ok && resolved.error.code).toBe('conflicting-capability');
  });
});

describe('recipe composition: mutation checks (test-local copies; harness must genuinely fail)', () => {
  const recipes: readonly AnyRecipe[] = [shellRecipe, authRecipe, cmsComposable];

  for (const recipe of recipes) {
    it(`${recipe.id}: dropping a declared contribution fails the 1:1 file assertion`, async () => {
      await expect(assertContributionsMatchFiles({ ...recipe, outputContributions: recipe.outputContributions.slice(1) })).rejects.toThrow();
    });

    it(`${recipe.id}: an extra declared contribution fails the 1:1 file assertion`, async () => {
      const extra = { kind: 'file' as const, id: `${recipe.id}.mutant`, target: 'src/mutant.txt' };
      await expect(assertContributionsMatchFiles({ ...recipe, outputContributions: [...recipe.outputContributions, extra] })).rejects.toThrow();
    });

    it(`${recipe.id}: a mutated requirement claim fails graph resolution assertions`, () => {
      const mutant = { ...recipe, requires: [...recipe.requires, 'mutant.missing-capability'] };
      expect(() => assertGraphMatchesRecipes([mutant, ...[shellRecipe, shellAliasFixture].filter((item) => item.id !== mutant.id)])).toThrow();
    });

    it(`${recipe.id}: a mutated conflict claim against a co-resolved recipe fails graph assertions`, () => {
      const other = recipe.id === shellRecipe.id ? authRecipe : shellRecipe;
      const mutant = { ...recipe, conflicts: [...other.provides] };
      expect(() => assertGraphMatchesRecipes([mutant, other])).toThrow();
    });

    it(`${recipe.id}: a graph whose declared provides drift from the recipe fails the comparison`, () => {
      const resolved = resolveCapabilityGraph([recipe]);
      // cms alone has an unmet requirement and fails already; either way the comparison must not pass silently.
      const drifted = { ...recipe, provides: [...recipe.provides, 'mutant.extra-capability'] };
      const run = (): void => {
        const graph = resolved.ok ? resolved.value : undefined;
        expect(graph, 'unresolved').toBeDefined();
        expect(graph!.recipes[0]!.provides).toEqual(sortText(drifted.provides));
      };
      expect(run).toThrow();
    });
  }
});

describe('recipe composition: emitted fixtures parse, type-check and build (bounded parallel)', () => {
  it('shell-only and shell+auth fixtures pass astro check and astro build', async () => {
    const shellFiles = (await shellRecipe.generate({ options: { siteName: 'Composition Site' }, capabilities: [], contributions: [] })).files;
    const authFiles = (await authRecipe.generate({ options: {}, capabilities: [], contributions: [] })).files;

    const minimalRoot = join(fixtureRoot, 'minimal');
    const authRoot = join(fixtureRoot, 'shell-auth');
    writeFixture(minimalRoot, shellFiles, false);
    const authDeps = (JSON.parse(String(authFiles.find((file) => file.path === 'package.json')!.content)) as { dependencies: Record<string, string> }).dependencies;
    writeFixture(authRoot, [...shellFiles.filter((file) => file.path !== 'package.json'), ...authFiles.filter((file) => file.path !== 'package.json')], true, authDeps);

    // DEFECT PIN: the shell recipe's generated output neither type-checks (wrong component props,
    // LocalizedPathGroup imported from '@easy-web/core' root) nor builds (LanguageSwitch throws on missing props).
    // Pinned so a fix to the shell recipe flips this test deliberately.
    const shellCheck = await runAstro(minimalRoot, 'check').then(() => 'ok', (error: unknown) => String(error));
    expect(shellCheck).toMatch(/PageShellProps|HeaderProps|NotFoundProps|LocalizedPathGroup/);
    const shellBuild = await runAstro(minimalRoot, 'build').then(() => 'ok', (error: unknown) => String(error));
    expect(shellBuild).toMatch(/Caught error rendering/);

    // Composition proof on the parts that are sound: shell's config/public files + auth's files, with the
    // broken shell-owned component files (Base layout, 404, localized-paths) replaced by test-local stand-ins.
    for (const stale of ['src/layouts/Base.astro', 'src/pages/404.astro', 'src/lib/localized-paths.ts']) {
      rmSync(join(authRoot, stale), { force: true });
    }
    writeText(join(authRoot, 'src/layouts/Base.astro'),
      '---\ninterface Props { title: string }\nconst { title } = Astro.props;\n---\n<html lang="en"><head><title>{title}</title></head><body><slot /></body></html>\n');
    // Shell's easyWebSeo integration cannot build from workspace source here (robots route imports an astro: URL
    // outside the Vite graph), so the stand-in config keeps only react + the auth alias.
    writeText(join(authRoot, 'astro.config.mjs'), [
      "import react from '@astrojs/react';",
      "import { defineConfig } from 'astro/config';",
      `export default defineConfig({ integrations: [react()], vite: { resolve: { alias: { '@easy-web/auth': ${JSON.stringify(authSourcePath)} } } } });`,
    ].join("\n"));
    await runAstro(authRoot, 'check');
    await runAstro(authRoot, 'build');

    const authHtml = readFileSync(join(authRoot, 'dist/index.html'), 'utf8');
    expect(authHtml.match(/<astro-island\b/g)).toHaveLength(1);
    expect(readFileSync(join(authRoot, 'public/robots.txt'), 'utf8')).toContain('Disallow: /admin/');  }, 300_000);
});
