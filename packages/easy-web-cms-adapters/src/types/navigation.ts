import type { NavItem } from './site-config.js';

export interface NavigationConfig {
  main: {
    de: NavItem[];
    en: NavItem[];
  };
  legal: {
    de: NavItem[];
    en: NavItem[];
  };
}
