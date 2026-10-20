import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RecipeGeneratedFile } from '@easy-web/core/recipes';
import { cmsMediaRecipe } from '../recipe.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-media-recipe-'));
const packageSource = path.resolve(process.cwd(), 'src/index.ts').replaceAll('\\', '/');
const coreSource = path.resolve(process.cwd(), '../core/src').replaceAll('\\', '/');

function write(file: string, content: string | Uint8Array): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeGenerated(files: readonly RecipeGeneratedFile[]): void {
  for (const file of files) {
    if (file.path === 'package.json') continue;
    write(path.join(root, file.path), file.content);
  }
  write(path.join(root, 'package.json'), `${JSON.stringify({ name: 'cms-media-recipe-fixture', private: true, type: 'module' }, null, 2)}\n`);
  fs.symlinkSync(path.resolve(process.cwd(), 'node_modules'), path.join(root, 'node_modules'), 'junction');
  write(path.join(root, 'tsconfig.json'), `${JSON.stringify({
    extends: 'astro/tsconfigs/strict', include: ['.astro/types.d.ts', '**/*'],
    compilerOptions: { baseUrl: '.', paths: {
      '@easy-web/cms-adapters': [packageSource],
      '@easy-web/core/*': [`${coreSource}/*/index.ts`],
    } },
  }, null, 2)}\n`);
  write(path.join(root, 'src/content/articles/example.md'), `---\ntitle: Example\nslug: example\nimage:\n  src: /src/assets/images/example.svg\n  alt: Example\nfeatured: true\n---\n\n![Body image](/src/assets/images/example.svg)\n`);
  write(path.join(root, 'src/assets/images/example.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>');
  write(path.join(root, 'src/pages/index.astro'), '<html><body>CMS fixture</body></html>');
}

function runAstro(command: 'check' | 'build'): void {
  const result = spawnSync('pnpm', ['exec', 'astro', command, '--root', root], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, CI: 'true', NO_COLOR: '1' },
  });
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`.trim());
}

describe('CMS media recipe fixture', () => {
  let generated: Awaited<ReturnType<typeof cmsMediaRecipe.generate>>;

  beforeAll(async () => {
    generated = await cmsMediaRecipe.generate({ options: {
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
    }, capabilities: [], contributions: [] });
    writeGenerated(generated.files);
  });

  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it('generates typed definitions, schema, paired media paths, standalone admin, and markdown integration', () => {
    const output = generated.files.map((file) => `${file.path}\n${String(file.content)}`).join('\n');
    expect(output).toContain("mediaFolder = \"src/assets/images\"");
    expect(output).toContain("publicFolder = \"/src/assets/images\"");
    expect(output).toContain("from '@easy-web/core/markdown'");
    expect(output).toContain('remarkPlugins: [easyWebMarkdown]');
    expect(output).toContain('easyWebCmsPreviewAssets');
    expect(fs.existsSync(path.join(root, 'public/admin/index.html'))).toBe(true);
    const config = JSON.parse(fs.readFileSync(path.join(root, 'public/admin/config.yml'), 'utf8')) as { collections: unknown[] };
    expect(config.collections).toHaveLength(1);
    const admin = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');
    expect(admin).toContain('/admin/config.yml');
    expect(admin).not.toMatch(/Msal|AuthProvider|@easy-web\/auth/);
    const manifest = JSON.parse(String(generated.files.find(({ path }) => path === 'package.json')?.content));
    expect(manifest.dependencies['@easy-web/core']).toBe('^1.6.0');
    expect(manifest.dependencies['@easy-web/cms-adapters']).toBe('^1.6.0');
    expect(manifest.dependencies['@astrojs/markdown-remark']).toBe('^7.3.1');
    expect(cmsMediaRecipe.compatibleRuntimeRange).toBe('^1.6.0');
  });

  it('passes astro check and build with a Decap body image', () => {
    runAstro('check');
    runAstro('build');
    expect(fs.existsSync(path.join(root, 'dist/src/assets/images/example.svg'))).toBe(true);
  }, 60_000);
});
