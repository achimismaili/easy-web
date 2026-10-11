import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { easyWebCmsPreviewAssets } from '../index.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(): { root: string; source: string; dist: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-preview-bounds-'));
  roots.push(root);
  const source = path.join(root, 'src/assets/photos');
  const dist = path.join(root, 'dist');
  fs.mkdirSync(source, { recursive: true });
  fs.mkdirSync(dist);
  return { root, source, dist };
}

function hook(value: ReturnType<typeof easyWebCmsPreviewAssets>, name: 'astro:config:setup' | 'astro:build:done') {
  const selected = value.hooks?.[name];
  if (typeof selected !== 'function') throw new TypeError(`Missing ${name}`);
  return selected as (...args: any[]) => unknown;
}

async function build(root: string, dist: string): Promise<void> {
  const integration = easyWebCmsPreviewAssets({ folders: [{ source: 'src/assets/photos', publicPath: '/src/assets/photos' }] });
  await hook(integration, 'astro:config:setup')({ config: { root: pathToFileURL(`${root}${path.sep}`) } });
  await hook(integration, 'astro:build:done')({ dir: pathToFileURL(`${dist}${path.sep}`), logger: { info: vi.fn(), warn: vi.fn() } });
}

describe('bounded CMS preview copies', () => {
  it('rejects a file exceeding 10 MiB', async () => {
    const { root, source, dist } = fixture();
    fs.writeFileSync(path.join(source, 'large.jpg'), Buffer.alloc(10 * 1024 * 1024 + 1));
    await expect(build(root, dist)).rejects.toThrow(/exceeds 10 MiB/i);
  });

  it('rejects the 501st file', async () => {
    const { root, source, dist } = fixture();
    for (let index = 0; index < 501; index += 1) fs.writeFileSync(path.join(source, `${index}.svg`), '<svg/>');
    await expect(build(root, dist)).rejects.toThrow(/count exceeds 500/i);
  });

  it('rejects more than 100 MiB aggregate', async () => {
    const { root, source, dist } = fixture();
    for (let index = 0; index < 11; index += 1) fs.writeFileSync(path.join(source, `${index}.jpg`), Buffer.alloc(10 * 1024 * 1024));
    await expect(build(root, dist)).rejects.toThrow(/100 MiB aggregate/i);
  });

  it('rejects unsupported extensions', async () => {
    const { root, source, dist } = fixture();
    fs.writeFileSync(path.join(source, 'movie.avif'), 'not allowed');
    await expect(build(root, dist)).rejects.toThrow(/unsupported preview extension/i);
  });

  it('rejects source symlinks and reparse points', async () => {
    const { root, source, dist } = fixture();
    const outside = path.join(root, 'outside.svg');
    fs.writeFileSync(outside, '<svg/>');
    try { fs.symlinkSync(outside, path.join(source, 'linked.svg'), 'file'); } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EPERM') return;
      throw error;
    }
    await expect(build(root, dist)).rejects.toThrow(/symlink or reparse/i);
  });

  it('rejects path escape configuration', () => {
    expect(() => easyWebCmsPreviewAssets({ folders: [{ source: 'src/assets/../secret', publicPath: '/src/assets/../secret' }] })).toThrow(/dot path/i);
  });

  it('rejects case-colliding source names', async () => {
    const { root, source, dist } = fixture();
    fs.writeFileSync(path.join(source, 'Photo.svg'), '<svg/>');
    fs.writeFileSync(path.join(source, 'photo.svg'), '<svg/>');
    if (fs.readdirSync(source).length < 2) return;
    await expect(build(root, dist)).rejects.toThrow(/case-collision/i);
  });

  it('removes only manifest-owned stale files and preserves unknown outputs', async () => {
    const { root, source, dist } = fixture();
    fs.writeFileSync(path.join(source, 'owned.svg'), '<svg/>');
    await build(root, dist);
    const outputFolder = path.join(dist, 'src/assets/photos');
    fs.writeFileSync(path.join(outputFolder, 'unknown.svg'), 'keep');
    fs.rmSync(path.join(source, 'owned.svg'));
    await build(root, dist);
    expect(fs.existsSync(path.join(outputFolder, 'owned.svg'))).toBe(false);
    expect(fs.readFileSync(path.join(outputFolder, 'unknown.svg'), 'utf8')).toBe('keep');
  });
});
