# @achimismaili/easy-web-content-blocks

Reusable Astro content-block components for the IT-CI ismaili.de web ecosystem. Twenty-two pure-Astro components covering page chrome (Header, Footer, ThemeToggle, LanguageSwitch), hero/CTA/contact sections, cards and grids, a CMS-driven gallery system with six variants, blog post cards, legal-page layouts, banners, and styled prose. All components use the `--ew-*` design tokens from `@achimismaili/easy-web-theme-core`; no styling system of their own.

## Installation

```bash
pnpm add @achimismaili/easy-web-content-blocks
```

This package is published to npm. Install it like any other npm package.

### Peer dependencies

* `astro >= 6.0.0`

You almost certainly also want `@achimismaili/easy-web-theme-core` (for the `--ew-*` token CSS) and, if you build a bilingual site, `@achimismaili/easy-web-i18n` (for the alternate-link helper used by `LanguageSwitch`).

## Import convention

Components ship as **raw `.astro` files**. There is no JavaScript barrel. Import each component from its component path:

```astro
---
import Header from '@achimismaili/easy-web-content-blocks/components/Header';
import Footer from '@achimismaili/easy-web-content-blocks/components/Footer';
import Hero from '@achimismaili/easy-web-content-blocks/components/Hero';
import Section from '@achimismaili/easy-web-content-blocks/components/Section';
import CardGrid from '@achimismaili/easy-web-content-blocks/components/CardGrid';
import Card from '@achimismaili/easy-web-content-blocks/components/Card';
---
```

The package's `package.json` exports map declares `./components/*` → `./src/components/*.astro`, so Astro consumes the source files directly — no build step is involved on the package side for the components themselves.

## Quick start

### Layout — wire Header and Footer into your base layout

```astro
---
// src/layouts/Base.astro
import '@achimismaili/easy-web-theme-core/tokens.css';
import { noFlashScript } from '@achimismaili/easy-web-theme-core';
import Header from '@achimismaili/easy-web-content-blocks/components/Header';
import Footer from '@achimismaili/easy-web-content-blocks/components/Footer';
import { siteConfig } from '../config';

interface Props {
  lang: string;
  title: string;
  pathname: string;
  alternateHref?: string;
}
const { lang, title, pathname, alternateHref } = Astro.props;
const navItems = siteConfig.navItems[lang];
const legalLinks = siteConfig.legalLinks[lang];
---
<html lang={lang}>
  <head>
    <script is:inline set:html={noFlashScript}></script>
    <title>{title}</title>
  </head>
  <body>
    <Header
      siteName={siteConfig.siteName}
      navItems={navItems}
      currentLang={lang}
      pathname={pathname}
      alternateHref={alternateHref}
    />
    <slot />
    <Footer siteName={siteConfig.siteName} legalLinks={legalLinks} />
  </body>
</html>
```

### Page — compose Hero + Section + CardGrid + Card

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Base.astro';
import Hero from '@achimismaili/easy-web-content-blocks/components/Hero';
import Section from '@achimismaili/easy-web-content-blocks/components/Section';
import CardGrid from '@achimismaili/easy-web-content-blocks/components/CardGrid';
import Card from '@achimismaili/easy-web-content-blocks/components/Card';
---
<Layout lang="de" title="Home" pathname="/">
  <Hero
    title="Willkommen"
    subtitle="Untertitel mit Beschreibung"
    ctaLabel="Mehr erfahren"
    ctaHref="#about"
  />
  <Section id="about">
    <h2>Über uns</h2>
    <p>Inhalt …</p>
  </Section>
  <Section>
    <CardGrid>
      <Card title="Erste Karte" description="Kurze Beschreibung" href="/a" />
      <Card title="Zweite Karte" description="Kurze Beschreibung" href="/b" />
      <Card title="Dritte Karte" description="Kurze Beschreibung" href="/c" />
    </CardGrid>
  </Section>
