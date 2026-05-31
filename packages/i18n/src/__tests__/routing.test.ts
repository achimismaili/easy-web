import { describe, expect, it } from 'vitest'
import { getLocaleFromPath, localizedHref } from '../routing.js'

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

describe('localizedHref de-localize behaviour', () => {
  it('returns /en for de-localized / with locale en', () => {
    expect(localizedHref({ path: '/', locale: 'en', defaultLocale: 'de' })).toBe('/en');
  });

  it('strips leading /en from already-localized path', () => {
    expect(localizedHref({ path: '/en', locale: 'en', defaultLocale: 'de' })).toBe('/en');
  });

  it('strips leading /en from trailing-slash path', () => {
    expect(localizedHref({ path: '/en/', locale: 'en', defaultLocale: 'de' })).toBe('/en');
  });

  it('returns / for de-localized / with default locale', () => {
    expect(localizedHref({ path: '/', locale: 'de', defaultLocale: 'de' })).toBe('/');
  });

  it('strips leading /de from path with default locale', () => {
    expect(localizedHref({ path: '/de', locale: 'de', defaultLocale: 'de' })).toBe('/');
  });

  it('prefixes /en on non-localized /about path', () => {
    expect(localizedHref({ path: '/about', locale: 'en', defaultLocale: 'de' })).toBe('/en/about');
  });

  it('is idempotent for /en/about path', () => {
    expect(localizedHref({ path: '/en/about', locale: 'en', defaultLocale: 'de' })).toBe('/en/about');
  });

  it('does not strip /english-intro (over-strip guard)', () => {
    expect(localizedHref({ path: '/english-intro', locale: 'en', defaultLocale: 'de' })).toBe('/en/english-intro');
  });

  it('preserves query string', () => {
    expect(localizedHref({ path: '/en?foo=bar', locale: 'en', defaultLocale: 'de' })).toBe('/en?foo=bar');
  });

  it('preserves hash fragment', () => {
    expect(localizedHref({ path: '/en#section', locale: 'en', defaultLocale: 'de' })).toBe('/en#section');
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
