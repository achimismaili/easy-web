import { describe, it, expect } from 'vitest';
import { notFoundSchema } from '../notFound.js';

describe('notFoundSchema', () => {
  it('parses a multi-locale object with partial fields', () => {
    const input = {
      de: { heading: 'Seite nicht gefunden', message: 'Existiert nicht.' },
      en: { heading: 'Not found' },
    };
    expect(() => notFoundSchema.parse(input)).not.toThrow();
    const result = notFoundSchema.parse(input);
    expect(result.de.heading).toBe('Seite nicht gefunden');
    expect(result.en.heading).toBe('Not found');
  });

  it('parses an empty object (all fields optional)', () => {
    expect(() => notFoundSchema.parse({})).not.toThrow();
    expect(notFoundSchema.parse({})).toEqual({});
  });

  it('parses arbitrary locale keys (open record)', () => {
    const input = { de: {}, fr: {}, sq: {} };
    expect(() => notFoundSchema.parse(input)).not.toThrow();
    const result = notFoundSchema.parse(input);
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['de', 'fr', 'sq']));
  });

  it('rejects a record where image is not a string', () => {
    const input = { de: { image: 42 } };
    expect(() => notFoundSchema.parse(input)).toThrow();
  });
});
