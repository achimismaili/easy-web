import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { CurrencyCode } from '../i18n/locale-inputs.js';
import type { Link } from './types.js';
import type { Image } from './types.js';

export interface HasTitle {
  readonly title: string;
}

export interface HasSlug {
  readonly slug: string;
}

export interface HasSummary {
  readonly summary: string;
}

export interface HasImage {
  image: Image;
}

export interface HasPhotos {
  photos: Image[];
}

export interface HasOrder {
  readonly order: number;
}

export interface HasTaxonomy {
  readonly taxonomy: readonly string[];
}

export interface HasPublication {
  readonly publishDate: Date;
  readonly modifiedDate?: Date;
}

export interface HasSchedule {
  readonly startDate: Date;
  readonly endDate?: Date;
}

export interface HasLocation {
  readonly location: string;
}

export interface HasCta {
  readonly cta: Link;
}

export interface HasMoney {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export interface HasFeatured {
  readonly featured: boolean;
}

export type RenderedContent = AstroComponentFactory;

export interface HasBody {
  Content: RenderedContent;
}

export interface Linkable {
  href: string;
}

export type Rendered<Data> = Data & HasBody;
