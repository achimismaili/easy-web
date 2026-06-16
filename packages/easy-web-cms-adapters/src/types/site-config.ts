export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: NavItem[];
}

export interface SocialLink {
  label: string;
  href: string;
  icon?: string;
}

export interface SiteConfig {
  companyName: string;
  defaultTitle: string;
  url: string;
  navigation?: NavItem[];
  footer?: FooterColumn[];
  socialLinks?: SocialLink[];
}
