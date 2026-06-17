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
