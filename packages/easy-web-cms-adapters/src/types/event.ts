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
