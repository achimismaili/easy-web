import type { NavItem } from './site-config.js';

/** @deprecated Define content with `field`, `fieldSets`, `defineContentType`, and `defineSingleton` instead. */
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
