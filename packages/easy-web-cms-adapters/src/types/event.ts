/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface EventFrontmatter {
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location?: string;
  locale: 'de' | 'en';
  translationKey: string;
  image?: string;
  featured?: boolean;
}
