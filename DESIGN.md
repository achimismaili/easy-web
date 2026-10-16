# easy-web Design System

This file codifies the design system that already exists in this repository. It proposes no rebrand and adds no tokens. It was extracted on 2026-10-16 from `packages/core/styles/tokens.css`, the 32 `.astro` files in `packages/core/src/components`, the showcase app (`apps/showcase`) and the Starlight docs app (`apps/docs`). Token usage counts below come from searching those components, not from intent.

Three surfaces share one vocabulary:

| Surface | Owns the page chrome | Uses `--ew-*` for |
| :--- | :--- | :--- |
| `@easy-web/core` components | core | everything |
| `apps/showcase` | core components, plus `showcase.css` and the theme overrides | everything; overrides brand tokens only |
| `apps/docs` | Starlight (`--sl-*`) | live specimens only, inside `CorePreview` |

How to use this file:

- Read it before touching UI. A value that is not named here is not part of the system.
- Extend this file first, then `packages/core/styles/tokens.css`. The stylesheet is capped at 8 KB by `bundle-budget.test.ts`, and the link and text contrast contract is enforced by `contrast.test.ts`.
- `packages/core/src/theme/tokens.ts` mirrors every custom property as a `var(--ew-*)` string. Keep the two in step.
- Anything this file lists as an open finding (Section 8) is a known deviation from the rules below, not permission to repeat it.

## 1. Atmosphere & Identity

A quiet, unbranded canvas for content-first sites. A page is a white or near-black field, set in the platform's system font, divided into full-width bands by one hairline and one tonal step. Whitespace is generous (four to six rem above and below a band), corners are softly rounded, and almost nothing moves. The system is built to wear someone else's brand: a site changes colour by overriding a handful of tokens, never by restyling a component.

The signature is hairline structure with one swappable brand colour. Every surface is `--ew-surface` or `--ew-surface-muted`. Structure is a 1px `--ew-border` line. Every brand decision, meaning the call-to-action fill, the link, the focus ring and the link-card hover edge, collapses into `--ew-primary` and its pair `--ew-on-primary`.

The showcase is the reference consumer: it overrides the primary to violet and four theme pages swap palette and font. The docs site keeps Starlight's own look and shows easy-web only as framed, non-interactive specimens.

## 2. Color

### Palette

Light values are declared in `:root`. Dark values apply under `[data-theme="dark"]`, and under the OS preference when no explicit theme is set (see Light and dark).

| Role | Token | Light | Dark | Used by |
| :--- | :--- | :--- | :--- | :--- |
| Surface | `--ew-surface` | #ffffff | #111827 | page background, cards, header, controls |
| Surface muted | `--ew-surface-muted` | #f3f4f6 | #1f2937 | hero, muted CTA, contact band, footer, notices, code, table head, hover washes |
| Text | `--ew-on-surface` | #111827 | #f9fafb | body text and headings |
| Muted text | `--ew-muted` | #6b7280 | #9ca3af | descriptions, captions, nav links at rest, footer text |
| Border | `--ew-border` | #d1d5db | #374151 | every hairline: cards, header, footer, banners, controls |
| Primary | `--ew-primary` | #2563eb | #60a5fa | CTA fill, links through `--ew-link`, focus ring, link-card hover edge, blockquote rule |
| On primary | `--ew-on-primary` | #ffffff | #08111f | text on a primary fill |
| Link | `--ew-link` | `var(--ew-primary)` | `var(--ew-primary)` | links in `Prose` and `LegalLayout` |
| Danger | `--ew-danger` | #dc2626 | #f87171 | `DemoLegalShell` disclaimer only |
| On danger | `--ew-on-danger` | #ffffff | #190404 | defined, not used by any component |
| Accent | `--ew-accent` | #f59e0b | #fbbf24 | defined, not used by any component |

`--ew-link` is declared once, in `:root`, as an alias of the primary. It is resolved at computed-value time, so it tracks the primary in every theme. Never copy it into a dark block.

### Ramps (theme-invariant, defined for consuming sites, no core component uses them)

