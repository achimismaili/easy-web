import { describe, expect, it } from 'vitest';
import { defineContentType, defineSingleton, field, fieldSets } from '../index.js';

const title = field.string('title', { label: 'Titel' });
const base = { name: 'entries', label: 'Einträge', folder: 'src/content/entries', fields: [title] };

describe('content definitions', () => {
    it.each([undefined, [], ['de'], ['de', 'en']] as const)('adds generated fields only when locales=%j is multilingual', locales => {
        // Given / When
        const result = defineContentType({ ...base, locales });
        // Then
        expect(result.generatedFields.map(f => f.name)).toEqual(locales && locales.length > 1 ? ['locale', 'translationKey'] : []);
        if (locales && locales.length > 1) {
            expect(result.generatedFields[0]?.decap).toEqual({ name: 'locale', widget: 'hidden', default: 'de' });
            expect(result.generatedFields[1]?.required).toBe(true);
        }
    });

    it.each([
        ['missing-date-means-draft', 'Ohne Datum bleibt der Eintrag unveröffentlicht. Ein Datum in der Zukunft hält ihn bis dahin zurück.'],
        ['missing-date-means-published', 'Ohne Datum sofort sichtbar. Ein zukünftiges Datum hält den Eintrag bis dahin überall zurück.'],
    ] as const)('adds an optional date when publish=%s', (publish, hint) => {
        // Given / When
        const result = defineContentType({ ...base, publish });
        // Then
        expect(result.generatedFields).toHaveLength(1);
        expect(result.generatedFields[0]).toMatchObject({ name: 'publishDate', kind: 'date', required: false, decap: { hint } });
    });

    it.each([
        [[title], undefined, 'title'],
        [[field.string('name', { label: 'Name' })], undefined, 'name'],
        [[field.string('code', { label: 'Code' })], 'code', 'code'],
    ] as const)('selects the identifier when fields=%j and override=%s', (fields, identifierField, expected) => {
        // Given / When
        const result = defineContentType({ ...base, fields, identifierField });
        // Then
        expect(result.identifierField).toBe(expected);
    });

    it('normalizes collection names when variants provide overrides', () => {
        // Given / When
        const result = defineContentType({ ...base, variants: { discriminator: 'kind', label: 'Art', options: {
            event: { label: 'Events', fields: [field.date('startDate', { label: 'Start' })], collectionName: 'events' },
            news: { label: 'News', fields: [] },
        } } });
        // Then
        expect(result.variants.options.event.collectionName).toBe('events');
        expect(result.variants.options.news.collectionName).toBe('entries_news');
    });

    it.each([
        ['duplicate title', () => defineContentType({ ...base, fields: [title, title] }), /entries.*title/],
        ['invalid body', () => defineContentType({ ...base, fields: [title, field.string('body', { label: 'Body' })] }), /entries.*body/],
        ['missing alt sibling', () => defineContentType({ ...base, publicFolder: '/img', fields: [title, field.image('photo', { label: 'Foto', alt: { from: 'absent' } })] }), /entries.*photo.*absent/],
        ['non-string alt sibling', () => defineContentType({ ...base, publicFolder: '/img', fields: [title, field.text('description', { label: 'Text' }), field.image('photo', { label: 'Foto', alt: { from: 'description' } })] }), /entries.*photo.*description/],
        ['empty variants', () => defineContentType({ ...base, variants: { discriminator: 'kind', label: 'Art', options: {} } }), /entries.*kind.*empty/],
        ['missing identifier', () => defineContentType({ ...base, fields: [] }), /entries.*identifier.*title.*name/],
        ['invalid explicit identifier', () => defineContentType({ ...base, fields: [], identifierField: 'code' }), /entries.*identifier.*code/],
        ['missing image folder', () => defineContentType({ ...base, fields: [title, field.image('photo', { label: 'Foto', alt: 'decorative' })] }), /entries.*photo.*publicFolder/],
        ['missing gallery folder', () => defineContentType({ ...base, fields: [title, field.images('photos', { label: 'Fotos' })] }), /entries.*photos.*publicFolder/],
        ['nested duplicate', () => defineContentType({ ...base, fields: [title, field.object('obj', { label: 'Obj', fields: [title, title] })] }), /entries.*obj.*title/],
        ['variant duplicate', () => defineContentType({ ...base, variants: { discriminator: 'kind', label: 'Art', options: { news: { label: 'News', fields: [title] } } } }), /entries.*title/],
        ['generated collision', () => defineContentType({ ...base, locales: ['de', 'en'], fields: [title, field.string('locale', { label: 'Locale' })] }), /entries.*locale/],
        ['discriminator collision', () => defineContentType({ ...base, variants: { discriminator: 'title', label: 'Art', options: { news: { label: 'News', fields: [] } } } }), /entries.*title/],
        ['empty collection name', () => defineContentType({ ...base, variants: { discriminator: 'kind', label: 'Art', options: { news: { label: 'News', collectionName: '', fields: [] } } } }), /entries.*news.*collectionName/],
        ['empty variant key', () => defineContentType({ ...base, variants: { discriminator: 'kind', label: 'Art', options: { '': { label: 'News', fields: [] } } } }), /entries.*kind.*empty/],
        ['duplicate collection name', () => defineContentType({ ...base, variants: { discriminator: 'kind', label: 'Art', options: { a: { label: 'A', collectionName: 'same', fields: [] }, b: { label: 'B', collectionName: 'same', fields: [] } } } }), /entries.*b.*collectionName/],
        ['gallery reserved field', () => defineContentType({ ...base, publicFolder: '/img', fields: [title, field.images('photos', { label: 'Photos', fields: [field.string('alt', { label: 'Alt' })] })] }), /entries.*photos.*alt/],
        ['nested image folder', () => defineContentType({ ...base, fields: [title, field.object('group', { label: 'Group', fields: [field.image('photo', { label: 'Photo', alt: 'required' })] })] }), /entries.*group.*photo.*publicFolder/],
    ] as const)('throws synchronously when %s', (_name, build, error) => {
        // Given / When / Then: the call itself must fail, naming definition and issue.
        expect(build).toThrow(error);
    });

    it('resolves folders recursively when a definition supplies the fallback', () => {
        // Given
        const own = field.image('own', { label: 'Own', alt: 'required', publicFolder: '/own' });
        const inherited = field.images('inherited', { label: 'Inherited' });
        // When
        const result = defineSingleton({ name: 'settings', label: 'Settings', file: 'settings.json', publicFolder: '/fallback', fields: [own, field.object('group', { label: 'Group', fields: [inherited] })] });
        // Then
        expect(result.fields[0]?.publicFolder).toBe('/own');
        expect(result.fields[1]?.fields?.[0]?.publicFolder).toBe('/fallback');
        expect(own.publicFolder).toBe('/own');
        expect(inherited.publicFolder).toBeUndefined();
    });

    it('accepts a valid string sibling when deriving image descriptions', () => {
        // Given / When
        const result = defineContentType({ ...base, publicFolder: '/img', fields: [title, field.image('photo', { label: 'Foto', alt: { from: 'title' } })] });
        // Then
        expect(result.fields[1]?.alt).toEqual({ from: 'title' });
    });

    it('accepts a nested text field named body', () => {
        // Given / When
        const result = defineContentType({
            ...base,
            fields: [title, field.object('ctaSection', {
                label: 'CTA',
                fields: [field.text('body', { label: 'Body' })],
            })],
        });
        // Then
        expect(result.fields[1]?.fields?.[0]?.name).toBe('body');
    });

    it('defaults collection settings when omitted', () => {
        // Given / When
        const result = defineContentType(base);
        // Then
        expect(result).toMatchObject({ format: 'md', create: true });
    });

    it.each(['md', 'yml', 'json'] as const)('preserves collection settings when format=%s', format => {
        // Given
        const options = { ...base, format, create: false, delete: false, slug: '{{slug}}', labelSingular: 'Eintrag', sortableFields: ['title'], mediaFolder: '/media', publicFolder: '/img' };
        // When
        const result = defineContentType(options);
        // Then
        expect(result).toMatchObject(options);
    });

    it('validates singletons without requiring an entry identifier', () => {
        // Given / When
        const result = defineSingleton({ name: 'settings', label: 'Settings', file: 'settings.json', fields: fieldSets.siteSettings() });
        // Then
        expect(result.file).toBe('settings.json');
        expect(Object.isFrozen(result)).toBe(true);
    });

    it('rejects duplicate fields when defining a singleton', () => {
        // Given / When / Then
        expect(() => defineSingleton({ name: 'settings', label: 'Settings', file: 'settings.json', fields: [title, title] })).toThrow(/settings.*title/);
    });

    it('resolves variant image folders when the definition supplies them', () => {
        // Given / When
        const result = defineContentType({ ...base, publicFolder: '/photos', variants: { discriminator: 'kind', label: 'Kind', options: {
            photo: { label: 'Photo', fields: [field.image('image', { label: 'Image', alt: 'required' })] },
        } } });
        // Then
        expect(result.variants.options.photo.fields[0]?.publicFolder).toBe('/photos');
        expect(result.variants.options.photo.fields[0]?.decap.fields?.[0]?.public_folder).toBe('/photos');
    });
});
