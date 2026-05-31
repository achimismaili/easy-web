import { describe, it, expect } from 'vitest';
import { createI18n } from '../factory.js';

const i18n = createI18n({ locales: ['de', 'en'] as const, defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' });

describe('createI18n', () => {
  it('returns object with expected function keys', () => {
    expect(typeof i18n.localizedHref).toBe('function');
    expect(typeof i18n.getLocaleFromPath).toBe('function');
    expect(typeof i18n.getAlternateLinks).toBe('function');
    expect(typeof i18n.getCanonicalUrl).toBe('function');
  });
  it('returns object with format sub-object', () => {
    expect(typeof i18n.format).toBe('object');
    expect(typeof i18n.format.date).toBe('function');
    expect(typeof i18n.format.number).toBe('function');
    expect(typeof i18n.format.currency).toBe('function');
    expect(typeof i18n.format.relativeTime).toBe('function');
    expect(typeof i18n.format.list).toBe('function');
  });
  it('exposes locales and defaultLocale', () => {
    expect(i18n.locales).toEqual(['de', 'en']);
    expect(i18n.defaultLocale).toBe('de');
  });
  it('localizedHref produces correct output for non-default', () => {
    expect(i18n.localizedHref('/about', 'en')).toBe('/en/about');
  });
  it('localizedHref produces correct output for default', () => {
    expect(i18n.localizedHref('/about', 'de')).toBe('/about');
  });
  it('getAlternateLinks returns 3 entries for 2 locales', () => {
    expect(i18n.getAlternateLinks('/about')).toHaveLength(3);
  });
  it('getCanonicalUrl for default locale', () => {
    expect(i18n.getCanonicalUrl('/about', 'de')).toBe('https://dev.ismaili.de/about');
  });
  it('getCanonicalUrl for non-default locale', () => {
    expect(i18n.getCanonicalUrl('/about', 'en')).toBe('https://dev.ismaili.de/en/about');
  });
  it('format.number works', () => {
    expect(i18n.format.number('de', 1234.5)).toBe('1.234,5');
  });
  it('format.currency returns formatted string with symbol', () => {
    const result = i18n.format.currency('de', 9.99, 'EUR');
    expect(result).toContain('9');
    expect(result).toContain('€');
  });
  it('getLocaleFromPath detects en', () => {
    expect(i18n.getLocaleFromPath('/en/about')).toBe('en');
  });
  it('getLocaleFromPath falls back to default', () => {
    expect(i18n.getLocaleFromPath('/kontakt')).toBe('de');
  });
});
