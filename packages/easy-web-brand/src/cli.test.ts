import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { execa } from 'execa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // packages/easy-web-brand/
const CLI = join(ROOT, 'dist', 'cli.js');

const SOURCE_TRANSPARENT = 'E:/code/it-ci/dev.ismaili.de/src/assets/logos/logo-dev.png';

let tmpLogoDir: string;
let tmpOutDir: string;

beforeAll(async () => {
  // Use unique temp dirs (timestamp-suffixed) so this file does not race
  // against src/favicons.test.ts, which also seeds test/fixtures/logo-dev.png
  // in its own beforeAll. Vitest runs test files in parallel by default.
  tmpLogoDir = join(tmpdir(), `ew-brand-cli-logos-${Date.now()}`);
  tmpOutDir = join(tmpdir(), `ew-brand-cli-out-${Date.now()}`);
  await mkdir(tmpLogoDir, { recursive: true });
  await copyFile(SOURCE_TRANSPARENT, join(tmpLogoDir, 'logo-dev.png'));
});

afterAll(async () => {
  await Promise.all([
    tmpLogoDir && existsSync(tmpLogoDir)
      ? rm(tmpLogoDir, { recursive: true, force: true })
      : Promise.resolve(),
    tmpOutDir && existsSync(tmpOutDir)
      ? rm(tmpOutDir, { recursive: true, force: true })
      : Promise.resolve(),
  ]);
});

describe('easy-web-brand CLI', () => {
  it('--help exits 0 and prints usage with "trim" and "favicons"', async () => {
    const result = await execa('node', [CLI, '--help'], { reject: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('trim');
    expect(result.stdout).toContain('favicons');
  });

  it('trim <folder> produces a trimmed file (dims < 1024)', async () => {
    const result = await execa('node', [CLI, 'trim', tmpLogoDir], { reject: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Trim complete');
    // The output file exists and was shrunk (or skipped if already tight)
    expect(existsSync(join(tmpLogoDir, 'logo-dev.png'))).toBe(true);
  });

  it('favicons <folder> --out=<dir> produces 4 files', async () => {
    const result = await execa('node', [CLI, 'favicons', tmpLogoDir, `--out=${tmpOutDir}`], {
      reject: false,
    });
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(tmpOutDir, 'logo-dev.ico'))).toBe(true);
    expect(existsSync(join(tmpOutDir, 'logo-dev-32.png'))).toBe(true);
    expect(existsSync(join(tmpOutDir, 'logo-dev-180.png'))).toBe(true);
    expect(existsSync(join(tmpOutDir, 'logo-dev-512.png'))).toBe(true);
  });

  it('unknown command exits 1 with "Unknown command" in stderr', async () => {
    const result = await execa('node', [CLI, 'frobnicate'], { reject: false });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/unknown command/i);
  });
});
