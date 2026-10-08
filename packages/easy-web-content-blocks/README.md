# @easy-web/content-blocks (deprecated)

This package is a compatibility layer. The Astro components and content schemas now live in [`@easy-web/core`](../core/README.md). Every component here is a thin wrapper that renders the core component with the same props and slots, so the HTML a site ships is unchanged, but new code should import from `@easy-web/core`.

| Old import | New import |
| :--- | :--- |
| `import X from '@easy-web/content-blocks/components/X'` | `import X from '@easy-web/core/components/X'` |
| `import X from '@easy-web/content-blocks/components/X.astro'` | `import X from '@easy-web/core/components/X.astro'` |
| `import { gallerySchema } from '@easy-web/content-blocks/schemas/galleries'` | `import { gallerySchema } from '@easy-web/core/schemas/galleries'` |
| `import { notFoundSchema } from '@easy-web/content-blocks/schemas/notFound'` | `import { notFoundSchema } from '@easy-web/core/schemas/notFound'` |

`X` is any of: BlogPostCard, Card, CardGrid, ContactSection, CtaSection, DraftBanner, Footer, GalleryCarousel, GalleryFeatureHighlight, GalleryHeroSlider, GalleryImageGrid, GalleryLightboxGrid, GalleryMasonryGrid, GallerySection, Header, HeaderCentered, HeaderFlyout, HeaderHideOnScroll, Hero, LanguageNotice, LanguageSwitch, LegalLayout, NotFound, PageShell, Prose, Section, ThemeToggle, UniversalMedia.

The core schemas import `z` from `astro/zod`; the `zod` peer dependency is kept here only so existing installs keep resolving. See [MIGRATION.md](MIGRATION.md) for older migration notes.
