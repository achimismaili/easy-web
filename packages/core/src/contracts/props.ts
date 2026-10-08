import type { Image } from './types.js';
import type { AnyImage } from './types.js';

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
