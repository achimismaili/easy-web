import { describe, expect, it } from 'vitest';
import { jsonLd } from '../jsonld.js';
import type { Article, Event, Organization, Page, Person, Product } from '../types.js';

const ctx = { url: '/kontakt/', siteUrl: 'https://example.com', inLanguage: 'de' };
const img = (src: string) => ({ src, alt: 'alt' });

describe('jsonLd.page', () => {
  it('maps title, description and url to a WebPage', () => {
    const page: Page = { title: 'Kontakt', description: 'Schreib uns' };
    expect(jsonLd.page(page, ctx)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Kontakt',
      description: 'Schreib uns',
      url: 'https://example.com/kontakt/',
      inLanguage: 'de',
    });
  });

  it('omits inLanguage when not given (key absent)', () => {
    const out = jsonLd.page({ title: 'T', description: 'D' }, { url: '/', siteUrl: 'https://example.com' });
    expect(out).not.toHaveProperty('inLanguage');
  });
});

describe('jsonLd.article', () => {
  const article: Article = {
    title: 'Hello',
    description: 'Desc',
    image: img('/img/a.jpg'),
    datePublished: new Date('2026-01-02T03:04:05Z'),
    dateModified: new Date('2026-02-03T00:00:00Z'),
    author: 'Ada',
  };

  it('maps name AND headline, ISO dates, absolute image and author', () => {
    const out = jsonLd.article(article, ctx, { type: 'NewsArticle' });
    expect(out).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      name: 'Hello',
      headline: 'Hello',
      description: 'Desc',
      image: 'https://example.com/img/a.jpg',
      datePublished: '2026-01-02T03:04:05.000Z',
      dateModified: '2026-02-03T00:00:00.000Z',
      author: { '@type': 'Person', name: 'Ada' },
    });
  });

  it('passes an already-absolute image URL through unchanged', () => {
    const out = jsonLd.article({ ...article, image: img('https://cdn.example.org/x.png') }, ctx, { type: 'Article' });
    expect(out.image).toBe('https://cdn.example.org/x.png');
  });

  it('resolves ImageMetadata src', () => {
    const meta = { src: '/_astro/a.123.jpg', width: 1, height: 1, format: 'jpg' as const };
    const out = jsonLd.article({ ...article, image: { src: meta, alt: 'x' } }, ctx, { type: 'BlogPosting' });
    expect(out.image).toBe('https://example.com/_astro/a.123.jpg');
  });

  it('omits absent optional keys entirely', () => {
    const out = jsonLd.article({ title: 'T', datePublished: new Date(0) }, ctx, { type: 'Article' });
    for (const key of ['dateModified', 'author', 'image', 'description']) {
      expect(out).not.toHaveProperty(key);
    }
    expect(JSON.stringify(out)).not.toContain('undefined');
  });
});

describe('jsonLd.event', () => {
  it('maps dates and a string location to a Place', () => {
    const event: Event = {
      title: 'Turnier',
      description: 'Darts',
      startDate: new Date('2026-05-01T10:00:00Z'),
      endDate: new Date('2026-05-01T18:00:00Z'),
      location: 'Halle',
    };
    expect(jsonLd.event(event, ctx, { type: 'SportsEvent' })).toMatchObject({
      '@type': 'SportsEvent',
      name: 'Turnier',
      startDate: '2026-05-01T10:00:00.000Z',
      endDate: '2026-05-01T18:00:00.000Z',
      location: { '@type': 'Place', name: 'Halle' },
    });
  });

  it('omits endDate and location when absent', () => {
    const out = jsonLd.event({ title: 'E', startDate: new Date(0) }, ctx, { type: 'Event' });
    expect(out).not.toHaveProperty('endDate');
    expect(out).not.toHaveProperty('location');
    expect(out).not.toHaveProperty('image');
  });
});

describe('jsonLd.organization', () => {
  it('maps name, logo, url and description', () => {
    const org: Organization = { name: 'TV', logo: img('/logo.svg'), url: 'https://tv.example', description: 'Club' };
    expect(jsonLd.organization(org, ctx, { type: 'SportsOrganization' })).toMatchObject({
      '@type': 'SportsOrganization',
      name: 'TV',
      logo: 'https://example.com/logo.svg',
      url: 'https://tv.example/',
      description: 'Club',
    });
  });

  it('omits url and description when absent', () => {
    const out = jsonLd.organization({ name: 'TV', logo: img('/l.svg') }, ctx, { type: 'Organization' });
    expect(out).not.toHaveProperty('url');
    expect(out).not.toHaveProperty('description');
  });
});

describe('jsonLd.person', () => {
  it('maps role to description, image and email', () => {
    const person: Person = { name: 'Ada', role: 'Trainer', image: img('/ada.jpg'), email: 'a@example.com' };
    expect(jsonLd.person(person, ctx)).toMatchObject({
      '@type': 'Person',
      name: 'Ada',
      description: 'Trainer',
      image: 'https://example.com/ada.jpg',
      email: 'a@example.com',
    });
  });

  it('omits optional keys', () => {
    const out = jsonLd.person({ name: 'Ada' }, ctx);
    for (const key of ['description', 'image', 'email']) expect(out).not.toHaveProperty(key);
  });
});

describe('jsonLd.product', () => {
  it('maps a Motorcycle', () => {
    const product: Product = { title: 'Road King', description: 'Bike', image: img('/rk.jpg') };
    expect(jsonLd.product(product, ctx, { type: 'Motorcycle' })).toMatchObject({
      '@type': 'Motorcycle',
      name: 'Road King',
      description: 'Bike',
      image: 'https://example.com/rk.jpg',
    });
  });
});
