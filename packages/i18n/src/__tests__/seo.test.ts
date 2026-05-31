import { describe, it, expect } from 'vitest';
import { getAlternateLinks, getCanonicalUrl } from '../seo.js';

describe('getAlternateLinks', () => {
  it('returns locales.length + 1 entries', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' });
    expect(links).toHaveLength(3); // de + en + x-default
  });
  it('default locale omits prefix', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' });
    const de = links.find(l => l.hreflang === 'de');
    expect(de?.href).toBe('https://dev.ismaili.de/about');
  });
  it('non-default locale adds prefix', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' });
    const en = links.find(l => l.hreflang === 'en');
    expect(en?.href).toBe('https://dev.ismaili.de/en/about');
  });
  it('x-default points to default locale URL', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' });
    const xd = links.find(l => l.hreflang === 'x-default');
    expect(xd?.href).toBe('https://dev.ismaili.de/about');
  });
  it('handles root path for default locale', () => {
    const links = getAlternateLinks({ path: '/', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' });
    const de = links.find(l => l.hreflang === 'de');
    expect(de?.href).toBe('https://dev.ismaili.de/');
  });
  it('handles trailing slash on baseUrl', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de/' });
    const de = links.find(l => l.hreflang === 'de');
    expect(de?.href).toBe('https://dev.ismaili.de/about');
  });
  it('works with 3 locales', () => {
    const links = getAlternateLinks({ path: '/contact', locales: ['de', 'en', 'fr'], defaultLocale: 'de', baseUrl: 'https://example.com' });
    expect(links).toHaveLength(4);
    const fr = links.find(l => l.hreflang === 'fr');
    expect(fr?.href).toBe('https://example.com/fr/contact');
  });
});

describe('getCanonicalUrl', () => {
  it('default locale returns path without prefix', () => {
    expect(getCanonicalUrl({ path: '/about', locale: 'de', defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' })).toBe('https://dev.ismaili.de/about');
  });
  it('non-default locale prepends prefix', () => {
    expect(getCanonicalUrl({ path: '/about', locale: 'en', defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' })).toBe('https://dev.ismaili.de/en/about');
  });
  it('handles root path', () => {
    expect(getCanonicalUrl({ path: '/', locale: 'de', defaultLocale: 'de', baseUrl: 'https://dev.ismaili.de' })).toBe('https://dev.ismaili.de/');
  });
});
