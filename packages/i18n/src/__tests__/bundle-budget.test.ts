import { describe, it, expect } from 'vitest';
import { statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '../../');

describe('bundle budget', () => {
  it('dist/index.js < 10KB', () => {
    const stat = statSync(resolve(root, 'dist/index.js'));
    expect(stat.size).toBeLessThan(10000);
  });
});
