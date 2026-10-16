import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SeoHead from '../../components/SeoHead.astro';

async function render(locale: string, languages?: string[]) {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://example.com' } });
  return container.renderToString(SeoHead, {
    props: {
      title: 'Gallery',
      pathname: '/gallery',
      locale,
      siteName: 'Example',
      noIndex: true,
      ...(languages ? {
        alternates: languages.map(hreflang => ({ hreflang, href: `https://example.com/${hreflang}/` })),
      } : {}),
    },
  });
}

function alternates(html: string) {
  return [...html.matchAll(/<meta property="og:locale:alternate" content="([^"]+)"/g)]
    .map(match => match[1]);
}

describe('SeoHead Open Graph locales', () => {
  it.each([undefined, [], ['de']])('emits no invented alternate for a German-only site (%j)', async languages => {
    const html = await render('de', languages);
    expect(alternates(html)).toEqual([]);
    expect(html).toContain('<meta property="og:locale" content="de_DE"');
  });

  it.each([
    ['de', ['de', 'en'], ['en_US']],
    ['en', ['de', 'en'], ['de_DE']],
    ['de', ['de', 'de-DE', 'DE_de', 'en', 'en-US', 'EN_us', 'x-default', 'X-DEFAULT'], ['en_US']],
    ['de-AT', ['de-at', 'de', 'de-CH', 'en-GB', 'EN_gb', 'fr-ca'], ['de_DE', 'de_CH', 'en_GB', 'fr_CA']],
    ['zh-Hant-TW', ['zh-hant-tw', 'zh-Hans-CN', 'pt-br', 'es-419'], ['zh_Hans_CN', 'pt_BR', 'es_419']],
  ])('derives alternates for %s from configured links', async (locale, languages, expected) => {
    const html = await render(locale, languages);
    expect(alternates(html)).toEqual(expected);
    // OG filtering must not remove or normalize the actual hreflang links.
    for (const language of languages) {
      expect(html).toContain(`hreflang="${language}" href="https://example.com/${language}/"`);
    }
    expect(html).toContain('rel="canonical" href="https://example.com/gallery/"');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });

  it.each([
    ['en', 'en_US'], ['de', 'de_DE'], ['de-AT', 'de_AT'], ['en-GB', 'en_GB'], ['fr', 'fr'],
  ])('preserves the current locale mapping for %s', async (locale, expected) => {
    expect(await render(locale)).toContain(`<meta property="og:locale" content="${expected}"`);
  });
});
