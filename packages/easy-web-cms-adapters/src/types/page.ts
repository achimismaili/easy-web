export interface PageFrontmatter {
  title: string;
  description: string;
  image?: string;
  locale: 'de' | 'en';
  translationKey: string;
  layout?: string;
}
