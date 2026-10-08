import { describe, expect, it } from 'vitest';
import { fieldSets } from '../index.js';

describe('contract field sets', () => {
    it.each([
        ['item', ['title', 'description', 'image', 'order']],
        ['page', ['title', 'description', 'image', 'order']],
        ['article', ['title', 'description', 'image', 'order', 'datePublished', 'dateModified', 'author', 'tags']],
        ['event', ['title', 'description', 'image', 'order', 'startDate', 'endDate', 'location']],
        ['organization', ['name', 'logo', 'url', 'description']],
        ['person', ['name', 'role', 'image', 'email']],
        ['product', ['title', 'description', 'image', 'order']],
        ['siteSettings', ['siteName']],
    ] as const)('contains only contract fields when building %s', (name, expected) => {
        // Given / When
        const result = fieldSets[name]();
        // Then
        expect(result.map(f => f.name)).toEqual(expected);
    });

    it('omits unused sections when navigation flags are absent', () => {
        // Given / When
        const result = fieldSets.navigation(['de', 'en']);
        // Then
        expect(result.map(f => f.name)).toEqual(['mainNav', 'legalNav', 'skipLabel']);
        expect(result[2]?.required).toBe(false);
    });

    it.each(['footerNav', 'resourceLinks', 'socialLinks'] as const)('includes only the enabled section when %s is true', flag => {
        // Given / When
        const result = fieldSets.navigation(['de'], { [flag]: true });
        // Then
        expect(result.map(f => f.name)).toEqual(['mainNav', 'legalNav', 'skipLabel', flag]);
    });

    it('localizes labels when English is selected', () => {
        // Given / When
        const result = fieldSets.event({ uiLocale: 'en' });
        // Then
        expect(result[0]?.decap.label).toBe('Title');
        expect(result.find(f => f.name === 'startDate')?.decap.label).toBe('Start date');
    });

    it('uses optional localized decorative images when building not-found content', () => {
        // Given / When
        const result = fieldSets.notFound(['de', 'en']);
        // Then
        expect(result.map(f => f.name)).toEqual(['de', 'en']);
        expect(result[0]?.fields?.map(f => [f.name, f.required])).toEqual([['image', false], ['heading', false], ['message', false]]);
        expect(result[0]?.fields?.[0]?.alt).toBe('decorative');
    });
});
