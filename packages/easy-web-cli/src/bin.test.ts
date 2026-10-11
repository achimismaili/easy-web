import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const builtCli = join(packageRoot, 'dist', 'bin.js');

let packDirectory: string;
let packedCli: string;

beforeAll(async () => {
  packDirectory = join(tmpdir(), `easy-web-cli-pack-${process.pid}-${Date.now()}`);
  await mkdir(packDirectory, { recursive: true });

  const packed = await execa('pnpm', ['pack', '--pack-destination', packDirectory], {
    cwd: packageRoot,
  });
  const archiveName = packed.stdout.trim().split(/\r?\n/).at(-1);
  if (!archiveName) {
    throw new Error('pnpm pack did not report an archive path');
  }

  const archivePath = isAbsolute(archiveName) ? archiveName : join(packDirectory, archiveName);
  await execa('tar', ['-xf', archivePath, '-C', packDirectory]);
  packedCli = join(packDirectory, 'package', 'dist', 'bin.js');
});

afterAll(async () => {
  if (packDirectory) {
    await rm(packDirectory, { recursive: true, force: true });
  }
});

describe('easy-web built CLI', () => {
  it('prints help to stdout', async () => {
    const result = await execa(process.execPath, [builtCli, '--help'], { reject: false });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('easy-web create');
    expect(result.stderr).toBe('');
  });

  it('prints the package version to stdout', async () => {
    const manifest = JSON.parse(
      await readFile(join(packageRoot, 'package.json'), 'utf8'),
    ) as { version: string };
    const result = await execa(process.execPath, [builtCli, '--version'], { reject: false });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(manifest.version);
    expect(result.stderr).toBe('');
  });

  it.each(['init', 'upgrade', 'doctor', 'diff'])(
    'rejects unsupported command %s with invalid-input exit code',
    async (command) => {
      const result = await execa(process.execPath, [builtCli, command, '--json'], {
        reject: false,
      });

      expect(result.exitCode).toBe(3);
      expect(JSON.parse(result.stderr)).toEqual({
        schemaVersion: 1,
        level: 'error',
        code: 'INVALID_INPUT',
        message: `Unknown command: ${command}`,
        command,
      });
    },
  );

  it('requires config input for create', async () => {
    const result = await execa(process.execPath, [builtCli, 'create', '--json'], {
      reject: false,
    });

    expect(result.exitCode).toBe(3);
    expect(JSON.parse(result.stderr)).toEqual({
      schemaVersion: 1,
      level: 'error',
      code: 'INVALID_INPUT',
      message: 'create requires --config <file.json>',
      command: 'create',
    });
  });

  it('runs help from the packed built output', async () => {
    const result = await execa(process.execPath, [packedCli, '--help'], { reject: false });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('easy-web create');
    expect(result.stderr).toBe('');
  });

  it('creates a committed site through the built config-driven command', async () => {
    const target = join(packDirectory, 'generated');
    const configPath = join(packDirectory, 'create.json');
    await writeFile(configPath, JSON.stringify({ target, recipes: { shell: { siteName: 'CLI Site' } } }));
    const result = await execa(process.execPath, [builtCli, 'create', '--config', configPath, '--json'], {
      reject: false,
      env: { GIT_AUTHOR_NAME: 'CLI Test', GIT_AUTHOR_EMAIL: 'cli@example.invalid', GIT_COMMITTER_NAME: 'CLI Test', GIT_COMMITTER_EMAIL: 'cli@example.invalid' },
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ target, branch: 'main', schemaVersion: 1 });
    const history = await execa('git', ['rev-list', '--count', 'HEAD'], { cwd: target, env: { GIT_MASTER: '1' } });
    expect(history.stdout).toBe('1');
    expect(await readFile(join(target, 'pnpm-lock.yaml'), 'utf8')).toContain("lockfileVersion: '9.0'");
  });

  it('accepts --no-install as the explicit alias for default offline generation', async () => {
    const target = join(packDirectory, 'generated-no-install');
    const configPath = join(packDirectory, 'create-no-install.json');
    await writeFile(configPath, JSON.stringify({ target }));
    const result = await execa(process.execPath, [builtCli, 'create', '--config', configPath, '--no-install', '--json'], {
      reject: false,
      env: { GIT_AUTHOR_NAME: 'CLI Test', GIT_AUTHOR_EMAIL: 'cli@example.invalid', GIT_COMMITTER_NAME: 'CLI Test', GIT_COMMITTER_EMAIL: 'cli@example.invalid' },
    });
    expect(result.exitCode).toBe(0);
    expect(await readFile(join(target, 'pnpm-lock.yaml'), 'utf8')).toContain("lockfileVersion: '9.0'");
  });
});
