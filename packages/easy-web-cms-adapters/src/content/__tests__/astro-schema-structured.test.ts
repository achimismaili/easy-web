import { z } from 'astro/zod';
import { describe, expect, it, vi } from 'vitest';
import { toAstroSchema } from '../astro-schema.js';
import { defineContentType, defineSingleton, field } from '../index.js';
import type { FieldDef } from '../types.js';

const context = { image: vi.fn(() => z.string()) };

function schemaFor(fields: readonly FieldDef[], publicFolder = '/images') {
    const definition = defineSingleton({ name: 'fixture', label: 'Fixture', file: 'fixture.json', publicFolder, fields });
    return toAstroSchema(definition)(context);
}

function expectMissingField(fieldDefinition: FieldDef): void {
    const result = schemaFor([fieldDefinition]).safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toContain(fieldDefinition.name);
}

describe('Astro schema image parity', () => {
    it('parses a required descriptive image and rejects missing alt text', () => {
        // Given
        const image = field.image('photo', { label: 'Photo', alt: 'required' });
        const schema = schemaFor([image]);
        // When / Then
        expect(schema.parse({ photo: { src: '/photo.jpg', alt: 'A photo', caption: 'Caption' } })).toEqual({ photo: { src: '/photo.jpg', alt: 'A photo', caption: 'Caption' } });
        expectMissingField(image);
        expect(schema.safeParse({ photo: { src: '/photo.jpg', alt: ' ' } }).success).toBe(false);
    });

    it.each(['', null] as const)('maps a cleared optional descriptive image (%j) to undefined', cleared => {
        // Given
        const schema = schemaFor([field.image('photo', { label: 'Photo', required: false, alt: 'required' })]);
        // When / Then
        expect(schema.parse({ photo: cleared })).toEqual({ photo: undefined });
    });

    it('unwraps Decap optional-image lists', () => {
        // Given
        const schema = schemaFor([field.image('photo', { label: 'Photo', required: false, alt: 'required' })]);
        // When / Then
        expect(schema.parse({ photo: [{ src: '/photo.jpg', alt: 'A photo' }] })).toEqual({ photo: { src: '/photo.jpg', alt: 'A photo' } });
        expect(schema.safeParse({ photo: [{ src: '/one.jpg', alt: 'One' }, { src: '/two.jpg', alt: 'Two' }] }).success).toBe(false);
    });

    it('derives alt text from a sibling field and marks decorative images explicitly', () => {
        // Given
        const schema = schemaFor([
            field.string('title', { label: 'Title' }),
            field.image('derived', { label: 'Derived', alt: { from: 'title' } }),
            field.image('decoration', { label: 'Decoration', alt: 'decorative' }),
        ]);
        // When / Then
        expect(schema.parse({ title: 'Sunset', derived: '/sunset.jpg', decoration: '/line.svg' })).toEqual({
            title: 'Sunset', derived: { src: '/sunset.jpg', alt: 'Sunset' }, decoration: { src: '/line.svg', decorative: true },
        });
    });

    it('uses Astro image schemas only for source public folders', () => {
        // Given
        context.image.mockClear();
        const sourceSchema = schemaFor([field.image('photo', { label: 'Photo', alt: 'decorative' })], '/src/assets');
        const publicSchema = schemaFor([field.image('photo', { label: 'Photo', alt: 'decorative' })], '/images');
        // When
        sourceSchema.parse({ photo: '/source.jpg' });
        publicSchema.parse({ photo: '/public.jpg' });
        // Then
        expect(context.image).toHaveBeenCalledTimes(1);
    });

    it('continues invoking Astro image context for nested /src asset paths', () => {
        // Given
        const imageContext = { image: vi.fn(() => z.object({ src: z.string(), width: z.number(), height: z.number(), format: z.string() })) };
        const definition = defineSingleton({
            name: 'fixture', label: 'Fixture', file: 'fixture.json', publicFolder: '/src/assets/galleries',
            fields: [field.image('photo', { label: 'Photo', alt: 'decorative' })],
        });
        // When
        toAstroSchema(definition)(imageContext).parse({ photo: { src: '/src/assets/galleries/photo.jpg', width: 10, height: 10, format: 'jpg' } });
        // Then
        expect(imageContext.image).toHaveBeenCalledOnce();
    });

    it('parses image galleries with bounds, defaults and extra fields', () => {
        // Given
        const schema = schemaFor([field.images('photos', { label: 'Photos', min: 1, max: 2,
            fields: [field.text('caption', { label: 'Caption', required: false })] })]);
        // When / Then
        expect(schema.parse({ photos: [{ src: '/one.jpg', alt: 'One', caption: null }] })).toEqual({ photos: [{ src: '/one.jpg', alt: 'One', caption: undefined }] });
        expect(schema.safeParse({}).success).toBe(false);
        expect(schema.safeParse({ photos: [] }).success).toBe(false);
        expect(schema.safeParse({ photos: [{ src: '/one.jpg', alt: 'One' }, { src: '/two.jpg', alt: 'Two' }, { src: '/three.jpg', alt: 'Three' }] }).success).toBe(false);
    });

    it('defaults an unconstrained optional gallery to an empty list', () => {
        // Given / When
        const parsed = schemaFor([field.images('photos', { label: 'Photos' })]).parse({ photos: null });
        // Then
        expect(parsed).toEqual({ photos: [] });
    });
});