</Layout>
```

## Component reference

All components use the `--ew-*` design tokens from `@achimismaili/easy-web-theme-core`. None ship their own theme system; they inherit whatever tokens are loaded in the consuming page.

### Site chrome

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `Header` | `siteName: string`, `navItems: NavItem[]`, `currentLang: string`, `pathname: string` | `alternateHref?: string`, `menuLabel?: string` | Sticky responsive header with `actions` slot. Mobile hamburger menu (scoped vanilla JS). Default slot fallback renders `ThemeToggle` + `LanguageSwitch`. `data-testid="header-classic"`. |
| `HeaderCentered` | `siteName: string`, `navItems: NavItem[]`, `currentLang: string`, `pathname: string` | `alternateHref?: string`, `menuLabel?: string` | Variant: brand centered, nav links split left/right. Same `actions` slot and mobile hamburger. `data-testid="header-centered"`. |
| `HeaderHideOnScroll` | `siteName: string`, `navItems: NavItem[]`, `currentLang: string`, `pathname: string` | `alternateHref?: string`, `menuLabel?: string` | Variant: `position: fixed` header that slides off screen on scroll-down, reappears on scroll-up. Compensates body padding via JS. `data-testid="header-hide-on-scroll"`. |
| `HeaderFlyout` | `siteName: string`, `navItems: NavItem[]`, `currentLang: string`, `pathname: string` | `alternateHref?: string`, `menuLabel?: string` | Variant: items with `children[]` show a flyout dropdown (hover/focus desktop, click mobile, keyboard accessible). `data-testid="header-flyout"`. |
| `Footer` | `siteName: string`, `legalLinks: Array<{ label: string; href: string }>` | — | Simple copyright + legal-link footer. |
| `ThemeToggle` | — | — | Light / dark / system trio button. Talks to `@achimismaili/easy-web-theme-core` via `data-theme` on `<html>` and `localStorage`. |
| `LanguageSwitch` | `currentLang: string`, `pathname: string` | `alternateHref?: string` | DE ↔ EN switcher. If `alternateHref` is provided, links there directly; otherwise infers the alternate path from `pathname`. |

#### Header `actions` slot

All four header variants expose a named `actions` slot. When the slot receives content, it replaces the default `ThemeToggle` + `LanguageSwitch` controls. When the slot is empty, the fallback renders those controls unchanged (backward compatible).

```astro
---
import Header from '@achimismaili/easy-web-content-blocks/components/Header';
import HeaderCentered from '@achimismaili/easy-web-content-blocks/components/HeaderCentered';
import HeaderHideOnScroll from '@achimismaili/easy-web-content-blocks/components/HeaderHideOnScroll';
import HeaderFlyout from '@achimismaili/easy-web-content-blocks/components/HeaderFlyout';
---

<!-- Default: ThemeToggle + LanguageSwitch rendered automatically -->
<Header siteName="My Site" navItems={navItems} currentLang="de" pathname={pathname} />

<!-- Custom slot content replaces ThemeToggle + LanguageSwitch -->
<HeaderCentered siteName="My Site" navItems={navItems} currentLang="de" pathname={pathname}>
  <fragment slot="actions">
    <MyCustomButton />
  </fragment>
</HeaderCentered>

<!-- Flyout: navItems may include children[] for dropdown panels -->
<HeaderFlyout siteName="My Site" navItems={navItemsWithChildren} currentLang="de" pathname={pathname} />
```

Selecting the header variant in a Base layout via a `headerVariant` prop:

```astro
---
// Base.astro
import Header from '@achimismaili/easy-web-content-blocks/components/Header';
import HeaderCentered from '@achimismaili/easy-web-content-blocks/components/HeaderCentered';
import HeaderHideOnScroll from '@achimismaili/easy-web-content-blocks/components/HeaderHideOnScroll';
import HeaderFlyout from '@achimismaili/easy-web-content-blocks/components/HeaderFlyout';

