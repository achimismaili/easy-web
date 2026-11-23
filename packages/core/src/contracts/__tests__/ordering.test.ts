import { describe, expect, it } from 'vitest';
import { compareContentOrder } from '../ordering.js';

describe('compareContentOrder', () => {
  it('orders finite values ascending and leaves missing values last', () => {
    const entries = [
      { order: 5, slug: 'last', id: 'last' },
      { slug: 'missing', id: 'missing' },
      { order: 0, slug: 'zero', id: 'zero' },
      { order: -5, slug: 'first', id: 'first' },
    ];

    expect(entries.toSorted((left, right) => compareContentOrder(left, right, 'en')).map(({ id }) => id))
      .toEqual(['first', 'zero', 'last', 'missing']);
  });

  it('breaks ties by locale-explicit slug and then ordinal ID, independent of input order', () => {
    const entries = [
      { order: 1, slug: 'entry', id: 'z-id' },
      { order: 1, slug: 'zebra', id: 'zebra' },
      { order: 1, slug: 'entry', id: 'a-id' },
      { order: 1, slug: 'alpha', id: 'alpha' },
    ];
    const compare = (left: typeof entries[number], right: typeof entries[number]) => compareContentOrder(left, right, 'en');

    expect(entries.toSorted(compare).map(({ id }) => id)).toEqual(['alpha', 'a-id', 'z-id', 'zebra']);
    expect([...entries].reverse().toSorted(compare).map(({ id }) => id)).toEqual(['alpha', 'a-id', 'z-id', 'zebra']);
  });

  it.each([NaN, Infinity, -Infinity, 1.5])('rejects invalid numeric order %s', (order) => {
    expect(() => compareContentOrder({ order, slug: 'entry', id: 'entry' }, { slug: 'other', id: 'other' }, 'en'))
      .toThrow('finite integer');
  });
});
