import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.env.npm_execpath;
assert(pnpm?.includes('pnpm'), 'Run with pnpm compat:cli-minimum');
assert(Number(process.versions.node.split('.')[0]) >= 24, 'CLI consumers require Node >=24');
const environment = {
  ...process.env,
  PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH}`,
  CI: 'true',
  ASTRO_TELEMETRY_DISABLED: '1',
  GIT_AUTHOR_NAME: 'CLI Minimum Consumer',
  GIT_AUTHOR_EMAIL: 'cli-minimum@example.invalid',
  GIT_COMMITTER_NAME: 'CLI Minimum Consumer',
  GIT_COMMITTER_EMAIL: 'cli-minimum@example.invalid',
};

function run(cwd, executable, args) {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, { cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timer = setTimeout(() => {
      child.kill();
      fail(new Error(`${executable} ${args.join(' ')} timed out\n${output}`));
    }, 180_000);
    child.once('error', (error) => { clearTimeout(timer); fail(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) done(output);
      else fail(new Error(`${executable} ${args.join(' ')} exited ${code}\n${output}`));
    });
  });
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const install = (cwd) => run(cwd, process.execPath, [pnpm, 'install', '--ignore-workspace', '--no-frozen-lockfile']);

async function installedPackage(consumer, name, version) {
  const root = join(consumer, 'node_modules', ...name.split('/'));
  assert.equal((await readJson(join(root, 'package.json'))).version, version, `${name} minimum runtime`);
  const location = relative(repository, await realpath(root));
  assert(isAbsolute(location) || location.startsWith(`..${sep}`), `${name} must not resolve into the repository`);
  return root;
}

async function generator(root) {
  const archives = join(root, 'archives');
  await mkdir(archives);
  const dependencies = {};
  const versions = {};
  for (const directory of ['core', 'easy-web-cms-adapters', 'auth', 'easy-web-cli']) {
    const packageRoot = join(repository, 'packages', directory);
    const manifest = await readJson(join(packageRoot, 'package.json'));
    await run(packageRoot, process.execPath, [pnpm, 'pack', '--pack-destination', archives]);
    dependencies[manifest.name] = `file:${join(archives, `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`).replaceAll('\\', '/')}`;
    versions[manifest.name] = manifest.version;
  }
  const tool = join(root, 'generator');
  await mkdir(tool);
  // Overrides are confined to the creation tool, never the generated runtime consumers.
  await writeJson(join(tool, 'package.json'), {
    private: true, type: 'module', dependencies, pnpm: { overrides: dependencies },
  });
  await install(tool);
  for (const [name, version] of Object.entries(versions)) await installedPackage(tool, name, version);
  const cli = join(tool, 'node_modules', '@easy-web', 'cli', 'dist', 'bin.js');
  return { cli, tool };
}

const backend = {
  repo: 'EXAMPLE/LOCAL-TRIAL/NOT-A-LIVE-REPOSITORY',
  tenantId: 'PLACEHOLDER_TENANT', appId: 'PLACEHOLDER_APP', branch: 'main',
};
const profiles = [
  { name: 'shell', core: '1.5.0', noIndex: false },
  { name: 'content-basic', core: '1.6.0', content: true, noIndex: false },
  { name: 'content-images', core: '1.6.0', content: true, images: true, noIndex: true },
  { name: 'cms-basic', core: '1.9.0', content: true, cms: true, noIndex: false },
  { name: 'cms-images', core: '1.9.0', content: true, cms: true, images: true, noIndex: true },
];

async function consume(root, cli, profile) {
  const config = {
    target: join(root, profile.name),
    recipes: {
      shell: { siteName: 'Synthetic motorcycle catalogue', defaultLocale: 'de', noIndex: profile.noIndex },
      ...(profile.cms ? { cms: { backend, mediaRoots: ['src/assets/images'], uiLocale: 'de' } } : {}),
    },
    ...(profile.content ? { composition: {
      contentLocales: ['de'],
      contentTypes: [{
        id: 'bikes', primary: true, labels: { de: 'Motorcycles' }, routes: { de: '/bikes/' },
        traits: ['title', 'slug', 'body', ...(profile.images ? ['summary', 'image'] : [])],
        bindings: ['list', 'detail', 'navigation', ...(profile.cms ? ['cms-admin'] : [])],
      }],
    } } : {}),
  };
  const configPath = join(root, `${profile.name}.json`);
  await writeJson(configPath, config);
  const result = JSON.parse(await run(root, process.execPath, [cli, 'create', '--config', configPath, '--no-install', '--json']));
  assert.equal(result.schemaVersion, 1);
  const target = result.target;
  const manifestPath = join(target, 'package.json');
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.dependencies['@easy-web/core'], `^${profile.core}`);
  assert.equal(manifest.dependencies['@easy-web/cms-adapters'], profile.cms ? '^1.9.0' : undefined);
  assert.equal(manifest.dependencies.sharp, profile.images || profile.cms ? '^0.35.0' : undefined);
  assert.equal(manifest.pnpm, undefined, 'Generated sites must not bypass dependency policies');
  const workspace = await readFile(join(target, 'pnpm-workspace.yaml'), 'utf8');
  assert.equal(workspace, 'allowBuilds:\n  esbuild: true\n  sharp: true\n');
  // Pin only first-party runtime floors for this test; normal generation retains caret ranges.
  manifest.dependencies['@easy-web/core'] = profile.core;
  if (profile.cms) manifest.dependencies['@easy-web/cms-adapters'] = '1.9.0';
  await writeJson(manifestPath, manifest);
  if (profile.cms && profile.images) {
    const entryPath = join(target, 'src', 'content', 'bikes', 'example.md');
    await writeFile(entryPath, (await readFile(entryPath, 'utf8'))
      .replace('../../assets/images/content-example.svg', '/src/assets/images/content-example.svg')
      + '\n![CMS body image](/src/assets/images/content-example.svg)\n');
  }
  await install(target);
  const core = await installedPackage(target, '@easy-web/core', profile.core);
  if (profile.content) {
    const traits = await readFile(join(core, 'dist', 'contracts', 'traits.js'), 'utf8');
    assert(traits.includes('titleTraitSchema') && traits.includes('slugTraitSchema'));
  }
  if (profile.cms) {
    const cms = await installedPackage(target, '@easy-web/cms-adapters', '1.9.0');
    assert((await readFile(join(cms, 'dist', 'index.js'), 'utf8')).includes('buildContentCompositionDecapConfig'));
  }
  const check = await run(target, process.execPath, [pnpm, 'typecheck']);
  assert(check.includes('0 errors'), check);
  await run(target, process.execPath, [pnpm, 'build']);
  const output = (...parts) => readFile(join(target, 'dist', ...parts), 'utf8');
  const home = await output('index.html');
  assert(home.includes('<html lang="de"'));
  const robots = await output('robots.txt');
  assert.equal(robots.includes('Disallow: /\n'), profile.noIndex);
  assert.equal(robots.includes('Sitemap:'), !profile.noIndex);
  if (profile.content) {
    const list = await output('bikes', 'index.html');
    const detail = await output('bikes', 'example', 'index.html');
    assert(list.includes('href="/bikes/example/"'));
    assert(detail.includes('Ersetze diesen Beispielinhalt'));
    assert(detail.includes('https://replace-with-your-domain.example/bikes/example/'));
    for (const page of [home, list, detail]) {
      assert(page.includes('href="/bikes/"'));
      assert.equal(/name="robots" content="noindex, nofollow"/.test(page), profile.noIndex);
    }
    if (profile.images) assert.match(detail, /src="\/_astro\/content-example[^"]*\.svg"/);
    if (profile.cms) {
      const admin = await output('admin', 'index.html');
      assert(admin.includes('name="robots" content="noindex"'));
      assert(admin.includes('window.CMS_MANUAL_INIT = true'));
      assert(!admin.includes('MsalProvider'));
      const match = admin.match(/window\.initCMS\(\{ config: ([\s\S]*?) \}\);/);
      assert(match, 'Built CMS configuration is required');
      const editor = JSON.parse(match[1]);
      assert.equal(editor.locale, 'de');
      assert.equal(editor.collections[0].folder, 'src/content/bikes');
      assert.deepEqual(editor.collections[0].fields.map(({ name }) => name),
        ['title', 'slug', ...(profile.images ? ['summary', 'image'] : []), 'body']);
      assert.equal(editor.public_folder, '/src/assets/images');
      if (profile.images) {
        assert((await output('src', 'assets', 'images', 'content-example.svg')).includes('<svg'));
        assert(detail.includes('alt="CMS body image"'));
        assert(!detail.includes('src="/src/assets'));
      }
      if (!profile.noIndex) assert(!(await output('sitemap-0.xml')).includes('/admin'));
    }
  }
  process.stdout.write(`${profile.name}: packed CLI -> registry core ${profile.core}${profile.cms ? ' / CMS 1.9.0' : ''}; typecheck/build and output assertions passed\n`);
}

async function consumeMediaRecipe(root, tool) {
  const target = join(root, 'standalone-media');
  await mkdir(target);
  const generated = JSON.parse(await run(tool, process.execPath, ['--input-type=module', '-e', `
    import { cmsMediaRecipe } from '@easy-web/cms-adapters';
    const options = cmsMediaRecipe.optionsSchema.parse({
      composition: { contentLocales: ['en'], contentTypes: [{
        id: 'bikes', labels: { en: 'Motorcycles' }, routes: { en: '/bikes/' },
        traits: ['title', 'slug', 'body', 'image'], bindings: ['list', 'detail', 'cms-admin'],
      }] },
      backend: ${JSON.stringify(backend)}, mediaRoots: ['src/assets/images'], uiLocale: 'en',
    });
    console.log(JSON.stringify(await cmsMediaRecipe.generate({ options, capabilities: [], contributions: [] })));
  `]));
  for (const file of generated.files) {
    const path = join(target, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content);
  }
  const manifestPath = join(target, 'package.json');
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.dependencies['@easy-web/core'], '^1.6.0');
  assert.equal(manifest.dependencies['@easy-web/cms-adapters'], '^1.6.0');
  assert.equal(manifest.dependencies['@astrojs/markdown-remark'], '^7.3.1');
  manifest.dependencies['@easy-web/core'] = '1.6.0';
  manifest.dependencies['@easy-web/cms-adapters'] = '1.6.0';
  await writeJson(manifestPath, {
    ...manifest, private: true, type: 'module',
    devDependencies: { '@astrojs/check': '^0.9.4', typescript: '^5.5.0' },
    scripts: { typecheck: 'astro check', build: 'astro build' },
  });
  await writeJson(join(target, 'tsconfig.json'), { extends: 'astro/tsconfigs/strict' });
  await mkdir(join(target, 'src', 'pages'), { recursive: true });
  await mkdir(join(target, 'src', 'content', 'bikes'), { recursive: true });
  await mkdir(join(target, 'src', 'assets', 'images'), { recursive: true });
  await writeFile(join(target, 'src', 'assets', 'images', 'example.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>');
  await writeFile(join(target, 'src', 'content', 'bikes', 'example.md'),
    '---\ntitle: Example\nslug: example\nimage:\n  src: /src/assets/images/example.svg\n  alt: Example\n---\n\n![Body image](/src/assets/images/example.svg)\n');
  await writeFile(join(target, 'src', 'pages', 'index.astro'),
    '---\nimport { getCollection, render } from "astro:content";\nconst [entry] = await getCollection("bikes");\nconst { Content } = await render(entry);\n---\n<html><body><Content /></body></html>');
  await install(target);
  await installedPackage(target, '@easy-web/core', '1.6.0');
  await installedPackage(target, '@easy-web/cms-adapters', '1.6.0');
  const check = await run(target, process.execPath, [pnpm, 'typecheck']);
  assert(check.includes('0 errors'), check);
  await run(target, process.execPath, [pnpm, 'build']);
  assert((await readFile(join(target, 'dist', 'src', 'assets', 'images', 'example.svg'), 'utf8')).includes('<svg'));
  process.stdout.write('standalone-media: packed recipe -> registry core/CMS 1.6.0; typecheck/build and media preview passed\n');
}

const root = await mkdtemp(join(tmpdir(), 'easy-web-cli-minimum-'));
try {
  process.stdout.write(`CLI minimum-runtime consumers on Node ${process.versions.node}\n`);
  const { cli, tool } = await generator(root);
  for (const profile of profiles) await consume(root, cli, profile);
  await consumeMediaRecipe(root, tool);
} finally {
  await rm(root, { recursive: true, force: true });
}
