import { describe, it, expect } from 'vitest';
import { statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '../../');

describe('bundle budget', () => {
  it('dist/index.js < 20KB', () => {
    const stat = statSync(resolve(root, 'dist/index.js'));
    expect(stat.size).toBeLessThan(20000);
  });
  it('styles/tokens.css < 8KB', () => {
    const stat = statSync(resolve(root, 'styles/tokens.css'));
    expect(stat.size).toBeLessThan(8000);
  });
});
