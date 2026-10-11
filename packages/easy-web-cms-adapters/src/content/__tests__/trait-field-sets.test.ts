import { describe, expect, it } from 'vitest';
import { fieldsForTraits } from '../index.js';

describe('trait field sets', () => {
    it.each([
        ['title', ['title']],
        ['slug', ['slug']],
        ['summary', ['summary']],
        ['body', ['body']],
        ['image', ['image']],
        ['photos', ['photos']],
        ['order', ['order']],
        ['taxonomy', ['taxonomy']],
        ['publication', ['publishDate', 'modifiedDate']],
        ['schedule', ['startDate', 'endDate']],
        ['location', ['location']],
        ['cta', ['cta']],
        ['money', ['amount', 'currency']],
        ['featured', ['featured']],
    ] as const)('maps the %s trait to canonical fields', (trait, expected) => {
        // Given / When
        const result = fieldsForTraits([trait], { publicFolder: '/images' });

        // Then
        expect(result.map((entry) => entry.name)).toEqual(expected);
    });

    it('preserves selected trait order for CMS forms', () => {
        // Given / When
        const result = fieldsForTraits(['title', 'schedule', 'location']);

        // Then
        expect(result.map((entry) => entry.name)).toEqual(['title', 'startDate', 'endDate', 'location']);
    });

    it('uses the ISO currency catalog for money fields', () => {
        // Given / When
        const result = fieldsForTraits(['money']);
        const currency = result.find((entry) => entry.name === 'currency');

        // Then
        expect(currency?.kind).toBe('select');
        expect(currency?.decap.options).toContain('EUR');
        expect(currency?.decap.options).not.toContain('ZZZ');
    });
});
