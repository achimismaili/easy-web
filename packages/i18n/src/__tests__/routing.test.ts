import { describe, it, expect } from 'vitest';
import { localizedHref, getLocaleFromPath } from '../routing.js';

describe('localizedHref', () => {
  it('returns path unchanged for default locale', () => {
    expect(localizedHref({ path: '/about', locale: 'de', defaultLocale: 'de' })).toBe('/about');
  });
  it('prepends locale prefix for non-default', () => {
    expect(localizedHref({ path: '/about', locale: 'en', defaultLocale: 'de' })).toBe('/en/about');
  });
  it('handles root path correctly', () => {
    expect(localizedHref({ path: '/', locale: 'en', defaultLocale: 'de' })).toBe('/en');
  });
  it('handles root for default locale', () => {
    expect(localizedHref({ path: '/', locale: 'de', defaultLocale: 'de' })).toBe('/');
  });
  it('handles deep path for non-default locale', () => {
    expect(localizedHref({ path: '/blog/post-1', locale: 'en', defaultLocale: 'de' })).toBe('/en/blog/post-1');
  });
});

describe('getLocaleFromPath', () => {
  it('returns default for root path', () => {
    expect(getLocaleFromPath({ pathname: '/', locales: ['de', 'en'], defaultLocale: 'de' })).toBe('de');
  });
  it('detects en from /en/about', () => {
    expect(getLocaleFromPath({ pathname: '/en/about', locales: ['de', 'en'], defaultLocale: 'de' })).toBe('en');
  });
  it('returns default for unknown prefix', () => {
    expect(getLocaleFromPath({ pathname: '/about', locales: ['de', 'en'], defaultLocale: 'de' })).toBe('de');
  });
  it('detects locale from /en with no trailing segment', () => {
    expect(getLocaleFromPath({ pathname: '/en', locales: ['de', 'en'], defaultLocale: 'de' })).toBe('en');
  });
  it('returns default locale when path segment is not in locales', () => {
    expect(getLocaleFromPath({ pathname: '/blog', locales: ['de', 'en'], defaultLocale: 'de' })).toBe('de');
  });
});
