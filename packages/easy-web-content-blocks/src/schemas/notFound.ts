/**
 * Not-found (404) singleton schema — locale-keyed CMS-editable content.
 *
 * Each locale key maps to an optional set of fields rendered by the site's
 * 404 page. All fields are optional so partial translations are valid; a
 * consuming page falls back to defaults when a field is absent.
 *
 * The record key is an open `z.string()` so any IETF locale tag (e.g. `de`,
 * `en`, `fr`, `sq`, `de-AT`) is accepted without schema changes. Do NOT add
 * SEO metadata (title, canonical) here — those belong to the page layer.
 *
 * Usage:
 *
 * ```ts
 * import { notFoundSchema } from '@achimismaili/easy-web-content-blocks/schemas/notFound';
 *
 * const data = notFoundSchema.parse(await import('../content/not-found.json'));
 * ```
 *
 * @see docs/decisions/0011-content-architecture-strategy.md
 * @see docs/decisions/0013-shared-not-found-primitives.md
 */
import { z } from 'zod';

export const localizedNotFoundSchema = z.object({
  image: z.string().optional(),
  heading: z.string().optional(),
  message: z.string().optional(),
});

export const notFoundSchema = z.record(z.string(), localizedNotFoundSchema);

export type NotFoundData = z.infer<typeof notFoundSchema>;
