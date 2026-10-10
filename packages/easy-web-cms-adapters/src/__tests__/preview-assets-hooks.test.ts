import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { easyWebCmsPreviewAssets } from '../index.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function createRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-preview-hooks-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'src/assets/photos'), { recursive: true });
  return root;
}

function integration() {
  return easyWebCmsPreviewAssets({ folders: [
    { source: 'src/assets/photos', publicPath: '/src/assets/photos' },
  ] });
}

async function configure(value: unknown, root: string): Promise<void> {
  await hook(value, 'astro:config:setup')({
    config: { root: pathToFileURL(`${root}${path.sep}`) },
  });
}

function hook(value: unknown, name: string): (...args: readonly unknown[]) => unknown {
  if (typeof value !== 'object' || value === null || !('hooks' in value)) throw new TypeError('Missing hooks');
  const hooks = value.hooks;
  if (typeof hooks !== 'object' || hooks === null || !(name in hooks)) throw new TypeError(`Missing ${name}`);
  const selected = hooks[name as keyof typeof hooks];
  if (typeof selected !== 'function') throw new TypeError(`Invalid ${name}`);
  return selected;
}

describe('CMS preview development middleware', () => {
  it('serves an owned JPEG with browser-safe headers and delegates unrelated URLs', async () => {
    const root = createRoot();
    const jpeg = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#336699' } }).jpeg().toBuffer();
    fs.writeFileSync(path.join(root, 'src/assets/photos/valid.jpg'), jpeg);
    let middleware: ((req: { url?: string }, res: TestResponse, next: () => void) => void) | undefined;
    const previewIntegration = integration();
    await configure(previewIntegration, root);
    const setup = hook(previewIntegration, 'astro:server:setup');
    await setup({ server: { middlewares: { use: (value: typeof middleware) => { middleware = value; } } } });
    if (!middleware) throw new TypeError('Middleware was not registered');

    const response = new TestResponse();
    middleware({ url: '/src/assets/photos/valid.jpg' }, response, () => { response.next = true; });
    await response.finished;
    expect(response.statusCode).toBe(200);
    expect(response.headers).toMatchObject({
      'content-type': 'image/jpeg',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    });
    expect(Buffer.concat(response.chunks)).toEqual(jpeg);

    const unrelated = new TestResponse();
    middleware({ url: '/favicon.ico' }, unrelated, () => { unrelated.next = true; });
    expect(unrelated.next).toBe(true);
  });

  it.each(['/src/assets/photos/missing.jpg', '/src/assets/photos/movie.mov', '/src/assets/photos/%2e%2e/secret.jpg'])
  ('returns a path-free 404 for invalid owned URL %s', async (url) => {
    const root = createRoot();
    let middleware: ((req: { url?: string }, res: TestResponse, next: () => void) => void) | undefined;
    const previewIntegration = integration();
    await configure(previewIntegration, root);
    await hook(previewIntegration, 'astro:server:setup')({
      server: { middlewares: { use: (value: typeof middleware) => { middleware = value; } } },
    });
    if (!middleware) throw new TypeError('Middleware was not registered');
    const response = new TestResponse();
    middleware({ url }, response, () => { response.next = true; });
    await response.finished;
    expect(response.statusCode).toBe(404);
    expect(Buffer.concat(response.chunks).toString()).toBe('Not Found');
    expect(response.next).toBe(false);
  });
});