interface Props {
  headerVariant?: 'classic' | 'centered' | 'hide-on-scroll' | 'flyout';
  // …other props
}
const { headerVariant = 'classic' } = Astro.props;
const HeaderComponents = { classic: Header, centered: HeaderCentered, 'hide-on-scroll': HeaderHideOnScroll, flyout: HeaderFlyout };
const ActiveHeader = HeaderComponents[headerVariant];
---
<ActiveHeader siteName={siteName} navItems={navItems} currentLang={lang} pathname={pathname} alternateHref={alternateHref} />
```

### Hero / call-to-action / contact

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `Hero` | `title: string` | `subtitle?: string`, `ctaLabel?: string`, `ctaHref?: string`, `variant?: 'centered' \| 'left-aligned'` | Page banner with optional CTA. CTA renders only when both `ctaLabel` and `ctaHref` are present. |
| `CtaSection` | `heading: string`, `buttonLabel: string`, `buttonHref: string` | `body?: string`, `variant?: 'default' \| 'muted' \| 'primary'` | Standalone CTA banner. `primary` variant inverts colors to brand. |
| `ContactSection` | `heading: string`, `email: string`, `buttonLabel: string` | `body?: string` | Centered mailto-only contact CTA. Button is `mailto:${email}`. |

### Structural

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `Section` | — | `id?: string`, `class?: string` | Generic content wrapper. `id` enables anchor-link targets. Slot-based. |
| `CardGrid` | — | — | Responsive CSS grid (3 → 2 → 1 columns by breakpoint). Slot in `Card`s. |
| `Card` | `title: string` | `description?: string`, `href?: string`, `image?: string`, `imageAlt?: string` | Content card. Renders as `<a>` when `href` is provided, plain `<div>` otherwise. Image is `loading="lazy"`. |

### Gallery system

The gallery system is **CMS-driven**: content authors create gallery entries in their site's `src/content/galleries/` directory; pages decide which entry to load and where to place it. Each entry has a `kind` field that selects the rendering variant.

Six variants are available:

| `kind` | Component | Use case |
| :--- | :--- | :--- |
| `image-grid` | `GalleryImageGrid` | Static N-column uniform grid. Component previews, team photos, sponsors. |
| `hero-slider` | `GalleryHeroSlider` | Full-bleed editorial carousel with title + subtitle + optional CTA per slide. |
| `carousel` | `GalleryCarousel` | Image slider with optional captions. Constrained-width container; no per-slide CTA. |
| `masonry-grid` | `GalleryMasonryGrid` | Pinterest-style variable-height grid via CSS columns. Photography, portfolios. |
| `feature-highlight` | `GalleryFeatureHighlight` | Alternating image+text+link rows. Product feature showcase, service descriptions. |
| `lightbox-grid` | `GalleryLightboxGrid` | Uniform grid + click-to-expand modal. Photo albums, event galleries. Vanilla JS modal with keyboard navigation. |

Schema is exported from this package and consumed by each instance's `content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { gallerySchema } from '@achimismaili/easy-web-content-blocks/schemas/galleries';

const galleries = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './src/content/galleries' }),
  schema: gallerySchema,
});
```

Use the `GallerySection` dispatcher in pages — it switches on `entry.data.kind` and renders the right variant:

```astro
---
import GallerySection from '@achimismaili/easy-web-content-blocks/components/GallerySection';
import { getEntry } from 'astro:content';

