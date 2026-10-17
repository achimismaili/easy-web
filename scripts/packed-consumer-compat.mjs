import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(repository, 'apps', 'compat-fixture');
const packageDirectories = [
  'core',
  'easy-web-cms-adapters',
  'easy-web-content-blocks',
  'easy-web-markdown',
  'i18n',
  'seo',
  'theme-core',
];

class CompatibilityError extends Error {
  name = 'CompatibilityError';

  constructor(testCase, message, options) {
    super(`${testCase}: ${message}`, options);
    this.testCase = testCase;
  }
}

function run(testCase, cwd, command, args) {
  return new Promise((resolvePromise, reject) => {
    const windowsShim = process.platform === 'win32' && command === 'pnpm';
    const executable = windowsShim ? (process.env.ComSpec ?? 'cmd.exe') : command;
    const executableArgs = windowsShim ? ['/d', '/s', '/c', 'pnpm.cmd', ...args] : args;
    const child = spawn(executable, executableArgs, {
      cwd,
      stdio: 'inherit',
    });
    child.once('error', (error) => reject(new CompatibilityError(testCase, `could not start ${command}`, { cause: error })));
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new CompatibilityError(testCase, `${command} exited with ${String(code)}${signal ? ` (${signal})` : ''}`));
    });
  });
}

function parseArguments(argv) {
  const packIndex = argv.indexOf('--pack-only');
  const archivesIndex = argv.indexOf('--archives');
  const astroIndex = argv.indexOf('--astro');
  const nodeIndex = argv.indexOf('--node');
  const packDestination = packIndex >= 0 ? argv[packIndex + 1] : undefined;
  const archiveDirectory = archivesIndex >= 0 ? argv[archivesIndex + 1] : undefined;
  if (packDestination) return { kind: 'pack', destination: resolve(packDestination) };
  const astro = astroIndex >= 0 ? argv[astroIndex + 1] : undefined;
  const node = nodeIndex >= 0 ? argv[nodeIndex + 1] : undefined;
  if (!astro || !/^\d+\.\d+\.\d+$/.test(astro)) throw new CompatibilityError('arguments', '--astro must be an exact version');
  if (!node || !/^\d+\.\d+\.\d+$/.test(node)) throw new CompatibilityError('arguments', '--node must be an exact minimum version');
  return { kind: 'consume', astro, node, archiveDirectory: archiveDirectory ? resolve(archiveDirectory) : undefined };
}

function assertNode(testCase, minimum) {
  const actual = process.versions.node.split('.').map(Number);
  const required = minimum.split('.').map(Number);
  const supported = actual[0] > required[0]
    || (actual[0] === required[0] && actual[1] > required[1])
    || (actual[0] === required[0] && actual[1] === required[1] && actual[2] >= required[2]);
  if (!supported) throw new CompatibilityError(testCase, `Node ${process.versions.node} does not satisfy >=${minimum}`);
}

async function packPackages(testCase, archiveDirectory, build) {
  const archives = new Map();
  await mkdir(archiveDirectory, { recursive: true });
  for (const directory of packageDirectories) {
    const packageRoot = join(repository, 'packages', directory);
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    if (build) await run(`${testCase} build ${manifest.name}`, packageRoot, 'pnpm', ['build']);
    await run(`${testCase} pack ${manifest.name}`, packageRoot, 'pnpm', ['pack', '--pack-destination', archiveDirectory]);
    const archive = join(archiveDirectory, `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`);
    archives.set(manifest.name, { archive, version: manifest.version });
    process.stdout.write(`Packed ${manifest.name}@${manifest.version}: ${archive}\n`);
  }
  return archives;
}

async function packedPackages(archiveDirectory) {
  const archives = new Map();
  for (const directory of packageDirectories) {
    const manifest = JSON.parse(await readFile(join(repository, 'packages', directory, 'package.json'), 'utf8'));
    archives.set(manifest.name, {
      archive: join(archiveDirectory, `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`),
      version: manifest.version,
    });
  }
  return archives;
}

