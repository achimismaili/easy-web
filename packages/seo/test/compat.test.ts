import { describe, expect, it } from 'vitest';
import * as core from '@easy-web/core/seo';
import * as compat from '../src/index.js';

describe('@easy-web/seo compatibility exports', () => {
  it('exports exactly the runtime symbols of @easy-web/core/seo, including the default integration', () => {
    expect(Object.keys(compat).sort()).toEqual(Object.keys(core).sort());
    expect(Object.keys(compat)).toContain('default');
  });

  it.each(Object.entries(core))('re-exports %s by identity', (name, value) => {
    expect(Object.entries(compat).find(([key]) => key === name)?.[1]).toBe(value);
  });
});