const heroEntry = await getEntry('galleries', 'home-hero-de');
const previewEntry = await getEntry('galleries', 'about-component-preview-de');
---
<GallerySection entry={heroEntry} />
<!-- ...other page content... -->
<GallerySection entry={previewEntry} />
```

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `GallerySection` | `entry: { data: GalleryEntry }` | — | Dispatcher. Renders the correct variant based on `entry.data.kind`. Renders nothing when `entry` is null/undefined. |
| `GalleryImageGrid` | `items: GalleryImageGridData['items']` | `title?`, `columns?: 2 \| 3 \| 4 \| 6`, `gap?: 'sm' \| 'md' \| 'lg'`, `aspectRatio?: 'square' \| '4/3' \| '16/9' \| 'auto'` | Pure CSS grid (responsive). Item `href` wraps in `<a>`. Item `caption` renders as `<figcaption>`. |
| `GalleryHeroSlider` | `slides: GalleryHeroSliderData['slides']` | `title?`, `autoplay?: boolean`, `interval?: number` (ms), `height?: 'sm' \| 'md' \| 'lg' \| 'full'` | Vanilla JS slider. Pause on hover/focus, keyboard arrows, dot navigation, respects `prefers-reduced-motion`. |
| `GalleryCarousel` | `slides: GalleryCarouselData['slides']` | `title?`, `autoplay?: boolean` (default `false`), `interval?: number`, `showDots?: boolean`, `showArrows?: boolean` | Constrained-width slider with optional per-slide caption (overlay at bottom). Same JS controls as `GalleryHeroSlider`. |
| `GalleryMasonryGrid` | `items: GalleryMasonryGridData['items']` | `title?`, `columns?: 2 \| 3 \| 4`, `gap?: 'sm' \| 'md' \| 'lg'` | Pure CSS columns; no JS. `break-inside: avoid` keeps items intact. Falls back to fewer columns on smaller breakpoints. |
| `GalleryFeatureHighlight` | `items: GalleryFeatureHighlightData['items']` | `title?`, `gap?: 'sm' \| 'md' \| 'lg'` | Alternating image-left / image-right rows; per-item `imagePosition` overrides the alternation. Stacks on mobile (image first). |
| `GalleryLightboxGrid` | `items: GalleryLightboxGridData['items']` | `title?`, `columns?: 2 \| 3 \| 4`, `gap?: 'sm' \| 'md' \| 'lg'`, `aspectRatio?: 'square' \| '4/3' \| 'auto'` | Grid + modal lightbox. Click image to expand; keyboard `Esc`/arrows navigate; backdrop click closes; restores focus to trigger on close. Body scroll locked while open. |

### Blog

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `BlogPostCard` | `title: string`, `description: string`, `href: string`, `pubDate: Date` | `heroImage?: string`, `heroImageAlt?: string`, `locale?: string` | Linked card for blog index pages. Date is `Intl.DateTimeFormat`-formatted with the provided `locale`. |

### Legal & long-form

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `LegalLayout` | — | (slot-based) | Narrow content wrapper for impressum / datenschutz / AGB. Constrains line-length for legal prose. |
| `Prose` | — | (slot-based) | Styled wrapper for Markdown/HTML content (`<h1>`–`<h6>`, `<p>`, `<ul>`, `<a>`, `<blockquote>`, `<code>`, etc.) using `--ew-*` typography tokens. |

### Banners / notices

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `DraftBanner` | — | (slot-based, expects a short message) | Banner notice for draft content. |
| `LanguageNotice` | — | (slot-based, expects a translation-status message) | Banner notice when a page is shown in the non-current locale or has a partial translation. |

## Styling

All components reference the `@achimismaili/easy-web-theme-core` CSS custom properties:

* Colors: `--ew-surface`, `--ew-on-surface`, `--ew-surface-muted`, `--ew-primary`, `--ew-on-primary`, `--ew-border`, `--ew-muted`
* Typography: `--ew-font-sans`, `--ew-text-{xs,sm,base,lg,xl,2xl,3xl}`, `--ew-leading-{tight,normal,loose}`
* Spacing: `--ew-space-{0..12}`
* Radii: `--ew-radius-{sm,md,lg,xl,full}`

To re-skin a site, override these custom properties on a parent element (or globally on `:root`) — do not edit the components.

Components use BEM-style class names prefixed with `ew-` (e.g., `.ew-hero`, `.ew-hero__title`, `.ew-hero--centered`). Selectors are intentionally specific enough to be styled via standard CSS overrides without `!important`.

## Adoption status

The [package adoption matrix](https://github.com/achimismaili/websites/blob/main/docs/architecture/package-adoption.md) tracks which sites consume which version of this package. As of 2026-06-10:

* `dev.ismaili.de` (pilot) — `^0.2.0`
* `harleyrentflorida.de` (customer) — `^0.1.0` (one minor behind; bump pending while `/preview` is paused)

## See also

* [`@achimismaili/easy-web-theme-core`](https://github.com/achimismaili/easy-web/blob/main/packages/theme-core/README.md) — the design-token package these components consume.
* [`@achimismaili/easy-web-i18n`](https://github.com/achimismaili/easy-web/blob/main/packages/i18n/README.md) — Astro + Paraglide bilingual utilities used together with `LanguageSwitch`.
* [`easy-web/AGENTS.md`](https://github.com/achimismaili/easy-web/blob/main/AGENTS.md) — repo orientation and publishing workflow.
