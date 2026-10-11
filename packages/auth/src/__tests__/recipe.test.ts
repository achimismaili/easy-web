import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RecipeGeneratedFile } from '@easy-web/core/recipes';
import { authRecipe, validateSingleAuthIsland } from '../recipe';

const fixtureRoot = mkdtempSync(join(process.cwd(), '.auth-recipe-fixture-'));
const enabledRoot = join(fixtureRoot, 'enabled');
const disabledRoot = join(fixtureRoot, 'disabled');
const authSourcePath = resolve(process.cwd(), 'src/index.ts').replaceAll('\\', '/');

function writeText(path: string, content: string): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function writeFixture(root: string, files: readonly RecipeGeneratedFile[]): void {
  const dependencyFragment = files.find((file) => file.path === 'package.json');
  const dependencies = dependencyFragment && typeof dependencyFragment.content === 'string'
    ? JSON.parse(dependencyFragment.content) as { dependencies?: Record<string, string> }
    : {};

  writeText(join(root, 'package.json'), `${JSON.stringify({
    name: `auth-recipe-${root === enabledRoot ? 'enabled' : 'disabled'}-fixture`,
    private: true,
    type: 'module',
    dependencies: dependencies.dependencies ?? {},
  }, null, 2)}\n`);
  writeText(join(root, 'tsconfig.json'), `${JSON.stringify({
    extends: 'astro/tsconfigs/strict',
    include: ['.astro/types.d.ts', '**/*'],
    compilerOptions: {
      baseUrl: '.',
      paths: { '@easy-web/auth': [authSourcePath] },
    },
  }, null, 2)}\n`);
  const hasAuth = files.some((file) => file.path === 'src/components/AuthMount.astro');
  writeText(join(root, 'astro.config.mjs'), hasAuth
    ? `import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@easy-web/auth': ${JSON.stringify(authSourcePath)},
      },
    },
  },
});
`
    : `import { defineConfig } from 'astro/config';\nexport default defineConfig({});\n`);

  for (const file of files) {
    if (file.path === 'package.json') continue;
    writeText(join(root, file.path), typeof file.content === 'string'
      ? file.content
      : Buffer.from(file.content).toString('utf8'));
  }

  const page = files.some((file) => file.path === 'src/components/AuthMount.astro')
    ? `---\nimport AuthMount from '../components/AuthMount.astro';\n---\n<html><body><AuthMount /></body></html>\n`
    : '<html><body><main>Static fixture</main></body></html>\n';
  writeText(join(root, 'src/pages/index.astro'), page);
}

function runAstro(root: string, ...args: string[]): string {
  const result = spawnSync('pnpm', ['exec', 'astro', ...args, '--root', root], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', NO_COLOR: '1' },
  });
  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`.trim());
  }
  return result.stdout;
}

describe('single-island auth recipe fixtures', () => {
  let generated: Awaited<ReturnType<typeof authRecipe.generate>>;

  beforeAll(async () => {
    generated = await authRecipe.generate({ options: {}, capabilities: [], contributions: [] });
    writeFixture(enabledRoot, generated.files);
    writeFixture(disabledRoot, []);
  });

  afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  it('builds an auth-enabled Astro fixture with exactly one auth root and island', () => {
    expect(validateSingleAuthIsland(generated.files)).toEqual([]);

    runAstro(enabledRoot, 'check');
    runAstro(enabledRoot, 'build');

    const shell = readFileSync(join(enabledRoot, 'src/components/AuthShell.tsx'), 'utf8');
    const mount = readFileSync(join(enabledRoot, 'src/components/AuthMount.astro'), 'utf8');
    const html = readFileSync(join(enabledRoot, 'dist/index.html'), 'utf8');
    expect(shell.match(/<AuthProvider\b/g)).toHaveLength(1);
    expect(mount.match(/client:only=["']react["']/g)).toHaveLength(1);
    expect(html.match(/<astro-island\b/g)).toHaveLength(1);
  }, 60_000);

  it('emits no React, auth, shell, or SWA auth artifact when the recipe is not selected', () => {
    runAstro(disabledRoot, 'build');
    const packageJson = readFileSync(join(disabledRoot, 'package.json'), 'utf8');
    const html = readFileSync(join(disabledRoot, 'dist/index.html'), 'utf8');
    const disabledFiles = ['package.json', 'src/pages/index.astro'];
    expect(packageJson).not.toMatch(/@easy-web\/auth|@astrojs\/react|react-dom/);
    expect(html).not.toMatch(/astro-island|easy-web-auth|\.auth\/login|\.auth\/logout/);
    expect(disabledFiles).not.toContain('src/components/AuthShell.tsx');
    expect(disabledFiles).not.toContain('src/components/AuthMount.astro');
    expect(disabledFiles).not.toContain('staticwebapp.config.json');
  }, 60_000);

  it('rejects a mutation that duplicates the auth-bearing Astro island', () => {
    const mount = generated.files.find((file) => file.path === 'src/components/AuthMount.astro');
    expect(mount).toBeDefined();
    const mutated = [...generated.files, { ...mount!, path: 'src/components/AuthMountDuplicate.astro' }];
    expect(validateSingleAuthIsland(mutated)).toContainEqual(expect.objectContaining({
      code: 'auth-single-island',
      message: expect.stringContaining('found 2'),
    }));
  });

  it('contains only explicit placeholders and no credential-shaped values', () => {
    const output = generated.files
      .map((file) => typeof file.content === 'string' ? file.content : Buffer.from(file.content).toString())
      .join('\n');
    expect(output).toContain('REPLACE_WITH_YOUR_CLIENT_ID');
    expect(output).toContain('REPLACE_WITH_YOUR_TENANT_ID');
    expect(output).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
    expect(output).not.toMatch(/(?:clientSecret|client_secret)\s*[:=]/i);
  });
});
