export interface Labels {
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
}

const en: Labels = {
  carousel: 'carousel', slide: 'slide', imageCarousel: 'Image carousel', heroSlider: 'Hero slider',
  previousSlide: 'Previous slide', nextSlide: 'Next slide', slideNavigation: 'Slide navigation',
  goToSlide: 'Go to slide {number}', slidePosition: '{number} / {total}',
  openImage: 'Open {alt}', imageLightbox: 'Image lightbox', closeLightbox: 'Close lightbox',
  previousImage: 'Previous image', nextImage: 'Next image',
};

const de: Labels = {
  carousel: 'Karussell', slide: 'Folie', imageCarousel: 'Bilderkarussell', heroSlider: 'Hero-Slider',
  previousSlide: 'Vorherige Folie', nextSlide: 'Nächste Folie', slideNavigation: 'Foliennavigation',
  goToSlide: 'Zu Folie {number}', slidePosition: '{number} / {total}',
  openImage: '{alt} öffnen', imageLightbox: 'Bildansicht', closeLightbox: 'Bildansicht schließen',
  previousImage: 'Vorheriges Bild', nextImage: 'Nächstes Bild',
};

const dictionaries: Record<string, Labels> = { en, de };

export function resolveLabels(lang = 'en', overrides?: Partial<Labels>): Labels {
  return { ...(dictionaries[lang] ?? dictionaries.en), ...overrides };
}

export type GalleryLabelProps = { readonly lang?: string; readonly labels?: Partial<Labels> };
