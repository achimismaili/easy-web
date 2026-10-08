/**
 * Astro hands the parent template's `data-astro-cid-*` scope attribute to every
 * child component as a prop. A component that puts a caller's `class` on its
 * root must put that attribute there too, or the caller's scoped rule for the
 * class never matches. Without a class nothing is forwarded, so a call without
 * `class` renders exactly as before.
 */
export function scopeAttributes(className: string | undefined, props: object): Record<string, unknown> {
  if (!className) return {};
  return Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith('data-astro-cid-')));
}
