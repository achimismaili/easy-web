import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { copyFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { generateFavicons } from './favicons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'test', 'fixtures');
const TRANSPARENT_FIXTURE = join(fixturesDir, 'logo-dev.png');
const SOURCE_TRANSPARENT = 'E:/code/it-ci/dev.ismaili.de/src/assets/logos/logo-dev.png';

let tmpOut: string;

beforeAll(async () => {
  await mkdir(fixturesDir, { recursive: true });
  await copyFile(SOURCE_TRANSPARENT, TRANSPARENT_FIXTURE);
  tmpOut = join(tmpdir(), `easy-web-brand-test-${Date.now()}`);
  await mkdir(tmpOut, { recursive: true });
});

afterAll(async () => {
  if (tmpOut && existsSync(tmpOut)) {
    await rm(tmpOut, { recursive: true, force: true });
  }
});

describe('generateFavicons', () => {
  it('produces 4 output files in outDir', async () => {
    const result = await generateFavicons(TRANSPARENT_FIXTURE, tmpOut, 'logo-dev');
    expect(existsSync(result.ico)).toBe(true);
    expect(existsSync(result.png32)).toBe(true);
    expect(existsSync(result.png180)).toBe(true);
    expect(existsSync(result.png512)).toBe(true);
  });

  it('ICO has valid header (00 00 01 00) and exactly 3 image directory entries', async () => {
    const icoPath = join(tmpOut, 'logo-dev.ico');
    const buf = await readFile(icoPath);
    // ICO signature: bytes 0-1 = 00 00 (reserved), bytes 2-3 = 01 00 (ICO type)
    expect(buf[0]).toBe(0);
    expect(buf[1]).toBe(0);
    expect(buf[2]).toBe(1);
    expect(buf[3]).toBe(0);
    // Number of images (little-endian uint16 at offset 4)
    const frameCount = buf.readUInt16LE(4);
    expect(frameCount).toBe(3);
  });

  it('PNG outputs have correct dimensions (32, 180, 512)', async () => {
    const [m32, m180, m512] = await Promise.all([
      sharp(join(tmpOut, 'logo-dev-32.png')).metadata(),
      sharp(join(tmpOut, 'logo-dev-180.png')).metadata(),
      sharp(join(tmpOut, 'logo-dev-512.png')).metadata(),
    ]);
    expect(m32.width).toBe(32);
    expect(m32.height).toBe(32);
    expect(m180.width).toBe(180);
    expect(m180.height).toBe(180);
    expect(m512.width).toBe(512);
    expect(m512.height).toBe(512);
  });

  it('PNG outputs preserve alpha channel', async () => {
    const meta = await sharp(join(tmpOut, 'logo-dev-512.png')).metadata();
    expect(meta.hasAlpha).toBe(true);
  });
});
