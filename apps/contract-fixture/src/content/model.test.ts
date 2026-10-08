import type { CollectionEntry } from 'astro:content';
import type { InferData } from '@easy-web/cms-adapters';
import { expectTypeOf, test } from 'vitest';
import { events } from './model';

test('CollectionEntry events data equals inferred event data', () => {
  // Given: Astro's generated collection type and the authored model.
  type AstroData = CollectionEntry<'events'>['data'];
  type ModelData = InferData<typeof events>;

  // When: each type is compared with the other.
  // Then: both structural directions are identical.
   expectTypeOf<AstroData>().toExtend<ModelData>();
   expectTypeOf<ModelData>().toExtend<AstroData>();
});