| Step | `--ew-neutral-*` | `--ew-primary-*` |
| :--- | :--- | :--- |
| 50 | #f9fafb | #eff6ff |
| 100 | #f3f4f6 | #dbeafe |
| 200 | #e5e7eb | #bfdbfe |
| 300 | #d1d5db | #93c5fd |
| 400 | #9ca3af | #60a5fa |
| 500 | #6b7280 | #3b82f6 |
| 600 | #4b5563 | #2563eb |
| 700 | #374151 | #1d4ed8 |
| 800 | #1f2937 | #1e40af |
| 900 | #111827 | #1e3a8a |
| 950 | #030712 | #172554 |

### Media overlay tokens (theme-invariant: always a dark translucent layer over photography)

| Token | Value | Role |
| :--- | :--- | :--- |
| `--ew-overlay-bg` | rgba(0, 0, 0, 0.92) | lightbox backdrop |
| `--ew-overlay-fg` | #fff | text on the overlay |
| `--ew-overlay-gradient` | linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%) | scrim under slide text |
| `--ew-caption-gradient` | linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0)) | scrim under carousel captions |
| `--ew-control-fg` | #fff | arrow, close and dot glyphs |
| `--ew-control-bg`, `-hover`, `-strong`, `-strong-hover`, `-inverse`, `-inverse-hover` | black at 0.45, 0.7, 0.5, 0.75 and white at 0.15, 0.3 | gallery controls; the variants exist because the four gallery files use different opacities for the same role |
| `--ew-indicator-bg`, `-hover` | rgba(255,255,255,0.5), rgba(255,255,255,0.85) | slide indicator dots |

### Rules

- Brand a site by overriding `--ew-primary` and `--ew-on-primary`, plus `--ew-surface` and `--ew-on-surface` when the whole page is tinted, and optionally `--ew-font-sans`. Never restyle a component.
- If the brand primary misses 4.5:1 on `--ew-surface`, override `--ew-link`, not the link styling. The default token file says the same in its comments.
- Never introduce a colour that is not in these tables. Extend the tables first.
- The accent is decorative only. On a light surface it measures 2.15:1, so it never carries text, an icon, or a required component boundary.
- Primary marks actions, links and the keyboard focus ring. The one decorative use is the `Prose` blockquote rule; nothing else decorative takes it.
- Instance-only tokens are not part of the system (see finding F11).

### Light and dark

- Three theme states: explicit light (`data-theme="light"` on `<html>`), explicit dark (`data-theme="dark"`), and unset, which follows `prefers-color-scheme`.
- `noFlashScript` (from `@easy-web/core/theme`) applies a stored choice before first paint. `ThemeToggle` writes it under the `ew-theme` key through `applyTheme()`.
- Only colour tokens and shadow alphas change per theme. Spacing, type, radius and motion tokens are theme-invariant. Media overlay tokens never switch.
- A site's dark overrides must be declared twice: under `[data-theme="dark"]` and under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. The second selector has higher specificity than a bare `:root`, so an override written only for the first is bypassed for visitors whose OS is dark and who never touched the toggle (finding F10).
- The docs site does not render `ThemeToggle`: Starlight owns the `data-theme` attribute there, and its own switcher drives the specimens through the same tokens.

## 3. Typography

### Scale

All sizes are fluid `clamp()` tokens. There are no breakpoint font-size overrides. Pixel ranges assume a 16px root.

| Token | Definition | Range | Used for |
| :--- | :--- | :--- | :--- |
| `--ew-text-xs` | clamp(0.75rem, 0.72rem + 0.12vw, 0.8125rem) | 12 to 13px | article date metadata in core; code specimens and captions in the showcase |
| `--ew-text-sm` | clamp(0.875rem, 0.84rem + 0.14vw, 0.9375rem) | 14 to 15px | card description, nav links, footer, notices, table cells, code blocks |
| `--ew-text-base` | clamp(1rem, 0.96rem + 0.16vw, 1.0625rem) | 16 to 17px | body copy in `Prose` and `LegalLayout`, buttons, skip link |
| `--ew-text-lg` | clamp(1.125rem, 1.08rem + 0.2vw, 1.25rem) | 18 to 20px | card title, brand name, h3 in `Prose`, lead paragraphs |
| `--ew-text-xl` | clamp(1.25rem, 1.18rem + 0.28vw, 1.5rem) | 20 to 24px | section title, h2 in `Prose`, hero subtitle, CTA and contact body |
| `--ew-text-3xl` | clamp(1.875rem, 1.72rem + 0.62vw, 2.5rem) | 30 to 40px | hero title, CTA and contact heading, legal title, h1 in `Prose` |

