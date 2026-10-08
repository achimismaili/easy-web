import type { ImageMetadata } from 'astro';

export type ImageSource = ImageMetadata | string;

export interface Image {
  src: ImageSource;
  alt: string;
  caption?: string;
}

export interface DecorativeImage {
  src: ImageSource;
  decorative: true;
  caption?: string;
}

export type AnyImage = Image | DecorativeImage;

export interface Link {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavItem extends Link {
  children?: NavItem[];
  order?: number;
}

export interface SocialLink {
  network: string;
  url: string;
  label?: string;
}

export type Localized<T> = Readonly<Record<string, T>>;

export interface Navigation {
  mainNav: Localized<NavItem[]>;
  legalNav: Localized<NavItem[]>;
  footerNav?: Localized<NavItem[]>;
  resourceLinks?: Localized<NavItem[]>;
  socialLinks?: SocialLink[];
  skipLabel?: Localized<string>;
}

export interface SiteSettings {
  siteName: string;
}

export interface NotFoundEntry {
  image?: AnyImage;
  heading?: string;
  message?: string;
}

export type NotFoundContent = Localized<NotFoundEntry>;

export interface Item {
  title: string;
  description?: string;
  image?: Image;
  order?: number;
}

export interface Page extends Item {
  description: string;
}

export interface Article extends Item {
  datePublished: Date;
  dateModified?: Date;
  author?: string;
  tags?: string[];
}

export interface Event extends Item {
  startDate: Date;
  endDate?: Date;
  location?: string;
}

export interface Organization {
  name: string;
  logo: Image;
  url?: string;
  description?: string;
}

export interface Person {
  name: string;
  role?: string;
  image?: Image;
  email?: string;
}

export interface Product extends Item {
  image: Image;
}
