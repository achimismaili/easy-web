import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SeoHead from '../../components/SeoHead.astro';
import { normalizeHtml } from './normalize-html';

/**
 * Baseline: how today's <SeoHead> renders with today's props. A change to
 * these snapshots is a regression of legacy usage - do not update them.
 */
const site = 'https://example.com';

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create({ astroConfig: { site } });
  return normalizeHtml(await container.renderToString(SeoHead, { props }));
}

describe('SeoHead legacy rendering baseline', () => {
  it('renders the props the sites pass (dev.ismaili.de style)', async () => {
    const html = await render({
      title: 'Kontakt',
      description: 'Get in touch',
      pathname: '/kontakt',
      locale: 'de',
      siteName: 'Example Site',
      ogType: 'website',
      themeColor: '#6366f1',
      manifest: '/manifest.json',
      noIndex: false,
      alternates: [
        { hreflang: 'de', href: 'https://example.com/kontakt/' },
        { hreflang: 'en', href: 'https://example.com/en/contact/' },
      ],
    });
    expect(html).toMatchSnapshot();
  });

  it('renders the minimal props (darts/party200 style, noIndex)', async () => {
    const html = await render({
      title: 'Start',
      pathname: '/',
      locale: 'en',
      siteName: 'Example Site',
      noIndex: true,
      alternates: [],
    });
    expect(html).toMatchSnapshot();
  });
});
