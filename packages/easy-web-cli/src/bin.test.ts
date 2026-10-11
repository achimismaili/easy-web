import { mkdir, readFile, rm } from 'node:fs/promises';
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

  it('reports create as an honest placeholder', async () => {
    const result = await execa(process.execPath, [builtCli, 'create', '--json'], {
      reject: false,
    });

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr)).toEqual({
      schemaVersion: 1,
      level: 'error',
      code: 'NOT_IMPLEMENTED',
      message: 'The create command is not yet implemented.',
      command: 'create',
    });
  });

  it('runs help from the packed built output', async () => {
    const result = await execa(process.execPath, [packedCli, '--help'], { reject: false });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('easy-web create');
    expect(result.stderr).toBe('');
  });
});