describe('Astro schema structured parity', () => {
    it('parses required object lists and scalar lists with bounds', () => {
        // Given
        const fields = [
            field.list('cards', { label: 'Cards', required: true, min: 1, max: 2, fields: [field.string('title', { label: 'Title' })] }),
            field.list('tags', { label: 'Tags', required: true, min: 1, field: field.string('tag', { label: 'Tag' }) }),
        ] as const;
        const schema = schemaFor(fields);
        // When / Then
        expect(schema.parse({ cards: [{ title: 'Card' }], tags: ['tag'] })).toEqual({ cards: [{ title: 'Card' }], tags: ['tag'] });
        for (const definition of fields) expectMissingField(definition);
        expect(schema.safeParse({ cards: [], tags: [] }).success).toBe(false);
    });

    it.each(['', null] as const)('maps cleared optional lists and objects (%j) to undefined', cleared => {
        // Given
        const schema = schemaFor([
            field.list('items', { label: 'Items', fields: [field.string('title', { label: 'Title' })] }),
            field.object('entry', { label: 'Entry', required: false, fields: [field.string('title', { label: 'Title' })] }),
        ]);
        // When / Then
        expect(schema.parse({ items: cleared, entry: cleared })).toEqual({ items: undefined, entry: undefined });
    });

    it('parses navigation recursively and validates required navigation text', () => {
        // Given
        const navigation = field.navItems('navigation', { label: 'Navigation', nested: true });
        const schema = schemaFor([navigation]);
        // When / Then
        expect(schema.parse({ navigation: [{ label: 'Home', href: '/', order: 1, children: [{ label: 'Child', href: '/child' }] }] })).toEqual({
            navigation: [{ label: 'Home', href: '/', order: 1, children: [{ label: 'Child', href: '/child' }] }],
        });
        expectMissingField(navigation);
        expect(schema.safeParse({ navigation: [{ label: ' ', href: '/' }] }).success).toBe(false);
    });

    it('parses locale objects and clears optional locale containers', () => {
        // Given
        const required = field.perLocale('heading', { label: 'Heading', locales: ['de', 'en'], field: locale => field.string(locale, { label: locale }) });
        const optional = field.perLocale('summary', { label: 'Summary', locales: ['de', 'en'], required: false,
            field: locale => field.string(locale, { label: locale, required: false }) });
        const schema = schemaFor([required, optional]);
        // When / Then
        expect(schema.parse({ heading: { de: 'Hallo', en: 'Hello' }, summary: null })).toEqual({ heading: { de: 'Hallo', en: 'Hello' }, summary: undefined });
        expectMissingField(required);
    });
});

describe('Astro schema definition parity', () => {
    it('adds generated locale and publish fields while excluding body', () => {
        // Given
        const definition = defineContentType({ name: 'articles', label: 'Articles', folder: 'src/content/articles', locales: ['de', 'en'], publish: 'missing-date-means-draft',
            fields: [field.string('title', { label: 'Title' }), field.body()] });
        // When
        const schema = toAstroSchema(definition)(context);
        // Then
        expect(schema.parse({ title: 'Article', locale: 'de', translationKey: 'article', publishDate: '' })).toEqual({
            title: 'Article', locale: 'de', translationKey: 'article', publishDate: undefined,
        });
        expect(schema.safeParse({ title: 'Article', locale: 'fr', translationKey: 'article' }).success).toBe(false);
        expect(schema.safeParse({ title: 'Article', locale: 'de' }).success).toBe(false);
    });

    it('builds discriminated variant schemas from common and branch fields', () => {
        // Given
        const definition = defineContentType({ name: 'entries', label: 'Entries', folder: 'src/content/entries', fields: [field.string('title', { label: 'Title' })],
            variants: { discriminator: 'kind', label: 'Kind', options: {
                event: { label: 'Event', fields: [field.date('startDate', { label: 'Start' })] },
                news: { label: 'News', fields: [field.text('summary', { label: 'Summary' })] },
            } } });
        const schema = toAstroSchema(definition)(context);
        // When / Then
        expect(schema.parse({ title: 'Launch', kind: 'event', startDate: '2026-10-08' })).toEqual({ title: 'Launch', kind: 'event', startDate: new Date('2026-10-08') });
        expect(schema.parse({ title: 'Update', kind: 'news', summary: 'Details' })).toEqual({ title: 'Update', kind: 'news', summary: 'Details' });
        const missing = schema.safeParse({ title: 'Launch', kind: 'event' });
        expect(missing.success).toBe(false);
        if (!missing.success) expect(missing.error.issues[0]?.path).toContain('startDate');
    });
});
