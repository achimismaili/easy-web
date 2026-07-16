# @itci/easy-web-content-blocks

## 1.0.0

### Major Changes

- 82a0036: Declare astro peer range as >=6.0.0 <8.0.0 to match easy-web-i18n precedent.

### Minor Changes

- 0e16226: Add UniversalMedia dispatch tests and README documentation.

### Patch Changes

- @achimismaili/easy-web-theme-core@1.0.0

## 0.6.1

### Patch Changes

- 084ab66: Align `ThemeToggle` and `LanguageSwitch` to a shared header-control height (2.25rem / 36px) so the two utility controls form a consistent row inside the header actions area.
  - `ThemeToggle` becomes an explicit 36×36 square icon button (removes padding, adds `width`/`height`, sets `box-sizing: border-box`).
  - `LanguageSwitch` gains an explicit height of 36px, keeps `min-width: 2.5rem`, and switches to horizontal-only padding — vertical size is now driven by `height`, so its aspect ratio reads as "nearly square" next to the toggle instead of landscape.
  - Both use `box-sizing: border-box` for predictable sizing regardless of any downstream site's global reset.
  - No visual behaviour, no API change, no class-name change — this is a self-contained CSS-only refinement.

## 0.2.0

### Features

- `CtaSection` component — standalone call-to-action banner with three variants (`default`, `muted`, `primary`)
- `ContactSection` component — centered mailto-only contact CTA
- `Gallery` component — pure CSS grid image gallery, responsive 3 → 2 → 1 columns, no JavaScript, no lightbox

### Peer dependencies

- Bumped Astro peer dependency to `>= 6.0.0`

## 0.1.0

### Features

- Header component with responsive navigation and mobile hamburger menu
- ThemeToggle component for light/dark mode switching
- LanguageSwitch component for locale switching with alternate href support
- Footer component with copyright and legal links
- Hero component with centered/left-aligned variants and optional CTA
- Section component for content wrapping
- CardGrid component with responsive CSS grid
- Card component with optional image and link
- LegalLayout component for narrow legal content pages
- DraftBanner component for draft content notices
- LanguageNotice component for translation binding notices
- Prose component for styled Markdown/HTML content
- BlogPostCard component for blog listing cards
