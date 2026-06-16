export interface BlogFrontmatter {
  title: string;
  description: string;
  pubDate: Date;
  draft: boolean;
  locale: 'de' | 'en';
  translationKey: string;
  heroImage?: string;
}