async function writeConsumer(testCase, consumer, archives, astro) {
  await cp(fixture, consumer, {
    recursive: true,
    filter: (source) => !['node_modules', 'dist', '.astro', '.turbo', 'test', 'package.json', 'CHANGELOG.md'].includes(basename(source)),
  });
  const dependencies = Object.fromEntries([...archives].map(([name, packed]) => [name, `file:${packed.archive.replaceAll('\\', '/')}`]));
  await writeFile(join(consumer, 'package.json'), `${JSON.stringify({
    name: 'easy-web-packed-compat-consumer',
    private: true,
    type: 'module',
    scripts: { build: 'astro build' },
    pnpm: { overrides: dependencies },
    dependencies: {
      ...dependencies,
      '@astrojs/markdown-remark': '7.3.2',
      '@inlang/paraglide-js': '2.18.1',
      astro,
      zod: '4.6.5',
    },
    packageManager: 'pnpm@10.34.4',
  }, null, 2)}\n`);
  await writeFile(join(consumer, 'tsconfig.json'), '{"extends":"astro/tsconfigs/strict","include":[".astro/types.d.ts","**/*"],"exclude":["dist"]}\n');
  process.stdout.write(`Created isolated consumer for ${testCase}: ${consumer}\n`);
}

async function assertPackages(testCase, consumer, archives) {
  for (const [name, packed] of archives) {
    const packageRoot = join(consumer, 'node_modules', ...name.split('/'));
    const installedRoot = await realpath(packageRoot);
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    if (manifest.version !== packed.version) {
      throw new CompatibilityError(testCase, `${name} expected ${packed.version}, installed ${String(manifest.version)}`);
    }
    if (installedRoot.startsWith(repository)) {
      throw new CompatibilityError(testCase, `${name}@${packed.version} resolved to workspace path ${installedRoot}`);
    }
    process.stdout.write(`Installed ${name}@${packed.version} from ${packed.archive}\n`);
  }
}

async function assertOutput(testCase, consumer) {
  const html = await readFile(join(consumer, 'dist', 'index.html'), 'utf8');
  const admin = await readFile(join(consumer, 'dist', 'admin', 'index.html'), 'utf8');
  const robots = await readFile(join(consumer, 'dist', 'robots.txt'), 'utf8');
  if (!html.includes('data-page="index"') || !html.includes('Compat fixture')) {
    throw new CompatibilityError(testCase, 'representative HTML was not rendered');
  }
  if (!robots.includes('Disallow: /')) throw new CompatibilityError(testCase, 'robots.txt does not enforce noIndex');
  if (!admin.includes('id="nc-root"') || !admin.includes('You can change this editor notice') || !admin.includes('href="/version"')) {
    throw new CompatibilityError(testCase, 'AdminPage did not render its notice and safe footer links from packed helpers');
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.kind === 'pack') {
    await packPackages('compatibility artifacts', options.destination, false);
  } else {
    const testCase = `Node >=${options.node} / Astro ${options.astro}`;
    const root = await mkdtemp(join(tmpdir(), 'easy-web-packed-consumer-'));
    try {
      assertNode(testCase, options.node);
      const archives = options.archiveDirectory
        ? await packedPackages(options.archiveDirectory)
        : await packPackages(testCase, join(root, 'archives'), true);
      const consumer = join(root, 'consumer');
      await writeConsumer(testCase, consumer, archives, options.astro);
      await run(`${testCase} install`, consumer, 'pnpm', ['install', '--strict-peer-dependencies', '--lockfile=false']);
      await run(`${testCase} installed versions`, consumer, 'pnpm', ['list', '--depth', '0']);
      await assertPackages(testCase, consumer, archives);
      await run(`${testCase} Astro version`, consumer, process.execPath, ['-e', `const actual=require('./node_modules/astro/package.json').version;if(actual!=='${options.astro}')throw new Error('expected Astro ${options.astro}, installed '+actual);console.log('Installed Astro '+actual)`]);
      await run(`${testCase} CLI exclusion`, consumer, process.execPath, ['-e', "const fs=require('node:fs');if(fs.existsSync('node_modules/@easy-web/cli'))throw new Error('@easy-web/cli must not be installed')"]);
      await run(`${testCase} build`, consumer, 'pnpm', ['build']);
      await assertOutput(testCase, consumer);
      process.stdout.write(`Packed consumer passed: ${testCase}\n`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
} catch (error) {
  if (!(error instanceof CompatibilityError)) throw error;
  process.stderr.write(`Compatibility failed: ${error.message}\n`);
  process.exitCode = 1;
}
