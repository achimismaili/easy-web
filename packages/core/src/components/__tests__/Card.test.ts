import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { ImageMetadata } from 'astro';
import BlogPostCard from '../BlogPostCard.astro';
import Card from '../Card.astro';
import CardGrid from '../CardGrid.astro';
import { normalizeHtml } from './normalize-html';

// Same mock as Media.test.ts: width 1600 keeps all three default widths
// (400/800/1200) in the generated srcset.
const localImage: ImageMetadata = {
  src: '/src/assets/images/test.png',
  width: 1600,
  height: 900,
  format: 'png',
};

const gridSizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

// Astro serialises alt="" as a bare `alt`; accept either form, never a missing alt.
const emptyAlt = /\salt(?:=""|(?=[\s>/]))/;

type Component = Parameters<AstroContainer['renderToString']>[0];

async function render(component: Component, props: Record<string, unknown>, slots?: Record<string, string>) {
  return normalizeHtml(await renderRaw(component, props, slots));
}

async function renderRaw(component: Component, props: Record<string, unknown>, slots?: Record<string, string>) {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props, slots });
}

const rootTag = (html: string) => html.match(/^<[a-z]+\b[^>]*>/)?.[0] ?? '';
const imgTag = (html: string) => html.match(/<img\b[^>]*>/)?.[0] ?? '';
const scopeOf = (tag: string) => tag.match(/data-astro-cid-[a-z0-9]+/)?.[0];

describe('<Card item>', () => {
  it('renders a local image through Media with srcset and the given sizes, and links the card', async () => {
    const html = await render(Card, {
      item: {
        title: 'Touring bicycle',
        description: 'Ready for long rides',
        href: '/bikes/touring/',
        image: { src: localImage, alt: 'A touring bicycle' },
      },
      imageSizes: gridSizes,
    });

    expect(rootTag(html)).toMatch(/^<a\b/);
    expect(rootTag(html)).toContain('href="/bikes/touring/"');
    expect(rootTag(html)).toContain('class="ew-card ew-card--link"');
    const img = imgTag(html);
    expect(img).toContain('srcset=');
    expect(img).toContain(`sizes="${gridSizes}"`);
    expect(img).toContain('alt="A touring bicycle"');
    expect(img).toContain('class="ew-card__image"');
    expect(img).toContain('loading="lazy"');
    expect(html).toContain('<h3 class="ew-card__title">Touring bicycle</h3>');
    expect(html).toContain('<p class="ew-card__description">Ready for long rides</p>');
  });

  it('renders a string image as a plain img without srcset', async () => {
    const html = await render(Card, {
      item: { title: 'Touring bicycle', image: { src: '/images/touring.jpg', alt: 'A touring bicycle' } },
      imageSizes: gridSizes,
    });

    const img = imgTag(html);
    expect(img).not.toContain('srcset=');
    expect(img).toContain('src="/images/touring.jpg"');
    expect(img).toContain('alt="A touring bicycle"');
    expect(img).toContain('class="ew-card__image"');
  });

  it('takes the alt text only from the image, never from the title', async () => {
    const html = await render(Card, {
      item: { title: 'Touring bicycle', image: { src: '/images/touring.jpg', alt: '' } },
    });

    expect(imgTag(html)).toMatch(emptyAlt);
    expect(html).not.toContain('alt="Touring bicycle"');
  });

  it('puts the card scope on the Media image, so the scoped image rule matches it', async () => {
    const html = await renderRaw(Card, {
      item: { title: 'Touring bicycle', image: { src: localImage, alt: 'A touring bicycle' } },
    });

    const scope = scopeOf(rootTag(html));
    expect(scope).toBeDefined();
    expect(imgTag(html)).toContain(`${scope}=`);
  });

  it('renders a plain container without image when the item has neither href nor image', async () => {
    const html = await render(Card, { item: { title: 'Touring bicycle' } });

    expect(rootTag(html)).toBe('<div class="ew-card">');
    expect(html).not.toContain('<img');
  });

  it('adds the class to the root on the item path and on the legacy path', async () => {
    const itemHtml = await render(Card, { item: { title: 'Touring bicycle', href: '/bikes/' }, class: 'featured' });
    const legacyHtml = await render(Card, { title: 'Touring bicycle', class: 'featured' });

    expect(rootTag(itemHtml)).toContain('class="ew-card ew-card--link featured"');
    expect(rootTag(legacyHtml)).toBe('<div class="ew-card featured">');
  });
});

describe('<BlogPostCard item>', () => {
  const article = {
    title: 'Season opener',
    description: 'The first match day of the season',
    href: '/news/season-opener/',
    datePublished: new Date('2025-03-15T12:00:00Z'),
  };

  it('renders a local image through Media, the publication date and the link', async () => {
    const html = await render(BlogPostCard, {
      item: { ...article, image: { src: localImage, alt: 'Players at the oche' } },
      imageSizes: gridSizes,
      locale: 'de',
    });

    expect(rootTag(html)).toBe('<a class="ew-blog-card" href="/news/season-opener/">');
    const img = imgTag(html);
    expect(img).toContain('srcset=');
    expect(img).toContain(`sizes="${gridSizes}"`);
    expect(img).toContain('alt="Players at the oche"');
    expect(img).toContain('class="ew-blog-card__image"');
    expect(html).toContain('<h3 class="ew-blog-card__title">Season opener</h3>');
    expect(html).toContain('<time class="ew-blog-card__date" datetime="2025-03-15T12:00:00.000Z">15.03.2025</time>');
    expect(html).toContain('<p class="ew-blog-card__description">The first match day of the season</p>');
  });

  it('renders a string image as a plain img without srcset', async () => {
    const html = await render(BlogPostCard, {
      item: { ...article, image: { src: '/images/opener.jpg', alt: 'Players at the oche' } },
    });

    const img = imgTag(html);
    expect(img).not.toContain('srcset=');
    expect(img).toContain('src="/images/opener.jpg"');
    expect(img).toContain('alt="Players at the oche"');
  });

  it('takes the alt text only from the image, never from the title', async () => {
    const html = await render(BlogPostCard, {
      item: { ...article, image: { src: '/images/opener.jpg', alt: '' } },
    });

    expect(imgTag(html)).toMatch(emptyAlt);
    expect(html).not.toContain('alt="Season opener"');
  });

  it('puts the card scope on the Media image, so the scoped image rule matches it', async () => {
    const html = await renderRaw(BlogPostCard, {
      item: { ...article, image: { src: localImage, alt: 'Players at the oche' } },
    });

    const scope = scopeOf(rootTag(html));
    expect(scope).toBeDefined();
    expect(imgTag(html)).toContain(`${scope}=`);
  });

  it('omits the description paragraph when the article has none', async () => {
    const { description: _description, ...withoutDescription } = article;
    const html = await render(BlogPostCard, { item: withoutDescription, class: 'featured' });

    expect(rootTag(html)).toBe('<a class="ew-blog-card featured" href="/news/season-opener/">');
    expect(html).not.toContain('ew-blog-card__description');
    expect(html).not.toContain('<img');
  });
});

describe('<CardGrid class>', () => {
  it('adds the class to the grid root', async () => {
    const html = await render(CardGrid, { class: 'news-grid' }, { default: '<div class="child">One</div>' });

    expect(html).toBe('<div class="ew-card-grid news-grid"><div class="child">One</div></div>');
  });
});
