/**
 * User-facing strings of the core components, one dictionary per UI language.
 *
 * Components never hardcode these strings. Each one accepts `lang` (default
 * 'en', so legacy output is unchanged) and `labels` (per-key overrides), calls
 * `resolveLabels(lang, labels)` and reads only the keys it renders. Unknown
 * languages fall back to the English dictionary.
 */
export interface Labels {
  mainNavigation: string;
  toggleNavigationMenu: string;
  toggleColorTheme: string;
  skipToMainContent: string;
  legal: string;
  carousel: string;
  slide: string;
  imageCarousel: string;
  heroSlider: string;
  previousSlide: string;
  nextSlide: string;
  slideNavigation: string;
  goToSlide: string;
  slidePosition: string;
  openImage: string;
  imageLightbox: string;
  closeLightbox: string;
  previousImage: string;
  nextImage: string;
  /** Accessible name of a language-switch link; receives the target language code. */
  switchToLanguage: (lang: string) => string;
}

const en: Labels = {
  mainNavigation: 'Main navigation',
  toggleNavigationMenu: 'Toggle navigation menu',
  toggleColorTheme: 'Toggle color theme (Darkmode)',
  skipToMainContent: 'Skip to main content',
  legal: 'Legal',
  carousel: 'carousel', slide: 'slide', imageCarousel: 'Image carousel', heroSlider: 'Hero slider',
  previousSlide: 'Previous slide', nextSlide: 'Next slide', slideNavigation: 'Slide navigation',
  goToSlide: 'Go to slide {number}', slidePosition: '{number} / {total}',
  openImage: 'Open {alt}', imageLightbox: 'Image lightbox', closeLightbox: 'Close lightbox',
  previousImage: 'Previous image', nextImage: 'Next image',
  switchToLanguage: (lang) => `Switch to ${lang}`,
};

const de: Labels = {
  mainNavigation: 'Hauptnavigation',
  toggleNavigationMenu: 'Navigationsmenü umschalten',
  toggleColorTheme: 'Farbschema wechseln (Darkmode)',
  skipToMainContent: 'Zum Hauptinhalt springen',
  legal: 'Rechtliches',
  carousel: 'Karussell', slide: 'Folie', imageCarousel: 'Bilderkarussell', heroSlider: 'Hero-Slider',
  previousSlide: 'Vorherige Folie', nextSlide: 'Nächste Folie', slideNavigation: 'Foliennavigation',
  goToSlide: 'Zu Folie {number}', slidePosition: '{number} / {total}',
  openImage: '{alt} öffnen', imageLightbox: 'Bildansicht', closeLightbox: 'Bildansicht schließen',
  previousImage: 'Vorheriges Bild', nextImage: 'Nächstes Bild',
  switchToLanguage: (lang) => `Wechseln zu ${lang}`,
};

const dictionaries: Record<string, Labels> = { en, de };

export function resolveLabels(lang = 'en', overrides?: Partial<Labels>): Labels {
  return { ...(dictionaries[lang] ?? dictionaries.en), ...overrides };
}

export type GalleryLabelProps = { readonly lang?: string; readonly labels?: Partial<Labels> };
