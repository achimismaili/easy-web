import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(app, '..', '..');
const roots = [];
const copySource = source => !['node_modules', 'dist', '.astro'].includes(basename(source));

class ConformanceError extends Error {
  name = 'ConformanceError';

  constructor(check, message) {
    super(`${check}: ${message}`);
    this.check = check;
  }
}

function run(check, cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(`\n## ${check}\n${output}`);
  return { status: result.status, output };
}

function requireStatus(check, result, expected) {
  if (result.status !== expected) {
    throw new ConformanceError(check, `expected exit ${expected}, received ${String(result.status)}`);
  }
}

async function replace(check, file, before, after) {
  const source = await readFile(file, 'utf8');
  if (!source.includes(before)) throw new ConformanceError(check, `mutation target was not found in ${file}`);
  await writeFile(file, source.replace(before, after));
}

async function workspace(label) {
  const root = await mkdtemp(join(tmpdir(), `easy-web-contract-${label}-`));
  roots.push(root);
  await cp(app, join(root, 'apps', 'contract-fixture'), { recursive: true, filter: copySource });
  await cp(join(repository, 'packages', 'core'), join(root, 'packages', 'core'), { recursive: true, filter: copySource });
  await cp(join(repository, 'packages', 'easy-web-cms-adapters'), join(root, 'packages', 'easy-web-cms-adapters'), { recursive: true, filter: copySource });
  await cp(join(repository, 'tsconfig.base.json'), join(root, 'tsconfig.base.json'));
  await writeFile(join(root, 'tsconfig.json'), '{"extends":"./tsconfig.base.json","include":[],"exclude":["node_modules"]}\n');
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n  - "apps/*"\n');
  await writeFile(join(root, 'package.json'), '{"name":"contract-conformance-workspace","private":true,"packageManager":"pnpm@10.34.4"}\n');
  requireStatus(`${label} install`, run(`${label} install`, root, 'pnpm', ['install', '--prefer-offline']), 0);
  requireStatus(`${label} core build`, run(`${label} core build`, root, 'pnpm', ['--filter', '@easy-web/core', 'build']), 0);
  requireStatus(`${label} cms build`, run(`${label} cms build`, root, 'pnpm', ['--filter', '@easy-web/cms-adapters', 'build']), 0);
  return { root, fixture: join(root, 'apps', 'contract-fixture') };
}

async function assertBroken(check, mutate, expectedFragments, commands) {
  const copy = await workspace(check);
  await mutate(copy.fixture);
  for (const [name, args] of commands) {
    const result = run(`${check} ${name}`, copy.fixture, 'pnpm', args);
    if (result.status === 0) throw new ConformanceError(check, `${name} did not fail as expected`);
    for (const fragment of expectedFragments) {
      if (!result.output.includes(fragment)) throw new ConformanceError(check, `${name} output did not contain ${fragment}`);
    }
  }
}

try {
  const clean = await workspace('clean');
  requireStatus('clean build', run('clean build', clean.fixture, 'pnpm', ['build']), 0);

  const checkAndBuild = [['astro check', ['exec', 'astro', 'check']], ['pnpm build', ['build']]];
  await assertBroken('renamed-start-date', fixture => replace('renamed-start-date', join(fixture, 'src/content/model.ts'), "fieldSets.event()", "fieldSets.event().map((entry) => entry.name === 'startDate' ? { ...entry, name: 'date', decap: { ...entry.decap, name: 'date' } } : entry)"), ['startDate'], checkAndBuild);
  await assertBroken('optional-event-image', fixture => replace('optional-event-image', join(fixture, 'src/content/model.ts'), "field.image('image', { label: 'Bild', alt: 'required' })", "field.image('image', { label: 'Bild', required: false, alt: 'required' })"), ['image'], checkAndBuild);
  await assertBroken('blank-photo-alt', fixture => replace('blank-photo-alt', join(fixture, 'src/content/events/open-day.md'), 'alt: Fixture guests in the example hall', 'alt: ""'), ['open-day.md', 'alt'], [['pnpm build', ['build']]]);
  await assertBroken('missing-content', fixture => replace('missing-content', join(fixture, 'src/pages/news/[id].astro'), '{ ...articleData, Content }', '{ ...articleData }'), ['Content'], checkAndBuild);

  process.stdout.write('\nAll contract conformance checks passed.\n');
} catch (error) {
  if (error instanceof ConformanceError) {
    process.stderr.write(`\nConformance failed: ${error.message}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await Promise.all(roots.map(root => rm(root, { recursive: true, force: true })));
}
