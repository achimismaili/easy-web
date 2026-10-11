import { z } from 'astro/zod';
import { currencyCodeSchema } from '../i18n/locale-inputs.js';

const imageSourceSchema = z.union([
  z.string().min(1),
  z.object({ src: z.string().min(1) }).passthrough(),
]);

const imageSchema = z.object({
  src: imageSourceSchema,
  alt: z.string().min(1),
  caption: z.string().optional(),
}).strict().readonly();

const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
}).strict().readonly();

const titleShape = { title: z.string().min(1) };
const slugShape = { slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase kebab-case') };
const summaryShape = { summary: z.string().min(1) };
const bodyShape = { body: z.string().min(1) };
const imageShape = { image: imageSchema };
const photosShape = { photos: z.array(imageSchema).readonly() };
const orderShape = { order: z.number().int() };
const taxonomyShape = { taxonomy: z.array(z.string().min(1)).readonly() };
const publicationShape = { publishDate: z.date(), modifiedDate: z.date().optional() };
const scheduleShape = { startDate: z.date(), endDate: z.date().optional() };
const locationShape = { location: z.string().min(1) };
const ctaShape = { cta: linkSchema };
const moneyShape = { amount: z.number().finite(), currency: currencyCodeSchema };
const featuredShape = { featured: z.boolean() };

export const contentTraits = [
  'title',
  'slug',
  'summary',
  'body',
  'image',
  'photos',
  'order',
  'taxonomy',
  'publication',
  'schedule',
  'location',
  'cta',
  'money',
  'featured',
] as const;

export const contentTraitSchema = z.enum(contentTraits);
export type ContentTrait = z.infer<typeof contentTraitSchema>;

export const titleTraitSchema = z.object(titleShape).strict().readonly();
export const slugTraitSchema = z.object(slugShape).strict().readonly();
export const summaryTraitSchema = z.object(summaryShape).strict().readonly();
export const bodyTraitSchema = z.object(bodyShape).strict().readonly();
export const imageTraitSchema = z.object(imageShape).strict().readonly();
export const photosTraitSchema = z.object(photosShape).strict().readonly();
export const orderTraitSchema = z.object(orderShape).strict().readonly();
export const taxonomyTraitSchema = z.object(taxonomyShape).strict().readonly();
export const publicationTraitSchema = z.object(publicationShape).strict().readonly();
export const scheduleTraitSchema = z.object(scheduleShape).strict().readonly();
export const locationTraitSchema = z.object(locationShape).strict().readonly();
export const ctaTraitSchema = z.object(ctaShape).strict().readonly();
export const moneyTraitSchema = z.object(moneyShape).strict().readonly();
export const featuredTraitSchema = z.object(featuredShape).strict().readonly();

export type TitleTrait = z.infer<typeof titleTraitSchema>;
export type SlugTrait = z.infer<typeof slugTraitSchema>;
export type SummaryTrait = z.infer<typeof summaryTraitSchema>;
export type BodyTrait = z.infer<typeof bodyTraitSchema>;
export type ImageTrait = z.infer<typeof imageTraitSchema>;
export type PhotosTrait = z.infer<typeof photosTraitSchema>;
export type OrderTrait = z.infer<typeof orderTraitSchema>;
export type TaxonomyTrait = z.infer<typeof taxonomyTraitSchema>;
export type PublicationTrait = z.infer<typeof publicationTraitSchema>;
export type ScheduleTrait = z.infer<typeof scheduleTraitSchema>;
export type LocationTrait = z.infer<typeof locationTraitSchema>;
export type CtaTrait = z.infer<typeof ctaTraitSchema>;
export type MoneyTrait = z.infer<typeof moneyTraitSchema>;
export type FeaturedTrait = z.infer<typeof featuredTraitSchema>;

const contentTraitShapes = {
  title: titleShape,
  slug: slugShape,
  summary: summaryShape,
  body: bodyShape,
  image: imageShape,
  photos: photosShape,
  order: orderShape,
  taxonomy: taxonomyShape,
  publication: publicationShape,
  schedule: scheduleShape,
  location: locationShape,
  cta: ctaShape,
  money: moneyShape,
  featured: featuredShape,
} satisfies Record<ContentTrait, Record<string, z.ZodTypeAny>>;

export function composeContentTraitSchema(traits: readonly ContentTrait[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const trait of traits) Object.assign(shape, contentTraitShapes[trait]);
  return z.object(shape).strict().readonly();
}
