import { describe, expect, it } from 'vitest';
import { localizedHref, getLocaleFromPath } from '../routing.js';
import { createI18n } from '../factory.js';

describe('localizedHref – three-locale setup (de/en/fr)', () => {
  const opts = (path: string, locale: string) =>
    localizedHref({ path, locale, defaultLocale: 'de' });

  it('fr prefix on root path', () => {
    expect(opts('/', 'fr')).toBe('/fr');
  });
  it('fr prefix on /about', () => {
    expect(opts('/about', 'fr')).toBe('/fr/about');
  });
  it('fr prefix on deep path', () => {
    expect(opts('/news/2024/article', 'fr')).toBe('/fr/news/2024/article');
  });
  it('strips /fr prefix for fr locale (idempotent)', () => {
    expect(opts('/fr/about', 'fr')).toBe('/fr/about');
  });
  it('does not strip a foreign locale prefix (/en/about stays as /fr/en/about)', () => {
    expect(opts('/en/about', 'fr')).toBe('/fr/en/about');
  });
  it('en prefix still works', () => {
    expect(opts('/about', 'en')).toBe('/en/about');
  });
  it('default locale de returns path without prefix', () => {
    expect(opts('/about', 'de')).toBe('/about');
  });
  it('preserves query string for fr', () => {
    expect(opts('/about?ref=home', 'fr')).toBe('/fr/about?ref=home');
  });
  it('preserves hash for fr', () => {
    expect(opts('/about#section', 'fr')).toBe('/fr/about#section');
  });
});

describe('getLocaleFromPath – three locales', () => {
  const locales = ['de', 'en', 'fr'] as const;
  const opts = (pathname: string) => getLocaleFromPath({ pathname, locales, defaultLocale: 'de' });

  it('detects fr from /fr/contact', () => {
    expect(opts('/fr/contact')).toBe('fr');
  });
  it('detects fr from /fr (no trailing segment)', () => {
    expect(opts('/fr')).toBe('fr');
  });
  it('detects en from /en/about', () => {
    expect(opts('/en/about')).toBe('en');
  });
  it('returns default for root', () => {
    expect(opts('/')).toBe('de');
  });
  it('returns default for /blog (not a locale prefix)', () => {
    expect(opts('/blog')).toBe('de');
  });
  it('does not match partial segment /french', () => {
    expect(opts('/french-cuisine')).toBe('de');
  });
});

describe('createI18n – three-locale factory', () => {
  const i18n = createI18n({
    locales: ['de', 'en', 'fr'] as const,
    defaultLocale: 'de',
    baseUrl: 'https://example.com',
  });

  it('exposes all three locales', () => {
    expect(i18n.locales).toEqual(['de', 'en', 'fr']);
  });
  it('getAlternateLinks returns 4 entries (3 locales + x-default)', () => {
    expect(i18n.getAlternateLinks('/about')).toHaveLength(4);
  });
  it('getAlternateLinks includes fr hreflang', () => {
    const links = i18n.getAlternateLinks('/about');
    const fr = links.find(l => l.hreflang === 'fr');
    expect(fr?.href).toBe('https://example.com/fr/about');
  });
  it('localizedHref for fr', () => {
    expect(i18n.localizedHref('/about', 'fr')).toBe('/fr/about');
  });
  it('getLocaleFromPath detects fr', () => {
    expect(i18n.getLocaleFromPath('/fr/contact')).toBe('fr');
  });
  it('getCanonicalUrl for fr locale', () => {
    expect(i18n.getCanonicalUrl('/contact', 'fr')).toBe('https://example.com/fr/contact');
  });
});
