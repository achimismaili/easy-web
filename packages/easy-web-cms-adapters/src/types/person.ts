export interface PersonFrontmatter {
  name: string;
  role: string;
  locale: 'de' | 'en';
  translationKey: string;
  image?: string;
  email?: string;
  featured?: boolean;
  order?: number;
}