There is no `2xl` step: the scale jumps from `xl` to `3xl`.

| Token | Value | Used for |
| :--- | :--- | :--- |
| `--ew-leading-tight` | 1.25 | headings and card titles |
| `--ew-leading-normal` | 1.5 | UI text and descriptions |
| `--ew-leading-loose` | 1.75 | long-form reading in `Prose` and `LegalLayout` |

Weights in use: 400 body, 500 nav links, 600 buttons, card titles and h3 to h6 in `Prose`, 700 section titles, h1 and h2 in `Prose`, the header brand and the legal title, 800 hero, CTA and contact headings. Letter spacing is `-0.01em` on the header brand and the 404 heading, and `0.04em` on the language switch code.

### Font stack

- Sans: `--ew-font-sans`, `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Mono: `--ew-font-mono`, `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`. Inline code is 0.9em; code inside `pre` is `--ew-text-sm`.
- `@easy-web/core/styles/fonts.css` is the opt-in self-hosted pair (Inter Variable and JetBrains Mono Variable). Import it after `tokens.css`; the site supplies the `.woff2` files under `/fonts/`.

### Rules

- Two families only: one sans, one mono.
- Body copy is never below `--ew-text-sm`. `--ew-text-xs` is for metadata, captions and code specimens only.
- Headings take their size from a token. A heading that wraps to four lines is too large.
- Reading measure is set by the container, not by the font size (Section 4).

## 4. Spacing & Layout

### Base unit

All spacing derives from 0.25rem (4px). Steps 1 to 4 are linear; the rest grow faster.

| Token | Value | Typical use |
| :--- | :--- | :--- |
| `--ew-space-0` | 0 | reset |
| `--ew-space-1` | 0.25rem (4px) | nav link gap, list item gap, icon button padding |
| `--ew-space-2` | 0.5rem (8px) | control padding, description offset, action gaps |
| `--ew-space-3` | 0.75rem (12px) | header and notice vertical padding |
| `--ew-space-4` | 1rem (16px) | card body padding, notice inline padding, code block padding |
| `--ew-space-5` | 1.5rem (24px) | page gutter, grid gap, section title offset |
| `--ew-space-6` | 2rem (32px) | footer padding, button offset |
| `--ew-space-7` | 3rem (48px) | heading top margin in `Prose` |
| `--ew-space-8` | 4rem (64px) | vertical padding of `Section`, `Prose`, `LegalLayout`, `ContactSection` |
| `--ew-space-9` | 6rem (96px) | vertical padding of `Hero` and `CtaSection` |
| `--ew-space-10`, `--ew-space-11` | 8rem, 12rem | defined, not used by core components |
| `--ew-space-12` | 16rem (256px) | vertical margin of the 404 body |

### Grid and widths

- Every full-width band has `padding-inline: var(--ew-space-5)` and an inner wrapper with a `max-width` and `margin: 0 auto`.
- Page container: 72rem (`Section`, header, footer, hero, CTA, contact). Reading column: 45rem (`Prose`, `LegalLayout`). Narrow text: 40rem (hero subtitle, CTA and contact body, 404 body). The showcase component gallery uses 60rem. These widths are literals in the components; there are no width tokens.
- `CardGrid`: one column, two from 640px, three from 1024px, gap `--ew-space-5`. Footer columns use `repeat(auto-fit, minmax(12rem, 1fr))`.
- Breakpoints: `--ew-bp-sm` 640px, `-md` 768px, `-lg` 1024px, `-xl` 1280px, `-2xl` 1536px, and the `breakpoints` export (numbers) in `@easy-web/core/theme`. CSS variables cannot be read in a media query, so they are reference values only. In use: 640 and 1024 (`CardGrid`), 768 (header collapses at 768 and below, footer goes to a row from 769), 480 and 1024 (gallery grids).

### Responsive rules

- Reflow to one readable column at 390px with no horizontal scroll of primary content. Only code blocks scroll, inside their own box (`overflow-x: auto`).
- The header collapses to a toggled panel at 768px and below (`aria-expanded` and `aria-controls` on the button, `data-open` on the panel). The footer stacks below 769px.
- Anchors that land under the sticky header carry `scroll-margin-top: var(--ew-space-9)`; the showcase gallery groups and specimens already do.
- Tokenize intent (spacing steps, gutters, section gaps). Keep browser mechanics raw: `auto`, `%`, `clamp()`, `minmax()`, intrinsic sizing.
- Asymmetric spacing is deliberate: `Prose` headings have a larger top margin than bottom margin so a heading sits closer to the text it introduces, and the 404 body's 16rem margin keeps the message clear of the header.

### Layering

`--ew-z-hide` -1, `-base` 0, `-raised` 1, `-dropdown` 1000, `-sticky` 1100, `-overlay` 1200, `-modal` 1300, `-popover` 1400, `-toast` 1500 are defined. No component reads them; the components use the literals 2, 100, 200 and 1000 (finding F8). Relative order is stable: carousel controls (2) below header (100) below flyout dropdown (200) below lightbox (1000).

## 5. Components

Documented by family. Every component is shared in code and imported from `@easy-web/core/components/<Name>`. The count and list of components is in `packages/core/src/components`.

### Page chrome: `PageShell`, `Header` family, `Footer`, `ThemeToggle`, `LanguageSwitch`

- **Structure:** `PageShell` renders the skip link, a `header` slot, `<main id="main-content" tabindex="-1">` and a `footer` slot. `Header` is `<header>` with a brand link, a menu button and a `<nav>` holding links plus an actions area (theme toggle and language switch by default).
- **Variants:** `Header`, `HeaderCentered` (brand centred, links split to both sides), `HeaderFlyout` (entries with children open dropdowns), `HeaderHideOnScroll` (slides away on scroll down, fixed to the viewport).
- **Spacing:** header inner `--ew-space-3` by `--ew-space-5`, links `--ew-space-2` by `--ew-space-3`, 72rem container.
- **States:** nav link rest `--ew-muted`; hover and active (`pathname === href`) `--ew-on-surface` on a `--ew-surface-muted` wash; controls hover to a `--ew-surface-muted` wash; `:focus-visible` is a 2px `--ew-primary` ring offset by 2px; mobile menu open is `aria-expanded="true"` and `data-open`.
- **Accessibility:** the skip link is the first focusable element and moves focus to `<main>`; `nav` has an accessible name from the built-in labels; the language switch's accessible name contains its visible label (WCAG 2.5.3); `locales` removes the switch on single-locale sites; built-in strings come from the `lang` prop (German and English) with `labels` overrides.
- **Motion:** none, except `HeaderHideOnScroll` (`transform` 0.3s).
- **Layout:** header is sticky (`top: 0`, z-index 100) with a 1px bottom hairline; `ThemeToggle` and `LanguageSwitch` share a 2.25rem control height; the footer is `--ew-surface-muted` with a top hairline.

### Sections: `Section`, `Hero`, `CtaSection`, `ContactSection`, `Prose`, `LegalLayout`

- **Structure:** each is a full-width band with an inner container. `Section` has an optional `<h2>`; `Hero` an `<h1>`, optional subtitle and optional call to action (rendered only when both label and href are given); `CtaSection` an `<h2>`, optional body and one button; `Prose` wraps rendered Markdown or plain HTML; `LegalLayout` is an `<article>` with `<h1>` and an updated line.
- **Variants:** `Hero` `centered` or `left-aligned`; `CtaSection` `default`, `muted` or `primary` (the button inverts on primary).
- **Spacing:** band padding `--ew-space-8` (`Section`, `Prose`, `LegalLayout`, `ContactSection`) or `--ew-space-9` (`Hero`, `CtaSection`).
- **States:** buttons hover with `opacity: 0.9`. Links inside `Prose` and `LegalLayout` use `--ew-link`, underlined, with a thicker underline on hover.
- **Accessibility:** one `<h1>` per page, supplied by `Hero`, `LegalLayout`, `NotFound` or the page's own heading. `Prose` styles h1 to h6, paragraphs, lists, blockquote (3px `--ew-primary` rule), code, `pre`, `hr`, images and tables, and forwards a caller's `class` together with the scope attribute so a page-scoped class still matches.
- **Motion:** none.
- **Layout:** stack. `Prose` holds a 45rem measure; the others hold 72rem.

### Cards: `Card`, `BlogPostCard`, `CardGrid`

- **Structure:** `Card` renders `<a>` when `item.href` is set, otherwise `<div>`; an optional 16:9 image, then a body with an `<h3>` title and a description. `BlogPostCard` is always a link and adds a `<time>`.
- **Contract:** pass `item` (`Item & Partial<Linkable>`; `Article & Linkable` for the blog card). Image alt text comes only from `item.image.alt`; the title is never a fallback. `imageSizes` sets `sizes` for a local asset. The individual legacy props (`title`, `description`, `href`, `image`, `imageAlt`) are deprecated and removed in 2.0.
- **Spacing:** body padding `--ew-space-4`; description offset `--ew-space-2`; grid gap `--ew-space-5`.
- **States:** a link card changes its border to `--ew-primary` on hover (finding F4). Keyboard focus relies on the browser's default ring (finding F6).
- **Layout:** `CardGrid` is a CSS grid, 1, 2 then 3 columns. Cards are flex columns with `overflow: hidden`, so the image takes the card's outer corner radius.

### Notices: `DraftBanner`, `LanguageNotice`, `NotFound`

- `DraftBanner` is a `role="status"` box with a 2px `--ew-border` edge; `LanguageNotice` is a 1px one in muted text. Both sit on `--ew-surface-muted` with `--ew-radius-md`.
- `NotFound` is a body block (no `html`, `head` or `body`): a centred `<section data-testid="not-found">` with `<h1>`, message, a primary link button home and an optional language link. German and English copy is built in; `heading`, `message` and `image` override it. It never uses `client:*` directives or auth imports, because a 404 is public.

### Media and galleries: `Media`, `GallerySection` and six gallery components

- `Media` renders any `Image` or `DecorativeImage` contract: a local asset becomes a responsive image with `srcset` and `sizes`, a string source stays a plain `<img>`. `UniversalMedia` is deprecated.
- Gallery components: `GalleryImageGrid`, `GalleryHeroSlider`, `GalleryCarousel`, `GalleryMasonryGrid`, `GalleryFeatureHighlight`, `GalleryLightboxGrid`; `GallerySection` picks one from a CMS entry's kind.
- Controls sit on the media overlay tokens, with a white focus ring on dark overlays and the primary ring elsewhere. Rounded-full dots and arrows use `--ew-radius-full`.

### SEO primitives (no visual output): `SeoHead`, `StructuredData`

### Specimen frames (showcase and docs only)

- **Showcase `Demo`:** a bordered `--ew-radius-lg` card with a muted name strip, a description, an optional live preview (`inert` when the specimen is page-level chrome), and a keyboard-focusable code block. Spacing is `--ew-space-3` to `--ew-space-5`.
- **Docs `CorePreview`:** a `<figure class="not-content">` with a muted caption strip and an `inert` stage, drawn with `--ew-*` tokens only. It imports `tokens.css` itself, so only pages that use it load the tokens. It is excluded from search with `data-pagefind-ignore`. The stage is `inert` because specimens must not add a second `<h1>`, a landmark or a dead link to a Starlight page.

## 6. Motion & Interaction

### Tokens

| Token | Value | Consumed by core components |
| :--- | :--- | :--- |
| `--ew-duration-instant`, `-fast`, `-normal`, `-moderate`, `-slow`, `-slower` | 0ms, 100ms, 200ms, 300ms, 500ms, 700ms | no |
| `--ew-ease-default`, `-in`, `-out`, `-in-out`, `-spring` | cubic-bezier(0.4,0,0.2,1), (0.4,0,1,1), (0,0,0.2,1), (0.4,0,0.6,1), (0.34,1.56,0.64,1) | no |

Under `prefers-reduced-motion: reduce`, `tokens.css` sets every duration token to 0ms. That helps only code that reads the tokens.

### Motion in use (literal values)

| Value | Where | What moves |
| :--- | :--- | :--- |
| 0.15s ease | gallery arrows, close and dot controls; hero-slider and feature-highlight call-to-action; lightbox item | background colour; dot `scale(1.25)` to `scale(1.3)`; call-to-action `translateY(-1px)` with `--ew-shadow-image`; lightbox item `scale(1.02)` |
| 0.2s ease | masonry and image-grid items | `scale(1.02)` on hover |
| 0.3s ease | `HeaderHideOnScroll` | `translateY(-100%)` |
| 0.4s and 0.6s ease | carousel and hero slider | slide `opacity` cross-fade |

Static components (cards, sections, notices, header, footer) change state instantly.

### Rules

- Do not animate layout properties (`width`, `height`, `margin`, `padding`, `top`, `left`). Motion is `transform`, `opacity` and, on small controls, paint-only `background`.
- Every interactive element has hover, active and focus states. Hover is a `--ew-surface-muted` wash on controls and nav, an edge change on link cards, and reduced opacity on filled buttons.
- Carousels and the hero slider read `prefers-reduced-motion` and drop their slide transition; hover scale and the hide-on-scroll slide do not yet (finding F5).
- New motion reads the duration and easing tokens, and ships with its reduced-motion path in the same change.
- Core ships no form controls, so disabled, loading and error states are not part of the system. Define them here before adding a form primitive.

## 7. Depth & Surface

### Strategy

Mixed. Borders and tonal steps structure the page; shadows are reserved for media and floating layers.

| Level | Value | Used by |
| :--- | :--- | :--- |
| Hairline | `1px solid var(--ew-border)` | cards, header bottom, footer top, controls, `LanguageNotice`, showcase specimens |
| Emphasis hairline | `2px solid var(--ew-border)` | `DraftBanner` |
| Tonal band | `--ew-surface-muted` fill | hero, muted CTA, contact, footer, notices, code and `pre`, table head |
| Floating panel | `--ew-surface` fill, `1px solid var(--ew-border)`, `--ew-radius-md`, z-index 200, no shadow | `HeaderFlyout` dropdown |
| Media scrim | `--ew-overlay-*`, `--ew-caption-gradient`, `--ew-control-*` | slide text, captions, lightbox |
| Media lift | `--ew-shadow-image` (0 4px 12px at 0.15), `--ew-shadow-image-strong` (0.2) | hero-slider and feature-highlight call-to-action on hover |
| Reserved shadow ladder | `--ew-shadow-xs`, `-sm`, `-md`, `-lg`, `-xl`, `-2xl`, `-inner` (alphas rise in dark mode so they stay visible) | popovers, dropdowns and modals; no core component consumes it yet |

Elevation by shadow needs a token from the ladder; no new literal shadows.

### Radius

| Token | Value | Used by |
| :--- | :--- | :--- |
| `--ew-radius-none` | 0 | defined, unused |
| `--ew-radius-sm` | 0.125rem | inline code in `Prose`, `HeaderFlyout` dropdown links |
| `--ew-radius-md` | 0.375rem | buttons, controls, nav links, notices, `pre`, images in `Prose` |
| `--ew-radius-lg` | 0.5rem | cards, specimen frames |
| `--ew-radius-xl` | 0.75rem | unused in core; the showcase CTA specimen applies it through a page class |
| `--ew-radius-full` | 9999px | gallery dots and arrows, showcase table-of-contents pills |

### Rules

- Nested corners are concentric. A card's image is clipped by the card's own radius rather than given a second one.
- A coloured edge is allowed for keyboard focus only. State is otherwise a wash or a glyph; the link-card hover edge is recorded as a deviation (F4) and is not a pattern to copy.
- `Prose` blockquote's 3px `--ew-primary` rule is typographic decoration, not state.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- **Target:** WCAG 2.1 AA, with the contrast floor at 4.5:1 for text under 24px (or 18.66px bold), 3:1 for larger text and for non-text boundaries a user needs to find a control. The 2.2 minimum target size of 24px holds for the controls (theme toggle 36px, menu button 32px).
- **Focus:** every interactive element shows a visible focus indicator, a 2px `--ew-primary` ring offset by 2px (`--ew-control-fg` on dark overlays). Where no rule exists the browser ring applies (finding F6).
- **Keyboard:** the skip link is first in tab order and moves focus to `<main>`; menu buttons expose `aria-expanded` and `aria-controls`; code blocks in the showcase specimens are `tabindex="0"` so they scroll by keyboard.
- **Motion:** `prefers-reduced-motion` is respected by the duration tokens, the carousel and the hero slider (finding F5 lists the gaps).
- **Language:** `<html lang>` is set per page, and built-in labels switch with the `lang` prop (German and English).
- **Images:** alt text comes from the image contract; a decorative image carries empty alt text or the `decorative` flag, and the title is never used as a fallback.
- **Landmarks:** one `<main>`, one banner and one content-info per page. Specimens that contain page-level chrome, an `<h1>` or links that go nowhere are `inert` (showcase `Demo` for chrome, docs `CorePreview` always).
- **Docs shell:** Starlight's navigation, search, table of contents, theme switcher and mobile menu are not replaced or restyled. Specimens sit in `.not-content`, are `inert`, and are excluded from the search index, so the page keeps one `<h1>`, an unchanged heading order and clean search results.

### Measured contrast of the default tokens

Computed with the WCAG 2.1 relative-luminance formula, the same one `contrast.test.ts` uses. Rows marked with an asterisk are below the floor for their use.

| Pair | Light | Dark |
| :--- | :--- | :--- |
| `--ew-on-surface` on `--ew-surface` | 17.74:1 | 16.98:1 |
| `--ew-on-surface` on `--ew-surface-muted` | 16.12:1 | 14.05:1 |
| `--ew-muted` on `--ew-surface` | 4.83:1 | 6.99:1 |
| `--ew-muted` on `--ew-surface-muted` | 4.39:1 * | 5.78:1 |
| `--ew-link` (primary) on `--ew-surface` | 5.17:1 | 6.98:1 |
| `--ew-link` (primary) on `--ew-surface-muted` | 4.70:1 | 5.77:1 |
| `--ew-on-primary` on `--ew-primary` | 5.17:1 | 7.44:1 |
| `--ew-danger` on `--ew-surface` | 4.83:1 | 6.41:1 |
| `--ew-on-danger` on `--ew-danger` | 4.83:1 | 7.16:1 |
| `--ew-border` on `--ew-surface` (hairline, never the only carrier of meaning) | 1.47:1 | 1.72:1 |
| `--ew-accent` on `--ew-surface` (decorative only) | 2.15:1 | 10.63:1 |

`contrast.test.ts` guards two of these rows: link on surface and text on surface, in all three theme scopes.

### Accepted Debt

None. No deviation in this file has been accepted by an owner. This change adds no new debt: the docs `CorePreview` frame and the showcase edits use tokens only, and every finding below predates it.

### Open findings (located, not accepted, not changed by this task)

Each finding is awaiting an owner decision. Core changes reach every site instance, so they follow the pilot-first path (change in core, validate on the pilot instance, then roll out).

| ID | Finding | Location | Affected users | Suggested fix |
| :--- | :--- | :--- | :--- | :--- |
| F1 | Muted text on a muted surface is 4.39:1 in the light theme, under 4.5:1. The dark theme passes (5.78:1). | `--ew-muted` and `--ew-surface-muted` in `tokens.css`; selectors `.ew-footer__copyright`, `.ew-footer__link`, `.ew-hero__subtitle`, `.ew-contact__body`, `.ew-language-notice__text` | low-vision users in the light theme | Use an existing darker step for text on muted surfaces (`--ew-neutral-600` is 6.87:1 on `--ew-surface-muted`); extend `contrast.test.ts` to cover `--ew-muted` |
| F2 | Showcase palettes below AA. Sunset (light): primary on surface 3.61:1, white on primary 3.79:1, so links, `Hero` and CTA buttons fall short. Forest (light): core muted on its surface 4.45:1. Ocean (4.51:1) and Earth (4.60:1) pass narrowly. | `apps/showcase/src/styles/themes/sunset.css` (`--ew-primary` line 5, `--ew-on-primary` line 7) and `forest.css` (`--ew-surface` line 9) | low-vision users on the Sunset and Forest theme pages | Override `--ew-link` as the token file advises, choose a primary whose on-primary pair reaches 4.5:1 |
| F3 | Core defaults are the only palette the contrast test covers; instance and theme overrides are unchecked. | `contrast.test.ts` | every instance | Run the same pair check in the showcase against each theme |
| F4 | Link-card hover is a coloured border on a rounded surface, not a wash. | `.ew-card--link:hover` in `Card.astro`; `.ew-blog-card:hover` in `BlogPostCard.astro` | sighted users who rely on hover affordance; low salience (1px edge) | Replace with a `--ew-surface-muted` wash and keep the focus ring |
| F5 | Motion tokens are unused. Durations are literals (0.15s, 0.2s, 0.3s, 0.4s, 0.6s), so the token-level reduced-motion rule never reaches them. Only the carousel and hero slider drop their slide transition; hover scale and the hide-on-scroll slide have no reduced-motion path. | `GalleryCarousel`, `GalleryHeroSlider`, `GalleryLightboxGrid`, `GalleryMasonryGrid`, `GalleryImageGrid`, `GalleryFeatureHighlight`, `HeaderHideOnScroll` | users with vestibular sensitivity (small effects) | Read `--ew-duration-*` and `--ew-ease-*`; the existing reduced-motion block then zeroes them |
| F6 | No explicit `:focus-visible` rule on these links and buttons, so the browser's default ring applies. | `Hero` CTA, `CtaSection` button, `ContactSection` button, `Card`, `BlogPostCard`, links in `Prose` and `LegalLayout` | keyboard users | Add the shared 2px `--ew-primary` ring |
| F7 | Primary button hover is built two ways: `opacity: 0.9` and `filter: brightness(0.95)`. | `Hero`, `CtaSection`, `ContactSection` versus `NotFound` | all users (consistency only) | Pick one and share it |
| F8 | Literal z-index (2, 100, 200, 1000) and literal breakpoints (480, 640, 768, 769, 1024), with `max-width` queries in the header and gallery families and `min-width` in `CardGrid` and `Footer`; `--ew-z-*` and `--ew-bp-*` are unused. | header family, `PageShell`, `HeaderFlyout`, `GalleryLightboxGrid`, gallery grids, `Footer`, `CardGrid` | developers (maintenance) | Read `--ew-z-*`; standardise on mobile-first `min-width` |
| F9 | Raw hex fallbacks in a CSS variable and a 3px edge. | `DemoLegalShell.astro` lines 30 and 31 (`var(--ew-danger, #b00020)`, `var(--ew-surface, #fff)`) | developers (maintenance) | Drop the fallbacks; the tokens are always defined |
| F10 | The showcase overrides dark colours only under `[data-theme="dark"]`. For a visitor whose OS is dark and who has not used the toggle, core's higher-specificity `:root:not([data-theme="light"])` block wins, so the violet brand and the four theme palettes are bypassed. | `apps/showcase/src/styles/showcase.css`; `apps/showcase/src/styles/themes/*.css` | visitors with an OS-level dark preference | Declare the dark overrides in both dark selectors (Section 2, Light and dark) |
| F11 | `--ew-primary-container` and `--ew-on-primary-container` are declared for light and dark but read nowhere. | `apps/showcase/src/styles/showcase.css` lines 3, 5, 13, 15; `themes/*.css` | developers (dead tokens) | Remove them, or promote them to core together with a consumer |
| F12 | Three theme files import Google Fonts over the network at page load. Core's `fonts.css` is the self-hosted pattern. | `apps/showcase/src/styles/themes/ocean.css`, `sunset.css`, `forest.css` (line 1) | visitors on those pages (third-party request, render-blocking import) | Self-host through the `fonts.css` pattern |
| F13 | The theme pages still pass the deprecated individual Card props instead of `item`. | `apps/showcase/src/pages/themes/index.astro`, `ocean.astro`, `earth.astro`, `sunset.astro`, `forest.astro` | developers (deprecated API, removed in 2.0) | Migrate to `item` as the home and guide pages now do |
