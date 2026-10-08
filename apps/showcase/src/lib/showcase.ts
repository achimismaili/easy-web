import type { ImageMetadata } from 'astro';
import type { Image } from '@easy-web/core/contracts';
import coast from '../assets/coast.jpg';
import dunes from '../assets/dunes.jpg';
import hills from '../assets/hills.jpg';
import peaks from '../assets/peaks.jpg';

export type ShowcaseLang = 'en' | 'de';

const rawBase = import.meta.env.BASE_URL;
/** Site base with exactly one trailing slash, e.g. `/easy-web/`. */
export const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

/** A page of this site in a language: `href('de', 'guide/')` is `/easy-web/de/guide/`. */
export const href = (lang: ShowcaseLang, path = ''): string =>
  `${base}${lang === 'en' ? '' : `${lang}/`}${path}`;

/** A file under `public/images/`, addressed through the site base. */
const publicImage = (file: string): string => `${base}images/${file}`;

/** An image whose source is a local asset: it renders with a `srcset`. */
export type AssetImage = Image & { readonly src: ImageMetadata };
/** An image whose source is a public path: it renders as a plain `<img>`. */
export type PathImage = Image & { readonly src: string };

export interface ShowcaseMedia {
  readonly assets: Readonly<Record<'hills' | 'dunes' | 'coast' | 'peaks', AssetImage>>;
  readonly paths: Readonly<Record<'lake' | 'meadow' | 'aurora', PathImage>>;
  readonly logo: PathImage;
}

const alt = {
  hills: { en: 'Layered violet hills under a rising sun', de: 'Violette Hügelketten unter der aufgehenden Sonne' },
  dunes: { en: 'Amber sand dunes beneath a pale sun', de: 'Bernsteinfarbene Sanddünen unter einer blassen Sonne' },
  coast: { en: 'Teal waves rolling onto a sandy beach', de: 'Türkisfarbene Wellen rollen auf einen Sandstrand' },
  peaks: { en: 'Snow-capped peaks under a starry sky', de: 'Schneebedeckte Gipfel unter einem Sternenhimmel' },
  lake: { en: 'A still lake mirroring a violet sunset', de: 'Ein stiller See spiegelt einen violetten Sonnenuntergang' },
  meadow: { en: 'A green meadow dotted with flowers', de: 'Eine grüne Wiese voller Blumen' },
  aurora: { en: 'Green aurora ribbons above a dark ridge', de: 'Grüne Polarlichter über einem dunklen Bergkamm' },
} as const satisfies Record<string, Record<ShowcaseLang, string>>;

/** The demo images in both media kinds, with alt text in the page language. */
export function showcaseMedia(lang: ShowcaseLang): ShowcaseMedia {
  return {
    assets: {
      hills: { src: hills, alt: alt.hills[lang] },
      dunes: { src: dunes, alt: alt.dunes[lang] },
      coast: { src: coast, alt: alt.coast[lang] },
      peaks: { src: peaks, alt: alt.peaks[lang] },
    },
    paths: {
      lake: { src: publicImage('lake.jpg'), alt: alt.lake[lang] },
      meadow: { src: publicImage('meadow.jpg'), alt: alt.meadow[lang] },
      aurora: { src: publicImage('aurora.jpg'), alt: alt.aurora[lang] },
    },
    logo: { src: publicImage('logo.svg'), alt: 'easy-web' },
  };
}
