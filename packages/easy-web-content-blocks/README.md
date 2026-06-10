# @itci/easy-web-content-blocks

Reusable Astro content-block components for the IT-CI ismaili.de web ecosystem. Sixteen pure-Astro components covering page chrome (Header, Footer, ThemeToggle, LanguageSwitch), hero/CTA/contact sections, cards and grids, gallery, blog post cards, legal-page layouts, banners, and styled prose. All components use the `--ew-*` design tokens from `@itci/easy-web-theme-core`; no styling system of their own.

## Installation

```bash
pnpm add @itci/easy-web-content-blocks
```

This package is hosted on the `websites` Azure Artifacts feed. Ensure your `.npmrc` is configured to point to that feed (see consuming-instance setup in the [WebSites repo](https://dev.azure.com/IT-CI/WebSites/_git/WebSites)).

### Peer dependencies

* `astro >= 6.0.0`

You almost certainly also want `@itci/easy-web-theme-core` (for the `--ew-*` token CSS) and, if you build a bilingual site, `@itci/easy-web-i18n` (for the alternate-link helper used by `LanguageSwitch`).

## Import convention

Components ship as **raw `.astro` files**. There is no JavaScript barrel. Import each component from its component path:

```astro
---
import Header from '@itci/easy-web-content-blocks/components/Header';
import Footer from '@itci/easy-web-content-blocks/components/Footer';
import Hero from '@itci/easy-web-content-blocks/components/Hero';
import Section from '@itci/easy-web-content-blocks/components/Section';
import CardGrid from '@itci/easy-web-content-blocks/components/CardGrid';
import Card from '@itci/easy-web-content-blocks/components/Card';
---
```

The package's `package.json` exports map declares `./components/*` → `./src/components/*.astro`, so Astro consumes the source files directly — no build step is involved on the package side for the components themselves.

## Quick start

### Layout — wire Header and Footer into your base layout

```astro
---
// src/layouts/Base.astro
import '@itci/easy-web-theme-core/tokens.css';
import { noFlashScript } from '@itci/easy-web-theme-core';
import Header from '@itci/easy-web-content-blocks/components/Header';
import Footer from '@itci/easy-web-content-blocks/components/Footer';
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
import Hero from '@itci/easy-web-content-blocks/components/Hero';
import Section from '@itci/easy-web-content-blocks/components/Section';
import CardGrid from '@itci/easy-web-content-blocks/components/CardGrid';
import Card from '@itci/easy-web-content-blocks/components/Card';
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

All components use the `--ew-*` design tokens from `@itci/easy-web-theme-core`. None ship their own theme system; they inherit whatever tokens are loaded in the consuming page.

### Site chrome

| Component | Required props | Optional props | Notes |
| :--- | :--- | :--- | :--- |
| `Header` | `siteName: string`, `navItems: Array<{ label: string; href: string }>`, `currentLang: string`, `pathname: string` | `alternateHref?: string`, `menuLabel?: string` | Sticky responsive header. Mobile hamburger menu (vanilla JS, no framework). Renders nested `ThemeToggle` + `LanguageSwitch`. Highlights the nav item matching `pathname`. |
| `Footer` | `siteName: string`, `legalLinks: Array<{ label: string; href: string }>` | — | Simple copyright + legal-link footer. |
| `ThemeToggle` | — | — | Light / dark / system trio button. Talks to `@itci/easy-web-theme-core` via `data-theme` on `<html>` and `localStorage`. |
| `LanguageSwitch` | `currentLang: string`, `pathname: string` | `alternateHref?: string` | DE ↔ EN switcher. If `alternateHref` is provided, links there directly; otherwise infers the alternate path from `pathname`. |

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
| `Gallery` | `images: Array<{ src: string; alt: string }>` | `title?: string` | Pure CSS grid image gallery (3 / 2 / 1 columns responsive). All images `loading="lazy"`. No lightbox, no JavaScript. Renders nothing when `images` is empty. |

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

All components reference the `@itci/easy-web-theme-core` CSS custom properties:

* Colors: `--ew-surface`, `--ew-on-surface`, `--ew-surface-muted`, `--ew-primary`, `--ew-on-primary`, `--ew-border`, `--ew-muted`
* Typography: `--ew-font-sans`, `--ew-text-{xs,sm,base,lg,xl,2xl,3xl}`, `--ew-leading-{tight,normal,loose}`
* Spacing: `--ew-space-{0..12}`
* Radii: `--ew-radius-{sm,md,lg,xl,full}`

To re-skin a site, override these custom properties on a parent element (or globally on `:root`) — do not edit the components.

Components use BEM-style class names prefixed with `ew-` (e.g., `.ew-hero`, `.ew-hero__title`, `.ew-hero--centered`). Selectors are intentionally specific enough to be styled via standard CSS overrides without `!important`.

## Adoption status

The [package adoption matrix](https://dev.azure.com/IT-CI/WebSites/_git/WebSites?path=/docs/architecture/package-adoption.md) tracks which sites consume which version of this package. As of 2026-06-10:

* `dev.ismaili.de` (pilot) — `^0.2.0`
* `harleyrentflorida.de` (customer) — `^0.1.0` (one minor behind; bump pending while `/preview` is paused)

## See also

* [`@itci/easy-web-theme-core`](https://dev.azure.com/IT-CI/WebSites/_git/easy-web?path=/packages/theme-core/README.md) — the design-token package these components consume.
* [`@itci/easy-web-i18n`](https://dev.azure.com/IT-CI/WebSites/_git/easy-web?path=/packages/i18n/README.md) — Astro + Paraglide bilingual utilities used together with `LanguageSwitch`.
* [`easy-web/AGENTS.md`](https://dev.azure.com/IT-CI/WebSites/_git/easy-web?path=/AGENTS.md) — repo orientation and publishing workflow.
