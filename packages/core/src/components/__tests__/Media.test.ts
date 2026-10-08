import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { ImageMetadata } from 'astro';
import Media from '../Media.astro';

// Mirrors the mock pattern already established in UniversalMedia.test.ts —
// width=1600 so Astro's own "never upscale" width-filtering keeps all three
// default widths (400/800/1200) in the generated srcset.
const mockImageMetadata: ImageMetadata = {
  src: '/src/assets/images/test.png',
  width: 1600,
  height: 900,
  format: 'png',
};

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Media, { props });
}

describe('<Media>', () => {
  it('renders an ImageMetadata source through astro:assets <Image> with srcset and sizes', async () => {
    const html = await render({ image: { src: mockImageMetadata, alt: 'A photo' }, sizes: '100vw' });
    expect(html).toContain('srcset=');
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain('alt="A photo"');
  });

  it('renders a string source as a plain img with no srcset', async () => {
    const html = await render({ image: { src: '/images/photo.jpg', alt: 'A photo' } });
    expect(html).not.toContain('srcset=');
    expect(html).toContain('src="/images/photo.jpg"');
    expect(html).toContain('alt="A photo"');
  });

  it('renders alt="" for a decorative image', async () => {
    const html = await render({ image: { src: '/images/divider.svg', decorative: true } });
    // Astro serialises an empty attribute value as a bare `alt`, which the HTML
    // spec defines as alt="" — accept either form, but never a missing alt.
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? '';
    expect(img).toMatch(/\salt(?:=""|(?=[\s>/]))/);
  });
});
