import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { easyWebCmsPreviewAssets } from '../index.js';
import { resolvePreviewRequest } from '../preview-assets/resolver.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('CMS preview asset mappings', () => {
  it.each([
    { folders: [{ source: '', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: 'assets/photos', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: '/src/assets/photos', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: 'C:/src/assets/photos', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: 'src\\assets\\photos', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: 'src/assets/../photos', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: 'src/assets/photos\0', publicPath: '/src/assets/photos' }] },
    { folders: [{ source: 'src/assets/photos', publicPath: 'src/assets/photos' }] },
    { folders: [{ source: 'src/assets/photos', publicPath: '/src/assets/photos?raw' }] },
    { folders: [{ source: 'src/assets/photos', publicPath: '/src/assets/photos#raw' }] },
    { folders: [{ source: 'src/assets/photos', publicPath: '/src/assets/./photos' }] },
    { folders: [{ source: 'src/assets/photos', publicPath: '/src/assets/other' }] },
  ])('rejects an invalid mapping %#', ({ folders }) => {
    expect(() => easyWebCmsPreviewAssets({ folders })).toThrow(/cms-preview-assets/i);
  });

  it('rejects duplicate and overlapping public ownership', () => {
    expect(() => easyWebCmsPreviewAssets({ folders: [
      { source: 'src/assets/photos', publicPath: '/src/assets/photos' },
      { source: 'src/assets/photos', publicPath: '/src/assets/photos/' },
    ] })).toThrow(/duplicate/i);
    expect(() => easyWebCmsPreviewAssets({ folders: [
      { source: 'src/assets/galleries', publicPath: '/src/assets/galleries' },
      { source: 'src/assets/galleries/events', publicPath: '/src/assets/galleries/events' },
    ] })).toThrow(/overlap/i);
  });
});

describe('CMS preview asset resolver', () => {
  it.each([
    '/src/assets/photos/%2e%2e/secret.jpg',
    '/src/assets/photos/%252e%252e/secret.jpg',
    '/src/assets/photos/%ZZ.jpg',
    '/src/assets/photos/back\\slash.jpg',
    '/src/assets/photos/nul%00.jpg',
    '/src/assets/photos/movie.mov',
  ])('rejects unsafe or unsupported request %s', async (requestPath) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-preview-resolver-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'src/assets/photos'), { recursive: true });
    const mapping = { source: 'src/assets/photos', publicPath: '/src/assets/photos' };
    await expect(resolvePreviewRequest(root, mapping, requestPath)).resolves.toBeNull();
  });

  it('rejects a symlink that escapes its configured source', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-preview-resolver-'));
    roots.push(root);
    const source = path.join(root, 'src/assets/photos');
    fs.mkdirSync(source, { recursive: true });
    const outside = path.join(root, 'outside.jpg');
    fs.writeFileSync(outside, 'outside');
    try {
      fs.symlinkSync(outside, path.join(source, 'escape.jpg'));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EPERM') return;
      throw error;
    }
    await expect(resolvePreviewRequest(root, {
      source: 'src/assets/photos', publicPath: '/src/assets/photos',
    }, '/src/assets/photos/escape.jpg')).resolves.toBeNull();
  });
});
