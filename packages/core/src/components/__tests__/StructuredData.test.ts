import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import StructuredData from '../StructuredData.astro';
import SeoHead from '../SeoHead.astro';

const site = 'https://example.com';

async function render(component: Parameters<AstroContainer['renderToString']>[0], props: Record<string, unknown>) {
  const container = await AstroContainer.create({ astroConfig: { site } });
  return container.renderToString(component, { props });
}

describe('StructuredData', () => {
  it('renders one ld+json script for an object', async () => {
    const html = await render(StructuredData, { data: { '@type': 'WebPage', name: 'X' } });
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('{"@type":"WebPage","name":"X"}');
  });

  it('renders arrays as a JSON array', async () => {
    const html = await render(StructuredData, { data: [{ a: 1 }, { b: 2 }] });
    expect(html).toContain('[{"a":1},{"b":2}]');
  });

  it('escapes < so the payload cannot close the script element', async () => {
    const html = await render(StructuredData, { data: { name: '</script><script>alert(1)</script>' } });
    expect(html).toContain('\\u003c/script>');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe('SeoHead structuredData', () => {
  const base = { title: 'T', pathname: '/', locale: 'en', siteName: 'S' };

  it('emits no ld+json when structuredData is absent', async () => {
    const html = await render(SeoHead, base);
    expect(html).not.toContain('ld+json');
  });

  it('emits the script when structuredData is given', async () => {
    const html = await render(SeoHead, { ...base, structuredData: { '@type': 'WebPage' } });
    expect(html).toContain('application/ld+json');
    expect(html).toContain('{"@type":"WebPage"}');
  });
});
