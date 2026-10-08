import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { Image } from './types.js';

export interface HasImage {
  image: Image;
}

export interface HasPhotos {
  photos: Image[];
}

export type RenderedContent = AstroComponentFactory;

export interface HasBody {
  Content: RenderedContent;
}

export interface Linkable {
  href: string;
}

export type Rendered<Data> = Data & HasBody;
