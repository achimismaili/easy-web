import type {
  Article,
  Event,
  Image,
  ImageSource,
  Organization,
  Page,
  Person,
  Product,
} from './types.js';

export interface JsonLdContext {
  url: string;
  siteUrl: string;
  inLanguage?: string;
}

interface JsonLdBase<T extends string> {
  '@context': 'https://schema.org';
  '@type': T;
  inLanguage?: string;
}

export interface JsonLdWebPage extends JsonLdBase<'WebPage'> {
  name: string;
  description: string;
  url: string;
}

export type ArticleType = 'Article' | 'NewsArticle' | 'BlogPosting';
export interface JsonLdArticle extends JsonLdBase<ArticleType> {
  name: string;
  headline: string;
  description?: string;
  image?: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: { '@type': 'Person'; name: string };
}

export type EventType = 'Event' | 'SportsEvent';
export interface JsonLdEvent extends JsonLdBase<EventType> {
  name: string;
  description?: string;
  image?: string;
  url: string;
  startDate: string;
  endDate?: string;
  location?: { '@type': 'Place'; name: string };
}

export type OrganizationType = 'Organization' | 'SportsOrganization';
export interface JsonLdOrganization extends JsonLdBase<OrganizationType> {
  name: string;
  logo: string;
  url?: string;
  description?: string;
}

export interface JsonLdPerson extends JsonLdBase<'Person'> {
  name: string;
  description?: string;
  image?: string;
  email?: string;
}

export type ProductType = 'Product' | 'Motorcycle';
export interface JsonLdProduct extends JsonLdBase<ProductType> {
  name: string;
  description?: string;
  image: string;
  url: string;
}

const absolute = (value: string, siteUrl: string): string => new URL(value, siteUrl).toString();

function imageUrl(image: Pick<Image, 'src'>, siteUrl: string): string;
function imageUrl(image: Pick<Image, 'src'> | undefined, siteUrl: string): string | undefined;
function imageUrl(image: Pick<Image, 'src'> | undefined, siteUrl: string): string | undefined {
  if (!image) return undefined;
  const src: ImageSource = image.src;
  return absolute(typeof src === 'string' ? src : src.src, siteUrl);
}

// Absent optional values must be absent keys, not `undefined`-valued ones.
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

const head = <T extends string>(type: T, ctx: JsonLdContext): JsonLdBase<T> =>
  compact({ '@context': 'https://schema.org' as const, '@type': type, inLanguage: ctx.inLanguage });

export const jsonLd = {
  page(page: Page, ctx: JsonLdContext): JsonLdWebPage {
    return compact({
      ...head('WebPage', ctx),
      name: page.title,
      description: page.description,
      url: absolute(ctx.url, ctx.siteUrl),
    });
  },

  article(article: Article, ctx: JsonLdContext, opts: { type: ArticleType }): JsonLdArticle {
    return compact({
      ...head(opts.type, ctx),
      name: article.title,
      headline: article.title,
      description: article.description,
      image: imageUrl(article.image, ctx.siteUrl),
      url: absolute(ctx.url, ctx.siteUrl),
      datePublished: article.datePublished.toISOString(),
      dateModified: article.dateModified?.toISOString(),
      author: article.author === undefined ? undefined : { '@type': 'Person' as const, name: article.author },
    });
  },

  event(event: Event, ctx: JsonLdContext, opts: { type: EventType }): JsonLdEvent {
    return compact({
      ...head(opts.type, ctx),
      name: event.title,
      description: event.description,
      image: imageUrl(event.image, ctx.siteUrl),
      url: absolute(ctx.url, ctx.siteUrl),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      location: event.location === undefined ? undefined : { '@type': 'Place' as const, name: event.location },
    });
  },

  organization(org: Organization, ctx: JsonLdContext, opts: { type: OrganizationType }): JsonLdOrganization {
    return compact({
      ...head(opts.type, ctx),
      name: org.name,
      logo: imageUrl(org.logo, ctx.siteUrl),
      url: org.url === undefined ? undefined : absolute(org.url, ctx.siteUrl),
      description: org.description,
    });
  },

  person(person: Person, ctx: JsonLdContext): JsonLdPerson {
    return compact({
      ...head('Person', ctx),
      name: person.name,
      description: person.role,
      image: imageUrl(person.image, ctx.siteUrl),
      email: person.email,
    });
  },

  product(product: Product, ctx: JsonLdContext, opts: { type: ProductType }): JsonLdProduct {
    return compact({
      ...head(opts.type, ctx),
      name: product.title,
      description: product.description,
      image: imageUrl(product.image, ctx.siteUrl),
      url: absolute(ctx.url, ctx.siteUrl),
    });
  },
};
