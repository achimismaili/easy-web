import type { HasOptionalOrder, HasSlug } from './capabilities.js';

export interface OrderedContentEntry extends HasOptionalOrder, HasSlug {
  readonly id: string;
}

function compareIdentifiers(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertValidOrder(order: number | undefined): void {
  if (order !== undefined && (!Number.isFinite(order) || !Number.isInteger(order))) {
    throw new TypeError('Content order must be a finite integer');
  }
}

export function compareContentOrder(
  left: OrderedContentEntry,
  right: OrderedContentEntry,
  locale: string,
): number {
  assertValidOrder(left.order);
  assertValidOrder(right.order);

  if (left.order === undefined && right.order !== undefined) return 1;
  if (left.order !== undefined && right.order === undefined) return -1;
  if (left.order !== undefined && right.order !== undefined && left.order !== right.order) {
    return left.order < right.order ? -1 : 1;
  }

  const slugOrder = left.slug.localeCompare(right.slug, locale);
  return slugOrder === 0 ? compareIdentifiers(left.id, right.id) : slugOrder;
}
