/**
 * Gallery content collection schema — discriminated union over supported variants.
 *
 * Each entry under a consuming site's `src/content/galleries/` selects a `kind`
 * that determines which Astro component renders it. Pages decide which entry
 * to load and where to place it; the entry decides what to show and how it is
 * laid out.
 *
 * Supported kinds: `image-grid`, `hero-slider`, `carousel`, `masonry-grid`,
 * `feature-highlight`, `lightbox-grid`. Adding a new kind requires updating
 * this union AND adding the matching component in `../components/`. Authoring
 * an unsupported `kind` fails Zod validation at build time.
 *
 * Usage:
 *
 * ```ts
 * import { defineCollection } from 'astro:content';
 * import { glob } from 'astro/loaders';
 * import { gallerySchema } from '@achimismaili/easy-web-content-blocks/schemas/galleries';
 *
 * const galleries = defineCollection({
 *   loader: glob({ pattern: '**\/*.{yml,yaml}', base: './src/content/galleries' }),
 *   schema: gallerySchema,
 * });
 * ```
 */
import { z } from 'zod';

const galleryImageGridSchema = z.object({
  kind: z.literal('image-grid'),
  title: z.string().optional(),
  locale: z.enum(['de', 'en']),
  translationKey: z.string(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)]).default(3),
  gap: z.enum(['sm', 'md', 'lg']).default('md'),
  aspectRatio: z.enum(['square', '4/3', '16/9', 'auto']).default('square'),
  items: z.array(z.object({
    src: z.string().min(1),
    alt: z.string(),
    caption: z.string().optional(),
    href: z.string().optional(),
  })).min(1),
});

const galleryHeroSliderSchema = z.object({
  kind: z.literal('hero-slider'),
  title: z.string().optional(),
  locale: z.enum(['de', 'en']),
  translationKey: z.string(),
  autoplay: z.boolean().default(true),
  interval: z.number().int().positive().default(5000),
  height: z.enum(['sm', 'md', 'lg', 'full']).default('lg'),
  slides: z.array(z.object({
    src: z.string().min(1),
    alt: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    href: z.string().optional(),
    cta: z.string().optional(),
  })).min(1),
});

const galleryCarouselSchema = z.object({
  kind: z.literal('carousel'),
  title: z.string().optional(),
  locale: z.enum(['de', 'en']),
  translationKey: z.string(),
  autoplay: z.boolean().default(false),
  interval: z.number().int().positive().default(4000),
  showDots: z.boolean().default(true),
  showArrows: z.boolean().default(true),
  slides: z.array(z.object({
    src: z.string().min(1),
    alt: z.string(),
    caption: z.string().optional(),
  })).min(1),
});

const galleryMasonryGridSchema = z.object({
  kind: z.literal('masonry-grid'),
  title: z.string().optional(),
  locale: z.enum(['de', 'en']),
  translationKey: z.string(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  gap: z.enum(['sm', 'md', 'lg']).default('md'),
  items: z.array(z.object({
    src: z.string().min(1),
    alt: z.string(),
    caption: z.string().optional(),
    href: z.string().optional(),
  })).min(1),
});

const galleryFeatureHighlightSchema = z.object({
  kind: z.literal('feature-highlight'),
  title: z.string().optional(),
  locale: z.enum(['de', 'en']),
  translationKey: z.string(),
  gap: z.enum(['sm', 'md', 'lg']).default('lg'),
  items: z.array(z.object({
    src: z.string().min(1),
    alt: z.string(),
    title: z.string(),
    description: z.string(),
    href: z.string().optional(),
    cta: z.string().optional(),
    imagePosition: z.enum(['left', 'right']).optional(),
  })).min(1),
});

const galleryLightboxGridSchema = z.object({
  kind: z.literal('lightbox-grid'),
  title: z.string().optional(),
  locale: z.enum(['de', 'en']),
  translationKey: z.string(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  gap: z.enum(['sm', 'md', 'lg']).default('md'),
  aspectRatio: z.enum(['square', '4/3', 'auto']).default('square'),
  items: z.array(z.object({
    src: z.string().min(1),
    alt: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
  })).min(1),
});

export const gallerySchema = z.discriminatedUnion('kind', [
  galleryImageGridSchema,
  galleryHeroSliderSchema,
  galleryCarouselSchema,
  galleryMasonryGridSchema,
  galleryFeatureHighlightSchema,
  galleryLightboxGridSchema,
]);

export type GalleryEntry = z.infer<typeof gallerySchema>;
export type GalleryImageGridData = z.infer<typeof galleryImageGridSchema>;
export type GalleryHeroSliderData = z.infer<typeof galleryHeroSliderSchema>;
export type GalleryCarouselData = z.infer<typeof galleryCarouselSchema>;
export type GalleryMasonryGridData = z.infer<typeof galleryMasonryGridSchema>;
export type GalleryFeatureHighlightData = z.infer<typeof galleryFeatureHighlightSchema>;
export type GalleryLightboxGridData = z.infer<typeof galleryLightboxGridSchema>;

export const GALLERY_KINDS = [
  'image-grid',
  'hero-slider',
  'carousel',
  'masonry-grid',
  'feature-highlight',
  'lightbox-grid',
] as const;
export type GalleryKind = typeof GALLERY_KINDS[number];
