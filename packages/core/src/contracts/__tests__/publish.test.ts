import { describe, expect, it } from 'vitest';
import { isPublished, type PublishRule } from '../publish.js';

const NOW = new Date('2026-10-08T12:00:00.000Z');
const PAST = new Date('2026-10-08T11:59:59.999Z');
const FUTURE = new Date('2026-10-08T12:00:00.001Z');

describe.each([
  {
    rule: 'missing-date-means-published',
    missingDateExpected: true,
  },
  {
    rule: 'missing-date-means-draft',
    missingDateExpected: false,
  },
] satisfies readonly {
  readonly rule: PublishRule;
  readonly missingDateExpected: boolean;
}[])('isPublished with $rule', ({ rule, missingDateExpected }) => {
  it('uses the rule when publishDate is missing', () => {
    expect(isPublished({}, rule, NOW)).toBe(missingDateExpected);
  });

  it('publishes a past date', () => {
    expect(isPublished({ publishDate: PAST }, rule, NOW)).toBe(true);
  });

  it('does not publish a future date', () => {
    expect(isPublished({ publishDate: FUTURE }, rule, NOW)).toBe(false);
  });

  it('publishes a date equal to now', () => {
    expect(isPublished({ publishDate: NOW }, rule, NOW)).toBe(true);
  });
});
