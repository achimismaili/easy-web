import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Runs after `astro build`: every legacy import path the live sites use was
 * compiled through the compatibility packages, so the built output must carry
 * the real theme tokens and every page must have rendered.
 */
const dist = fileURLToPath(new URL('../dist/', import.meta.url));

function filesUnder(dir: string, extension: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

const pages = [
  { file: 'index.html', marker: 'data-page="index"' },
  { file: 'headers/index.html', marker: 'data-page="headers"' },
  { file: 'gallery/index.html', marker: 'data-page="gallery"' },
  { file: 'legal/index.html', marker: 'data-page="legal"' },
  { file: '404.html', marker: 'data-page="not-found"' },
  { file: 'admin/index.html', marker: 'decap-cms@' },
  { file: 'notes/index.html', marker: 'Markdown notes' },
] as const;

describe('compat-fixture build output', () => {
  it('ships the core theme tokens through @easy-web/theme-core/tokens.css', () => {
    const css = filesUnder(dist, '.css').map((file) => readFileSync(file, 'utf8')).join('\n');
    // A declaration, not a var() reference: components only reference the
    // token, so this proves the tokens.css @import itself was resolved.
    expect(css).toMatch(/--ew-surface:\s*#/);
    expect(css).not.toContain('@import "@easy-web/core');
  });

  it.each(pages)('renders $file', ({ file, marker }) => {
    const target = path.join(dist, file);
    expect(existsSync(target), `${file} was not built`).toBe(true);
    const html = readFileSync(target, 'utf8');
    expect(html).toContain(marker);
  });

  it('serves robots.txt from the core seo route injected via @easy-web/seo', () => {
    expect(readFileSync(path.join(dist, 'robots.txt'), 'utf8')).toContain('Disallow: /');
  });
});
