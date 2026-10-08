import { describe, it, expect } from 'vitest';
import { noFlashScript, getPreferredTheme } from '../helper.js';

describe('noFlashScript', () => {
  it('is a non-empty string', () => {
    expect(typeof noFlashScript).toBe('string');
    expect(noFlashScript.length).toBeGreaterThan(0);
  });
  it('contains IIFE pattern', () => {
    expect(noFlashScript).toContain('(function()');
  });
  it('references ew-theme storage key', () => {
    expect(noFlashScript).toContain('ew-theme');
  });
  it('sets data-theme attribute', () => {
    expect(noFlashScript).toContain('dataset');
  });
});

describe('getPreferredTheme', () => {
  it('returns system when no window (SSR/Node)', () => {
    const result = getPreferredTheme();
    expect(result).toBe('system');
  });
});
