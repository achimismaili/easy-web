import { describe, it, expect } from 'vitest';
import { statSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '../../');

describe('bundle budget', () => {
  it('dist/index.js < 10KB', () => {
    const distPath = resolve(root, 'dist/index.js');
    if (!existsSync(distPath)) {
      console.warn('dist/index.js not found – skipping bundle budget check (run pnpm build first)');
      return;
    }
    const stat = statSync(distPath);
    expect(stat.size).toBeLessThan(10000);
  });
});
