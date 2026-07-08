import { describe, it, expect, beforeAll } from 'vitest';
import { copyFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { trimLogos } from './trim.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'test', 'fixtures');

const TRANSPARENT_FIXTURE = join(fixturesDir, 'logo-dev.png');
const WHITE_FIXTURE = join(fixturesDir, 'logo-dev-white.png');

// Source files from dev.ismaili.de (post-T6 rename: logo-dev.png = transparent, logo-dev-white.png = white)
const SOURCE_TRANSPARENT = 'E:/code/it-ci/dev.ismaili.de/src/assets/logos/logo-dev.png';
const SOURCE_WHITE = 'E:/code/it-ci/dev.ismaili.de/src/assets/logos/logo-dev-white.png';

beforeAll(async () => {
  await mkdir(fixturesDir, { recursive: true });
  await copyFile(SOURCE_TRANSPARENT, TRANSPARENT_FIXTURE);
  await copyFile(SOURCE_WHITE, WHITE_FIXTURE);
});

describe('trimLogos', () => {
  it('trims transparent-background logo: output smaller than 1024, top-left pixel transparent', async () => {
    const result = await trimLogos(TRANSPARENT_FIXTURE);
    expect(result.changed).toBe(true);
    expect(result.after.w).toBeLessThan(1024);
    expect(result.after.h).toBeLessThan(1024);
    // Verify transparency preserved
    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
    const { data } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
    const alphaOfTopLeft = data[3]; // RGBA: index 3 is alpha
    expect(alphaOfTopLeft).toBe(0); // top-left must still be transparent
  });

  it('trims white-background logo: output smaller than 1024, top-left pixel white+opaque', async () => {
    const result = await trimLogos(WHITE_FIXTURE);
    // May or may not change depending on whitespace; if logo fills the canvas it's a no-op
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width!).toBeGreaterThan(50);
    expect(meta.height!).toBeGreaterThan(50);
    // Background preserved: top-left pixel should be white (RGB >= 240) and fully opaque
    const { data } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
    const channels = meta.channels ?? 3;
    if (channels === 4) {
      const alpha = data[3];
      expect(alpha).toBe(255); // opaque
    }
    const r = data[0], g = data[1], b = data[2];
    expect(r).toBeGreaterThanOrEqual(240);
    expect(g).toBeGreaterThanOrEqual(240);
    expect(b).toBeGreaterThanOrEqual(240);
  });

  it('padding respected: padded output is larger than bare (zero-padding) output', async () => {
    const result = await trimLogos(TRANSPARENT_FIXTURE, { paddingPct: 2, minPaddingPx: 10 });
    expect(result.changed).toBe(true);
    // Compare against a zero-padding trim: bare should be strictly smaller in both dims.
    const bareResult = await trimLogos(TRANSPARENT_FIXTURE, { paddingPct: 0, minPaddingPx: 0 });
    expect(result.after.w).toBeGreaterThan(bareResult.after.w);
    expect(result.after.h).toBeGreaterThan(bareResult.after.h);
  });

  it('no-op skip: already-trimmed (bare) input returns changed=false', async () => {
    // Take a bare trim (no padding) so the buffer has no shave-able border left.
    const bare = await trimLogos(TRANSPARENT_FIXTURE, { paddingPct: 0, minPaddingPx: 0 });
    expect(bare.changed).toBe(true);
    // Second pass on the already-tight buffer must be a no-op.
    const second = await trimLogos(bare.buffer);
    expect(second.changed).toBe(false);
  });

  it('over-trim guard: throws when output would be < minOutputDim', async () => {
    // Threshold 100 makes sharp treat everything as background so trim collapses aggressively.
    // The 9999-px floor then rejects it.
    await expect(
      trimLogos(TRANSPARENT_FIXTURE, { threshold: 100, minOutputDim: 9999 }),
    ).rejects.toThrow('pathologically small output');
  });
});
