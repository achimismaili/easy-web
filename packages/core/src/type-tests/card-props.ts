import type { BlogPostCardProps, CardGridProps, CardProps } from '../contracts/props.js';

// Card.astro, BlogPostCard.astro and CardGrid.astro declare
// `export type Props = <Name>Props`, which is what Astro's tooling returns for
// ComponentProps<typeof Card>. tsc cannot load .astro files, so these
// assertions run against the contracts the components alias.

const image = { src: '/images/touring.jpg', alt: 'A touring bicycle' };
const datePublished = new Date('2025-03-15T12:00:00Z');

const itemCard: CardProps = {
  item: { title: 'Touring bicycle', href: '/bikes/touring/', image },
  imageSizes: '(min-width: 1024px) 33vw, 100vw',
  class: 'featured',
  headingLevel: 'h2',
};

const itemCardWithoutLink: CardProps = { item: { title: 'Touring bicycle', description: 'Ready for long rides' } };

const legacyCard: CardProps = {
  title: 'Touring bicycle',
  href: '/bikes/touring/',
  image: '/images/touring.jpg',
  imageAlt: 'A touring bicycle',
  headingLevel: 'h4',
};

// @ts-expect-error Only heading elements are allowed as card titles.
const nonHeadingCard: CardProps = { item: { title: 'Gallery' }, headingLevel: 'div' };

// @ts-expect-error Heading levels use tag names, not numeric ranks.
const numericHeadingCard: CardProps = { title: 'Gallery', headingLevel: 2 };

// @ts-expect-error An item image carries its own alt text; the title is no fallback.
const itemImageWithoutAlt: CardProps = { item: { title: 'Touring bicycle', image: { src: '/images/touring.jpg' } } };

// @ts-expect-error The item and the legacy props are exclusive.
const mixedCard: CardProps = { item: { title: 'Touring bicycle' }, title: 'Touring bicycle' };

// @ts-expect-error imageSizes belongs to the item path; legacy images have no srcset.
const legacyCardWithSizes: CardProps = { title: 'Touring bicycle', imageSizes: '100vw' };

const articleCard: BlogPostCardProps = {
  item: { title: 'Season opener', href: '/news/season-opener/', datePublished, image },
  imageSizes: '100vw',
  locale: 'de',
};

const legacyArticleCard: BlogPostCardProps = {
  title: 'Season opener',
  description: 'The first match day of the season',
  href: '/news/season-opener/',
  pubDate: datePublished,
};

// @ts-expect-error A blog post card is a link, so the article needs href.
const articleWithoutHref: BlogPostCardProps = { item: { title: 'Season opener', datePublished } };

// @ts-expect-error The date comes from datePublished, which an article requires.
const articleWithoutDate: BlogPostCardProps = { item: { title: 'Season opener', href: '/news/season-opener/' } };

const grid: CardGridProps = { class: 'news-grid' };

void itemCard;
void itemCardWithoutLink;
void legacyCard;
void nonHeadingCard;
void numericHeadingCard;
void itemImageWithoutAlt;
void mixedCard;
void legacyCardWithSizes;
void articleCard;
void legacyArticleCard;
void articleWithoutHref;
void articleWithoutDate;
void grid;