describe('CMS preview Astro root', () => {
  it('resolves development and build assets from config.root when cwd differs', async () => {
    const root = createRoot();
    const otherCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-preview-cwd-'));
    roots.push(otherCwd);
    const jpeg = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#336699' } }).jpeg().toBuffer();
    fs.writeFileSync(path.join(root, 'src/assets/photos/root.jpg'), jpeg);
    const previewIntegration = integration();
    const previousCwd = process.cwd();
    process.chdir(otherCwd);
    try {
      await configure(previewIntegration, root);
      let middleware: ((req: { url?: string }, res: TestResponse, next: () => void) => void) | undefined;
      await hook(previewIntegration, 'astro:server:setup')({
        server: { middlewares: { use: (value: typeof middleware) => { middleware = value; } } },
      });
      if (!middleware) throw new TypeError('Middleware was not registered');
      const response = new TestResponse();
      middleware({ url: '/src/assets/photos/root.jpg' }, response, () => { response.next = true; });
      await response.finished;
      expect(Buffer.concat(response.chunks)).toEqual(jpeg);

      const dist = path.join(root, 'dist');
      fs.mkdirSync(dist);
      await hook(previewIntegration, 'astro:build:done')({
        dir: pathToFileURL(`${dist}${path.sep}`), logger: { info: vi.fn(), warn: vi.fn() },
      });
      expect(fs.existsSync(path.join(dist, 'src/assets/photos/root.jpg'))).toBe(true);
      expect(fs.existsSync(path.join(otherCwd, 'src/assets/photos/root.jpg'))).toBe(false);
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('fails clearly when server setup runs before config setup', () => {
    const previewIntegration = integration();
    expect(() => hook(previewIntegration, 'astro:server:setup')({
      server: { middlewares: { use: vi.fn() } },
    })).toThrow(/astro:config:setup/i);
  });

  it('fails clearly when build completion runs before config setup', async () => {
    const previewIntegration = integration();
    await expect(hook(previewIntegration, 'astro:build:done')({
      dir: pathToFileURL(path.join(os.tmpdir(), 'dist')),
      logger: { info: vi.fn(), warn: vi.fn() },
    })).rejects.toThrow(/astro:config:setup/i);
  });
});

describe('CMS preview build emission', () => {
  it('emits bounded renditions, pass-through files, and skips unsafe inputs', async () => {
    const root = createRoot();
    const source = path.join(root, 'src/assets/photos');
    const fixtures = [
      ['large.jpg', sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#963' } }).jpeg()],
      ['small.png', sharp({ create: { width: 20, height: 10, channels: 4, background: '#369c' } }).png()],
      ['wide.webp', sharp({ create: { width: 2000, height: 500, channels: 3, background: '#693' } }).webp()],
      ['square.avif', sharp({ create: { width: 1700, height: 1700, channels: 3, background: '#639' } }).avif()],
    ] as const;
    for (const [name, pipeline] of fixtures) fs.writeFileSync(path.join(source, name), await pipeline.toBuffer());
    fs.writeFileSync(path.join(source, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>');
    fs.writeFileSync(path.join(source, 'tiny.gif'), await sharp({ create: { width: 2, height: 2, channels: 3, background: '#000' } }).gif().toBuffer());
    fs.writeFileSync(path.join(source, 'movie.mov'), 'video');
    fs.writeFileSync(path.join(source, 'unknown.bin'), 'unknown');
    fs.writeFileSync(path.join(source, 'broken.jpg'), 'not an image');
    fs.writeFileSync(path.join(source, 'oversized.svg'), Buffer.alloc(5 * 1024 * 1024 + 1));
    const dist = path.join(root, 'dist');
    fs.mkdirSync(dist);
    fs.writeFileSync(path.join(dist, 'unrelated.txt'), 'keep');
    const logger = { info: vi.fn(), warn: vi.fn() };

    const previewIntegration = integration();
    await configure(previewIntegration, root);
    await hook(previewIntegration, 'astro:build:done')({ dir: pathToFileURL(`${dist}${path.sep}`), logger });

    for (const [name] of fixtures) {
      const output = path.join(dist, 'src/assets/photos', name);
      const metadata = await sharp(fs.readFileSync(output)).metadata();
      const expectedFormat = path.extname(name).slice(1).replace('jpg', 'jpeg').replace('avif', 'heif');
      expect(metadata.format).toBe(expectedFormat);
      expect(metadata.width).toBeLessThanOrEqual(1600);
      expect(metadata.height).toBeLessThanOrEqual(1600);
      expect(fs.statSync(output).size).toBeLessThanOrEqual(5 * 1024 * 1024);
    }
    const smallPng = fs.readFileSync(path.join(dist, 'src/assets/photos/small.png'));
    expect((await sharp(smallPng).metadata()).width).toBe(20);
    expect(fs.readFileSync(path.join(dist, 'src/assets/photos/icon.svg'), 'utf8')).toContain('<svg');
    expect(fs.existsSync(path.join(dist, 'src/assets/photos/tiny.gif'))).toBe(true);
    for (const name of ['movie.mov', 'unknown.bin', 'broken.jpg', 'oversized.svg']) {
      expect(fs.existsSync(path.join(dist, 'src/assets/photos', name))).toBe(false);
    }
    expect(fs.readFileSync(path.join(dist, 'unrelated.txt'), 'utf8')).toBe('keep');
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls.length).toBeLessThanOrEqual(10);
  }, 15_000);

  it('rejects collisions while preserving unrelated output and accepts missing sources', async () => {
    const root = createRoot();
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#000' } }).jpeg().toBuffer();
    fs.writeFileSync(path.join(root, 'src/assets/photos/a.jpg'), jpeg);
    const dist = path.join(root, 'dist');
    fs.mkdirSync(path.join(dist, 'src/assets/photos'), { recursive: true });
    const collision = path.join(dist, 'src/assets/photos/a.jpg');
    fs.writeFileSync(collision, 'owned by Astro');
    const previewIntegration = integration();
    await configure(previewIntegration, root);
    await expect(hook(previewIntegration, 'astro:build:done')({
      dir: pathToFileURL(`${dist}${path.sep}`), logger: { info: vi.fn(), warn: vi.fn() },
    })).rejects.toThrow(/collision/i);
    expect(fs.readFileSync(collision, 'utf8')).toBe('owned by Astro');

    fs.rmSync(path.join(root, 'src/assets/photos'), { recursive: true });
    await expect(hook(previewIntegration, 'astro:build:done')({
      dir: pathToFileURL(`${dist}${path.sep}`), logger: { info: vi.fn(), warn: vi.fn() },
    })).resolves.toBeUndefined();
  });
});

class TestResponse {
  statusCode = 200;
  readonly headers: Record<string, string> = {};
  readonly chunks: Buffer[] = [];
  next = false;
  private resolveFinished: (() => void) | undefined;
  readonly finished = new Promise<void>((resolve) => { this.resolveFinished = resolve; });
  setHeader(name: string, value: string): void { this.headers[name.toLowerCase()] = value; }
  write(chunk: Buffer): void { this.chunks.push(chunk); }
  end(chunk?: string): void {
    if (chunk) this.chunks.push(Buffer.from(chunk));
    this.resolveFinished?.();
  }
}
