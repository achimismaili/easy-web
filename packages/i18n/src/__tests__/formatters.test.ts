import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, formatCurrency, formatList, formatRelativeTime } from '../formatters.js';

describe('formatNumber', () => {
  it('formats number in de-DE locale', () => {
    expect(formatNumber('de-DE', 1234.5)).toBe('1.234,5');
  });
  it('formats number in en-US locale', () => {
    expect(formatNumber('en-US', 1234.5)).toBe('1,234.5');
  });
});

describe('formatDate', () => {
  it('formats a date as string', () => {
    const result = formatDate('de-DE', new Date(2024, 0, 15));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
  it('formats a date timestamp as string', () => {
    const result = formatDate('en-US', Date.UTC(2024, 0, 15));
    expect(typeof result).toBe('string');
  });
  it('accepts DateTimeFormatOptions', () => {
    const result = formatDate('de-DE', new Date(2024, 0, 15), { year: 'numeric', month: 'long' });
    expect(result).toContain('2024');
  });
});

describe('formatCurrency', () => {
  it('formats EUR in de-DE', () => {
    const result = formatCurrency('de-DE', 99.9, 'EUR');
    expect(result).toContain('99');
    expect(result).toContain('€');
  });
  it('formats USD in en-US', () => {
    const result = formatCurrency('en-US', 9.99, 'USD');
    expect(result).toContain('9.99');
    expect(result).toContain('$');
  });
});

describe('formatList', () => {
  it('formats list in de-DE', () => {
    const result = formatList('de-DE', ['A', 'B', 'C']);
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('C');
  });
  it('formats single item list', () => {
    const result = formatList('en-US', ['only']);
    expect(result).toBe('only');
  });
});

describe('formatRelativeTime', () => {
  it('formats relative time in de-DE', () => {
    const result = formatRelativeTime('de-DE', -3, 'day');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
  it('formats future relative time in en-US', () => {
    const result = formatRelativeTime('en-US', 2, 'week');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
