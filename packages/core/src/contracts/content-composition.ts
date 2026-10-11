import { z } from 'astro/zod';
import { contentLocaleSchema, optionalCurrencyCodeSchema } from '../i18n/locale-inputs.js';
import { normalizeLocalizedPath, validateLocalizedPaths } from '../i18n/localized-paths.js';
import { contentTraitSchema, type ContentTrait } from './traits.js';

export const presentationBindings = ['homepage', 'list', 'detail', 'navigation', 'cms-admin'] as const;
export const presentationBindingSchema = z.enum(presentationBindings);
export type PresentationBinding = z.infer<typeof presentationBindingSchema>;

export const presentationBindingRequirements = {
  homepage: ['title', 'slug', 'image', 'featured'],
  list: ['title', 'slug'],
  detail: ['title', 'slug', 'body'],
  navigation: ['title', 'slug'],
  'cms-admin': ['title', 'slug'],
} as const satisfies Readonly<Record<PresentationBinding, readonly ContentTrait[]>>;

export const contentTypeIdSchema = z.string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Content type ID must use lowercase kebab-case')
  .brand<'ContentTypeId'>();
export type ContentTypeId = z.infer<typeof contentTypeIdSchema>;

const localizedTextSchema = z.record(z.string(), z.string().min(1)).readonly();
const localizedRoutesSchema = z.record(
  z.string(),
  z.string().regex(/^\/(?!\/)(?!.*[?#]).*$/, 'Route must be an absolute path without query or hash'),
).readonly();
const selectedTraitsSchema = z.array(contentTraitSchema).min(1).superRefine((traits, context) => {
  if (new Set(traits).size !== traits.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Selected traits must be unique' });
  }
}).readonly();
const selectedBindingsSchema = z.array(presentationBindingSchema).min(1).superRefine((bindings, context) => {
  if (new Set(bindings).size !== bindings.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Selected bindings must be unique' });
  }
}).readonly();

const contentTypeBaseShape = {
  id: contentTypeIdSchema,
  primary: z.boolean().default(false),
  labels: localizedTextSchema,
  routes: localizedRoutesSchema,
  bindings: selectedBindingsSchema,
};

const moneyContentTypeSchema = z.object({
  ...contentTypeBaseShape,
  traits: selectedTraitsSchema.refine((traits) => traits.includes('money'), 'Money selection must include the money trait'),
  currency: optionalCurrencyCodeSchema,
}).strict().readonly();

const nonMoneyContentTypeSchema = z.object({
  ...contentTypeBaseShape,
  traits: selectedTraitsSchema.refine((traits) => !traits.includes('money'), 'Non-money selection cannot include the money trait'),
}).strict().readonly();

export const contentTypeDefinitionSchema = z.union([moneyContentTypeSchema, nonMoneyContentTypeSchema]);
export type ContentTypeDefinition = z.infer<typeof contentTypeDefinitionSchema>;

export const defaultReservedContentRoutes = ['/', '/404/', '/admin/'] as const;

export const contentCompositionSchema = z.object({
  contentLocales: z.array(contentLocaleSchema).min(1).readonly(),
  contentTypes: z.array(contentTypeDefinitionSchema).readonly(),
  reservedRoutes: z.array(z.string()).default(() => [...defaultReservedContentRoutes]).readonly(),
}).strict().superRefine((composition, context) => {
  const locales = composition.contentLocales;
  const normalizedReserved = new Set(composition.reservedRoutes.map(normalizeLocalizedPath));
  const ids = new Map<string, number>();
  const routes = new Map<string, string>();
  let primaryId: string | undefined;

  composition.contentTypes.forEach((contentType, index) => {
    const path = ['contentTypes', index] as const;
    const existingId = ids.get(contentType.id);
    if (existingId !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'id'],
        message: `Duplicate content type ID "${contentType.id}"; first declared at contentTypes[${existingId}]`,
      });
    } else {
      ids.set(contentType.id, index);
    }

    if (contentType.primary) {
      if (primaryId !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, 'primary'],
          message: `Only one primary content type is allowed; "${primaryId}" is already primary`,
        });
      } else {
        primaryId = contentType.id;
      }
    }

    validateLocales(contentType, locales, path, context);
    validateBindings(contentType, path, context);
    validateRoutes(contentType, path, normalizedReserved, routes, context);
  });
}).readonly();

export type ContentComposition = z.infer<typeof contentCompositionSchema>;

function validateLocales(
  contentType: ContentTypeDefinition,
  locales: readonly string[],
  path: readonly (string | number)[],
  context: z.RefinementCtx,
): void {
  for (const [name, localized] of [['labels', contentType.labels], ['routes', contentType.routes]] as const) {
    const declared = Object.keys(localized);
    const missing = locales.filter((locale) => !declared.includes(locale));
    const unknown = declared.filter((locale) => !locales.includes(locale));
    if (missing.length > 0) context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, name],
      message: `Missing configured locale(s): ${missing.join(', ')}`,
    });
    if (unknown.length > 0) context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, name],
      message: `Unknown content locale(s): ${unknown.join(', ')}`,
    });
  }

  for (const problem of validateLocalizedPaths([contentType.routes], locales)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: [...path, 'routes'], message: problem });
  }
}

function validateBindings(
  contentType: ContentTypeDefinition,
  path: readonly (string | number)[],
  context: z.RefinementCtx,
): void {
  const selected = new Set(contentType.traits);
  for (const binding of contentType.bindings) {
    const missing = presentationBindingRequirements[binding].filter((trait) => !selected.has(trait));
    if (missing.length > 0) context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'bindings'],
      message: `Binding "${binding}" requires trait(s): ${missing.join(', ')}`,
    });
  }
}

function validateRoutes(
  contentType: ContentTypeDefinition,
  path: readonly (string | number)[],
  reserved: ReadonlySet<string>,
  routes: Map<string, string>,
  context: z.RefinementCtx,
): void {
  for (const route of Object.values(contentType.routes)) {
    const normalized = normalizeLocalizedPath(route);
    if (reserved.has(normalized)) context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'routes'],
      message: `Route "${route}" is reserved`,
    });
    const owner = routes.get(normalized);
    if (owner !== undefined && owner !== contentType.id) context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'routes'],
      message: `Route "${route}" collides with content type "${owner}"`,
    });
    routes.set(normalized, contentType.id);
  }
}

export function parseContentComposition(input: unknown): ContentComposition {
  return contentCompositionSchema.parse(input);
}
