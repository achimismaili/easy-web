import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { ImageMetadata } from 'astro';
import NotFound from '../NotFound.astro';
import { normalizeHtml } from './normalize-html';

const mockImageMetadata: ImageMetadata = {
  src: '/src/assets/images/404.png',
  width: 1600,
  height: 900,
  format: 'png',
};

// Astro writes a dynamic empty attribute as a bare `alt`; the HTML spec reads
// that as alt="". Either form passes, a missing alt does not.
const EMPTY_ALT = /\salt(?:=""|(?=[\s>/]))/;

async function render(image?: unknown): Promise<string> {
  const container = await AstroContainer.create();
  const props: Record<string, unknown> = { currentLang: 'de', defaultLocale: 'de' };
  if (image !== undefined) props.image = image;
  return normalizeHtml(await container.renderToString(NotFound, { props }));
}

function imgTag(html: string): string | undefined {
  return html.match(/<img\b[^>]*>/)?.[0];
}

describe('<NotFound> image', () => {
  it('renders no image when the prop is absent', async () => {
    expect(imgTag(await render())).toBeUndefined();
  });

  it("renders no image for the legacy empty string ''", async () => {
    expect(imgTag(await render(''))).toBeUndefined();
  });

  it('renders a legacy path string as a decorative image, exactly as before', async () => {
    expect(imgTag(await render('/img/404.png'))).toBe(
      '<img src="/img/404.png" alt="" class="ew-not-found__image" loading="lazy">',
    );
  });

  it('renders a DecorativeImage through Media with an empty alt', async () => {
    const img = imgTag(await render({ src: '/img/404.svg', decorative: true })) ?? '';
    expect(img).toContain('src="/img/404.svg"');
    expect(img).toMatch(EMPTY_ALT);
    expect(img).toContain('class="ew-not-found__image"');
    expect(img).toContain('loading="lazy"');
    expect(img).not.toContain('srcset=');
  });

  it('renders an Image with its own alt text', async () => {
    const img = imgTag(await render({ src: '/img/lost.png', alt: 'A hiker reading a map' })) ?? '';
    expect(img).toContain('src="/img/lost.png"');
    expect(img).toContain('alt="A hiker reading a map"');
  });

  it('renders a local image asset with a srcset', async () => {
    const img = imgTag(await render({ src: mockImageMetadata, decorative: true })) ?? '';
    expect(img).toContain('srcset=');
    expect(img).toMatch(EMPTY_ALT);
    expect(img).toContain('ew-not-found__image');
  });
});
