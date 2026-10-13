/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface LinkFrontmatter {
  title: string;
  url: string;
  description?: string;
  category?: string;
  locale: 'de' | 'en';
  translationKey: string;
  image?: string;
  featured?: boolean;
}
