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

function createRoot(relativeSource = 'nested'): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-preview-output-'));
  roots.push(root);
  const source = path.join(root, 'src/assets/photos', relativeSource);
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, 'image.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return root;
}

function hook(value: unknown, name: string): (...args: readonly unknown[]) => unknown {
  if (typeof value !== 'object' || value === null || !('hooks' in value)) throw new TypeError('Missing hooks');
  const hooks = value.hooks;
  if (typeof hooks !== 'object' || hooks === null || !(name in hooks)) throw new TypeError(`Missing ${name}`);
  const selected = hooks[name as keyof typeof hooks];
  if (typeof selected !== 'function') throw new TypeError(`Invalid ${name}`);
  return selected;
}

async function configuredIntegration(root: string): Promise<ReturnType<typeof easyWebCmsPreviewAssets>> {
  const integration = easyWebCmsPreviewAssets({ folders: [
    { source: 'src/assets/photos', publicPath: '/src/assets/photos' },
  ] });
  await hook(integration, 'astro:config:setup')({ config: { root: pathToFileURL(`${root}${path.sep}`) } });
  return integration;
}

async function build(integration: ReturnType<typeof easyWebCmsPreviewAssets>, dist: string): Promise<unknown> {
  return hook(integration, 'astro:build:done')({
    dir: pathToFileURL(`${dist}${path.sep}`), logger: { info: vi.fn(), warn: vi.fn() },
  });
}

describe('CMS preview output path security', () => {
  it('rejects a destination parent symlink without writing outside output root', async () => {
    const root = createRoot();
    const dist = path.join(root, 'dist');
    const outside = path.join(root, 'outside');
    fs.mkdirSync(path.join(dist, 'src/assets/photos'), { recursive: true });
    fs.mkdirSync(outside);
    try {
      fs.symlinkSync(outside, path.join(dist, 'src/assets/photos/nested'), 'junction');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EPERM') return;
      throw error;
    }

    await expect(build(await configuredIntegration(root), dist)).rejects.toThrow(/easy-web-cms-preview-assets.*symlink/i);
    expect(fs.existsSync(path.join(outside, 'image.svg'))).toBe(false);
  });

  it('rejects an existing regular file in the destination parent path', async () => {
    const root = createRoot();
    const dist = path.join(root, 'dist');
    fs.mkdirSync(path.join(dist, 'src/assets'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'src/assets/photos'), 'regular file');

    await expect(build(await configuredIntegration(root), dist)).rejects.toThrow(/easy-web-cms-preview-assets.*not a directory/i);
    expect(fs.readFileSync(path.join(dist, 'src/assets/photos'), 'utf8')).toBe('regular file');
  });

  it('creates missing destination components for normal nested output', async () => {
    const root = createRoot('2026/event');
    const dist = path.join(root, 'dist');
    fs.mkdirSync(dist);

    await build(await configuredIntegration(root), dist);
    expect(fs.existsSync(path.join(dist, 'src/assets/photos/2026/event/image.svg'))).toBe(true);
  });
});
