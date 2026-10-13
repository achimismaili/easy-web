/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface BlogFrontmatter {
  title: string;
  description: string;
  pubDate: Date;
  draft: boolean;
  locale: 'de' | 'en';
  translationKey: string;
  heroImage?: string;
}
