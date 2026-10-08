import { describe, expect, it } from 'vitest';
import * as core from '@easy-web/core/i18n';
import * as compat from '../index.js';

describe('@easy-web/i18n compatibility exports', () => {
  it('exports exactly the runtime symbols of @easy-web/core/i18n', () => {
    expect(Object.keys(compat).sort()).toEqual(Object.keys(core).sort());
  });

  it.each(Object.entries(core))('re-exports %s by identity', (name, value) => {
    expect(Object.entries(compat).find(([key]) => key === name)?.[1]).toBe(value);
  });
});
