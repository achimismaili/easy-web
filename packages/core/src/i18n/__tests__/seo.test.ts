import { describe, expect, it } from 'vitest';
import { getAlternateLinks, getCanonicalUrl } from '../seo.js';

const BASE = 'https://dev.ismaili.de';

describe('getAlternateLinks', () => {
  it('returns locales.length + 1 entries', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    expect(links).toHaveLength(3); // de + en + x-default
  });
  it('default locale omits prefix', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    const de = links.find(l => l.hreflang === 'de');
    expect(de?.href).toBe(`${BASE}/about/`);
  });
  it('non-default locale adds prefix', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    const en = links.find(l => l.hreflang === 'en');
    expect(en?.href).toBe(`${BASE}/en/about/`);
  });
  it('x-default points to default locale URL', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    const xd = links.find(l => l.hreflang === 'x-default');
    expect(xd?.href).toBe(`${BASE}/about/`);
  });
  it('handles root path for default locale', () => {
    const links = getAlternateLinks({ path: '/', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    const de = links.find(l => l.hreflang === 'de');
    expect(de?.href).toBe(`${BASE}/`);
  });
  it('handles trailing slash on baseUrl', () => {
    const links = getAlternateLinks({ path: '/about', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: `${BASE}/` });
    const de = links.find(l => l.hreflang === 'de');
    expect(de?.href).toBe(`${BASE}/about/`);
  });
  it('works with 3 locales', () => {
    const links = getAlternateLinks({ path: '/contact', locales: ['de', 'en', 'fr'], defaultLocale: 'de', baseUrl: 'https://example.com' });
    expect(links).toHaveLength(4);
    const fr = links.find(l => l.hreflang === 'fr');
    expect(fr?.href).toBe('https://example.com/fr/contact/');
  });
});

describe('getCanonicalUrl', () => {
  it('default locale returns path without prefix', () => {
    expect(getCanonicalUrl({ path: '/about', locale: 'de', defaultLocale: 'de', baseUrl: BASE })).toBe(`${BASE}/about/`);
  });
  it('non-default locale prepends prefix', () => {
    expect(getCanonicalUrl({ path: '/about', locale: 'en', defaultLocale: 'de', baseUrl: BASE })).toBe(`${BASE}/en/about/`);
  });
  it('handles root path', () => {
    expect(getCanonicalUrl({ path: '/', locale: 'de', defaultLocale: 'de', baseUrl: BASE })).toBe(`${BASE}/`);
  });
});

describe('SEO helpers with already-localized input', () => {
  it('getAlternateLinks: no href contains /en/en for path /en', () => {
    const links = getAlternateLinks({ path: '/en', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    expect(links.every(l => !l.href.includes('/en/en'))).toBe(true);
  });

  it('getAlternateLinks: en hreflang href is /en/ (not /en/en)', () => {
    const links = getAlternateLinks({ path: '/en', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    const en = links.find(l => l.hreflang === 'en');
    expect(en?.href).toBe(`${BASE}/en/`);
  });

  it('getAlternateLinks: root path / produces /en/ for en hreflang', () => {
    const links = getAlternateLinks({ path: '/', locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE });
    const en = links.find(l => l.hreflang === 'en');
    expect(en?.href).toBe(`${BASE}/en/`);
  });

  it('getCanonicalUrl: already-localized /en resolves to /en/', () => {
    expect(getCanonicalUrl({ path: '/en', locale: 'en', defaultLocale: 'de', baseUrl: BASE })).toBe(`${BASE}/en/`);
  });

  it('getCanonicalUrl: already-localized /en/about resolves to /en/about/', () => {
    expect(getCanonicalUrl({ path: '/en/about', locale: 'en', defaultLocale: 'de', baseUrl: BASE })).toBe(`${BASE}/en/about/`);
  });

  it('getCanonicalUrl: /de/about with default locale resolves to /about/', () => {
    expect(getCanonicalUrl({ path: '/de/about', locale: 'de', defaultLocale: 'de', baseUrl: BASE })).toBe(`${BASE}/about/`);
  });
});

describe('served URL form is independent of how the caller spells the path', () => {
  const spellings = ['/about', '/about/'];

  it('getCanonicalUrl yields one URL for both spellings', () => {
    const results = spellings.map((path) =>
      getCanonicalUrl({ path, locale: 'de', defaultLocale: 'de', baseUrl: BASE }),
    );

    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe(`${BASE}/about/`);
  });

  it('getAlternateLinks yields one link set for both spellings', () => {
    const results = spellings.map((path) =>
      JSON.stringify(getAlternateLinks({ path, locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE })),
    );

    expect(new Set(results).size).toBe(1);
  });

  it('canonical and the self-referencing alternate are byte-identical', () => {
    for (const path of spellings) {
      const canonical = getCanonicalUrl({ path, locale: 'de', defaultLocale: 'de', baseUrl: BASE });
      const self = getAlternateLinks({ path, locales: ['de', 'en'], defaultLocale: 'de', baseUrl: BASE })
        .find((l) => l.hreflang === 'de');

      expect(self?.href).toBe(canonical);
    }
  });
});

describe('trailingSlash: never (Astro build.format "file")', () => {
  it('omits the trailing slash from canonical and alternates', () => {
    expect(
      getCanonicalUrl({ path: '/about/', locale: 'de', defaultLocale: 'de', baseUrl: BASE, trailingSlash: 'never' }),
    ).toBe(`${BASE}/about`);

    const links = getAlternateLinks({
      path: '/about/',
      locales: ['de', 'en'],
      defaultLocale: 'de',
      baseUrl: BASE,
      trailingSlash: 'never',
    });

    expect(links.find((l) => l.hreflang === 'en')?.href).toBe(`${BASE}/en/about`);
  });

  it('still emits the root as /', () => {
    expect(
      getCanonicalUrl({ path: '/', locale: 'de', defaultLocale: 'de', baseUrl: BASE, trailingSlash: 'never' }),
    ).toBe(`${BASE}/`);
  });
});
