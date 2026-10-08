import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as core from '@easy-web/core/theme';
import * as compat from '../index.js';

const requireFromPackage = createRequire(new URL('../../package.json', import.meta.url));

describe('@easy-web/theme-core compatibility exports', () => {
  it('exports exactly the runtime symbols of @easy-web/core/theme', () => {
    expect(Object.keys(compat).sort()).toEqual(Object.keys(core).sort());
  });

  it.each(Object.entries(core))('re-exports %s by identity', (name, value) => {
    expect(Object.entries(compat).find(([key]) => key === name)?.[1]).toBe(value);
  });
});

describe('@easy-web/theme-core compatibility stylesheets', () => {
  it.each(['tokens.css', 'fonts.css'])('%s imports the core stylesheet that resolves from this package', (file) => {
    const css = readFileSync(new URL(`../../styles/${file}`, import.meta.url), 'utf8');
    expect(css.trim()).toBe(`@import "@easy-web/core/styles/${file}";`);

    const target = readFileSync(requireFromPackage.resolve(`@easy-web/core/styles/${file}`), 'utf8');
    expect(target.length).toBeGreaterThan(0);
  });

  it('tokens.css reaches the real theme tokens', () => {
    const target = readFileSync(requireFromPackage.resolve('@easy-web/core/styles/tokens.css'), 'utf8');
    expect(target).toContain('--ew-surface');
  });
});
