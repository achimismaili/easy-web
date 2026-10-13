/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
}

/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface FooterColumn {
  title: string;
  links: NavItem[];
}

/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface SocialLink {
  label: string;
  href: string;
  icon?: string;
}

/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
export interface SiteConfig {
  companyName: string;
  defaultTitle: string;
  url: string;
  navigation?: NavItem[];
  footer?: FooterColumn[];
  socialLinks?: SocialLink[];
}
