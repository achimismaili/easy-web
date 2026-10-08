import type { Image } from './types.js';
import type { AnyImage } from './types.js';
import type { Link, NavItem } from './types.js';
import type { Labels } from '../components/labels.js';

export type GalleryItem = Image & {
    readonly caption?: string;
    readonly title?: string;
    readonly subtitle?: string;
    readonly description?: string;
    readonly href?: string;
    readonly cta?: string;
    readonly imagePosition?: 'left' | 'right';
};

// -- Section components and NotFound --
// The section components take no `lang`/`labels`: they render no fixed copy.

export interface HeroProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  variant?: 'centered' | 'left-aligned';
  /** Extra classes for the root `<section>`, after `ew-hero`. */
  class?: string;
}

export interface SectionProps {
  title?: string;
  id?: string;
  /** Extra classes for the root `<section>`, after `ew-section`. */
  class?: string;
}

export interface CtaSectionProps {
  heading: string;
  body?: string;
  buttonLabel: string;
  buttonHref: string;
  variant?: 'default' | 'muted' | 'primary';
  /** Extra classes for the root `<section>`, after `ew-cta`. */
  class?: string;
}

export interface ContactSectionProps {
  heading: string;
  body?: string;
  email: string;
  buttonLabel: string;
  /** Extra classes for the root `<section>`, after `ew-contact`. */
  class?: string;
}

export interface DraftBannerProps {
  message: string;
  /** Extra classes for the root `<div>`, after `ew-draft-banner`. */
  class?: string;
}

export interface LanguageNoticeProps {
  message: string;
  /** Extra classes for the root `<div>`, after `ew-language-notice`. */
  class?: string;
}

export interface LegalLayoutProps {
  title: string;
  lastUpdated?: string;
  /** Extra classes for the root `<article>`, after `ew-legal`. */
  class?: string;
}

export interface ProseProps {
  /** Extra classes for the root `<div>`, after `ew-prose`. */
  class?: string;
}

export interface NotFoundProps {
  /** Current page locale (e.g. `"de"`, `"en"`). */
  currentLang: string;
  /** Site default locale - used for `rootHref` auto-compute and the fallback copy. */
  defaultLocale: string;
  /** Explicit back-home link. Auto-computed from `currentLang` vs `defaultLocale` when omitted. */
  rootHref?: string;
  /** Alternate locale URL. When present, renders a language switcher link. */
  alternateHref?: string;
  /** CMS override for the `<h1>` heading (falls back to the inline copy). */
  heading?: string;
  /** CMS override for the paragraph message (falls back to the inline copy). */
  message?: string;
  /**
   * Illustration above the heading. An `Image` or `DecorativeImage` renders
   * through `Media`, so a local asset gets a `srcset`. A plain path string is
   * the legacy form: it renders as a decorative `<img alt="">`, exactly as
   * before; an empty string renders no image.
   */
  image?: AnyImage | string;
}

// -- Site chrome: header family, ThemeToggle, LanguageSwitch, PageShell, Footer --

export type { Labels };

/**
 * Built-in strings of a component. `lang` picks the dictionary (default `'en'`,
 * so output without it is unchanged; unknown languages fall back to English)
 * and `labels` overrides single keys. Each component reads only the keys it
 * renders, so one `labels` object can be shared by all of them.
 */
export interface LocalizedLabelsProps {
  lang?: string;
  labels?: Partial<Labels>;
}

/** Props shared by `Header`, `HeaderCentered`, `HeaderHideOnScroll` and `HeaderFlyout`. */
export interface HeaderVariantProps extends LocalizedLabelsProps {
  siteName: string;
  /** Navigation entries; only `HeaderFlyout` renders `children`, as dropdowns. */
  navItems: NavItem[];
  currentLang: string;
  pathname: string;
  /** Explicit alternate locale URL to pass to LanguageSwitch. */
  alternateHref?: string;
  /** Accessible label of the mobile menu button. Defaults to `labels.toggleNavigationMenu`. */
  menuLabel?: string;
  /**
   * Brand logo, rendered through `Media` in place of the site name text. A URL
   * string renders a plain `<img>` with the site name as alt text, exactly as
   * before; an `Image` brings its own alt text, and a local asset gets a `srcset`.
   */
  logo?: string | Image;
  /**
   * DOM id linking the menu button's `aria-controls` to the `<nav>`; in
   * `HeaderFlyout` also the prefix of each dropdown's id. Stable by default so
   * builds are reproducible. Override only when rendering more than one of the
   * same header variant on a single page.
   */
  navId?: string;
  /**
   * Locales this site actually serves. When it holds a single entry the
   * language switch is omitted, because on a one-locale site it is a control
   * that navigates to a route the site does not build. Omit the prop to keep
   * the switch rendering unconditionally.
   */
  locales?: readonly string[];
}

export interface HeaderProps extends HeaderVariantProps {
  /** Explicit brand link href. Falls back to `/` (de) or `/${currentLang}/` (other). */
  brandHref?: string;
}

export type HeaderCenteredProps = HeaderVariantProps;
export type HeaderHideOnScrollProps = HeaderVariantProps;
export type HeaderFlyoutProps = HeaderVariantProps;

export interface ThemeToggleProps extends LocalizedLabelsProps {
  /** Accessible label and tooltip of the button. Defaults to `labels.toggleColorTheme`. */
  label?: string;
}

export interface LanguageAlternate {
  /** Language code of the target page; rendered as `hreflang`. */
  lang: string;
  href: string;
  /** Visible link text. Defaults to the upper-cased language code. */
  label?: string;
}

export interface LanguageSwitchProps extends LocalizedLabelsProps {
  /** Current page language, e.g. "de" or "en". */
  currentLang: string;
  /** Current page pathname, e.g. "/" or "/en/about". */
  pathname: string;
  /** The default locale that uses bare paths (no prefix). Defaults to "de". */
  defaultLocale?: string;
  /** Explicit alternate URL for translated slugs (e.g. /en/privacy for /datenschutz). Bypasses automatic derivation. */
  alternateHref?: string;
  /** Accessible label of the derived link. Not applied to `alternates`. */
  ariaLabel?: string;
  /**
   * One link per alternate version of the page, in place of the derived
   * two-locale link. Each link is named by `labels.switchToLanguage`, with the
   * visible label when one is given, else the language code.
   */
  alternates?: LanguageAlternate[];
}

export interface PageShellProps extends LocalizedLabelsProps {
  /** id of the <main> element and the skip link's target. */
  mainId?: string;
  /** Skip-link text. Defaults to `labels.skipToMainContent`. */
  skipLabel?: string;
  /** Extra class(es) for the <main> element. */
  class?: string;
}

/** A group of footer links, rendered above the copyright and legal row. */
export interface FooterColumn {
  title?: string;
  /** Links of the group; an `external` link gets `rel="external"`. */
  links: Link[];
}

/** `Footer` also takes a named `actions` slot, rendered after the legal links. */
export interface FooterProps extends LocalizedLabelsProps {
  siteName: string;
  /** Links of the legal navigation, which is named by `labels.legal`. */
  legalLinks: Link[];
  currentYear?: number;
  columns?: FooterColumn[];
}
