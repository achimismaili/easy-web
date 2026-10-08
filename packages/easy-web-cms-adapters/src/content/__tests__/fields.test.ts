import { describe, expect, it } from 'vitest';
import { field } from '../index.js';

const guard = ['\\S', 'Darf nicht nur aus Leerzeichen bestehen.'];
const src = { name: 'src', label: 'Bild', widget: 'image', required: true };
const alt = { name: 'alt', label: 'Bildbeschreibung', widget: 'string', required: true,
    hint: 'Beschreibt das Bild für Screenreader.', pattern: guard };

describe('Decap field builders', () => {
    it.each([
        [() => field.string('title', { label: 'Titel' }), { name: 'title', label: 'Titel', widget: 'string', required: true, pattern: guard }],
        [() => field.text('intro', { label: 'Text', required: false, hint: 'Kurz', default: 'Hallo' }), { name: 'intro', label: 'Text', widget: 'text', required: false, hint: 'Kurz', default: 'Hallo' }],
        [() => field.body(), { name: 'body', label: 'Inhalt', widget: 'markdown' }],
        [() => field.body({ label: 'Content' }), { name: 'body', label: 'Content', widget: 'markdown' }],
        [() => field.number('order', { label: 'Reihenfolge' }), { name: 'order', label: 'Reihenfolge', widget: 'number', required: true, value_type: 'int' }],
        [() => field.number('price', { label: 'Preis', required: false, valueType: 'float', min: 0, max: 10, step: 0.5, default: 1 }), { name: 'price', label: 'Preis', widget: 'number', required: false, value_type: 'float', min: 0, max: 10, step: 0.5, default: 1 }],
        [() => field.boolean('active', { label: 'Aktiv' }), { name: 'active', label: 'Aktiv', widget: 'boolean', default: false, required: false }],
        [() => field.boolean('active', { label: 'Aktiv', default: true }), { name: 'active', label: 'Aktiv', widget: 'boolean', default: true, required: false }],
        [() => field.color('accent', { label: 'Farbe', default: '#ffffff' }), { name: 'accent', label: 'Farbe', widget: 'color', required: true, default: '#ffffff' }],
        [() => field.date('date', { label: 'Datum', required: false, hint: 'Wann?' }), { name: 'date', label: 'Datum', widget: 'datetime', required: false, hint: 'Wann?', format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, picker_utc: true }],
        [() => field.select('kind', { label: 'Art', options: ['a', 'b'], required: false, default: 'b' }), { name: 'kind', label: 'Art', widget: 'select', options: ['a', 'b'], required: false, default: 'b' }],
        [() => field.hidden('kind', { default: 'news' }), { name: 'kind', widget: 'hidden', default: 'news' }],
        [() => field.image('photo', { label: 'Foto', alt: 'required' }), { name: 'photo', label: 'Foto', widget: 'object', required: true, fields: [src, alt] }],
        [() => field.image('photo', { label: 'Foto', required: false, alt: 'required' }), { name: 'photo', label: 'Foto', label_singular: 'Foto', widget: 'list', required: false, min: 0, max: 1, summary: '{{fields.alt}}', fields: [src, alt] }],
        [() => field.image('photo', { label: 'Foto', alt: { from: 'title' }, mediaFolder: '/media', publicFolder: '/assets' }), { name: 'photo', label: 'Foto', widget: 'image', required: true, media_folder: '/media', public_folder: '/assets' }],
        [() => field.image('photo', { label: 'Foto', alt: 'decorative', required: false }), { name: 'photo', label: 'Foto', widget: 'image', required: false }],
        [() => field.images('photos', { label: 'Fotos' }), { name: 'photos', label: 'Fotos', label_singular: 'Foto', widget: 'list', required: false, summary: '{{fields.alt}}', fields: [src, alt] }],
        [() => field.list('items', { label: 'Liste', labelSingular: 'Eintrag', fields: [], min: 1, max: 4, required: true }), { name: 'items', label: 'Liste', label_singular: 'Eintrag', widget: 'list', required: true, fields: [], min: 1, max: 4 }],
        [() => field.object('entry', { label: 'Eintrag', fields: [], required: false }), { name: 'entry', label: 'Eintrag', widget: 'object', required: false, fields: [] }],
    ])('emits documented configuration when builder %# is called', (build, expected) => {
        // Given / When: a builder and its documented options.
        const result = build();
        // Then: exact wire shape, immutable definition, no invented keys.
        expect(result.decap).toEqual(expected);
        expect(Object.isFrozen(result)).toBe(true);
        expect(JSON.stringify(result.decap)).not.toContain('"condition"');
    });

    it.each(['string', 'text'] as const)('guards whitespace when %s is required', (kind) => {
        // Given / When
        const result = field[kind]('title', { label: 'Titel' });
        // Then
        expect(result.decap.pattern).toEqual(guard);
    });

    it.each(['string', 'text'] as const)('omits the guard when %s is optional', (kind) => {
        // Given / When
        const result = field[kind]('title', { label: 'Titel', required: false });
        // Then
        expect(result.decap).not.toHaveProperty('pattern');
    });

    it('composes guards when the caller supplies an unanchored pattern', () => {
        // Given / When
        const result = field.string('title', { label: 'Titel', pattern: ['cat|dog', 'Tier erforderlich'] });
        // Then
        expect(result.decap.pattern).toEqual(['^(?=[\\s\\S]*\\S)[\\s\\S]*?(?:cat|dog)', 'Tier erforderlich']);
        const regex = new RegExp(result.decap.pattern?.[0] ?? '');
        expect(['  ', '\n\t', 'a cat here', '\na dog\n'].map(value => regex.test(value))).toEqual([false, false, true, true]);
    });

    it('preserves caller validation when the field is optional', () => {
        // Given / When
        const result = field.text('text', { label: 'Text', required: false, pattern: ['x', 'X'] });
        // Then
        expect(result.decap.pattern).toEqual(['x', 'X']);
    });

    it('keeps the whitespace guard when a caller pattern itself accepts blanks', () => {
        // Given / When
        const result = field.text('text', { label: 'Text', pattern: ['.*', 'Text'] });
        // Then
        expect(new RegExp(result.decap.pattern?.[0] ?? '').test(' \n ')).toBe(false);
    });

    it('applies alt labels and folders when a descriptive image is configured', () => {
        // Given / When
        const result = field.image('photo', { label: 'Foto', alt: 'required', altLabel: 'Alt', altHint: 'Describe', mediaFolder: '/media', publicFolder: '/img' });
        // Then
        expect(result.decap.fields).toEqual([{ ...src, media_folder: '/media', public_folder: '/img' }, { ...alt, label: 'Alt', hint: 'Describe' }]);
    });

    it('retains extra item fields and bounds when an image gallery is configured', () => {
        // Given
        const caption = field.text('caption', { label: 'Caption', required: false });
        // When
        const result = field.images('photos', { label: 'Photos', labelSingular: 'Picture', fields: [caption], required: true, min: 1, max: 8, publicFolder: '/img' });
        // Then
        expect(result.decap).toEqual({ name: 'photos', label: 'Photos', label_singular: 'Picture', widget: 'list', required: true, min: 1, max: 8, summary: '{{fields.alt}}', fields: [{ ...src, public_folder: '/img' }, alt, caption.decap] });
    });

    it.each([false, true])('guards navigation text when nested=%s', (nested) => {
        // Given / When
        const result = field.navItems('nav', { label: 'Navigation', nested });
        // Then
        const base = [
            { name: 'label', label: 'Beschriftung', widget: 'string', required: true, pattern: guard },
            { name: 'href', label: 'Link', widget: 'string', required: true, pattern: guard },
            { name: 'order', label: 'Reihenfolge', widget: 'number', required: false, value_type: 'int' },
        ];
        expect(result.decap).toEqual({ name: 'nav', label: 'Navigation', widget: 'list', required: true,
            fields: nested ? [...base, { name: 'children', label: 'Unterpunkte', widget: 'list', required: false, fields: base }] : base });
    });

    it('uses locale keys when the callback supplies a different field name', () => {
        // Given / When
        const result = field.perLocale('heading', { label: 'Heading', locales: ['de', 'en'], field: locale => field.string('value', { label: locale }) });
        // Then
        expect(result.decap).toEqual({ name: 'heading', label: 'Heading', widget: 'object', required: true, fields: [
            { name: 'de', label: 'de', widget: 'string', required: true, pattern: guard },
            { name: 'en', label: 'en', widget: 'string', required: true, pattern: guard },
        ] });
    });

    it('projects documented keys when a structurally compatible options object has extra metadata', () => {
        // Given
        const options = { label: 'Title', condition: 'never emit', internal: 1 };
        // When
        const result = field.string('title', options);
        // Then
        expect(result.decap).toEqual({ name: 'title', label: 'Title', widget: 'string', required: true, pattern: guard });
    });

    it('uses the scalar field option when building a string list', () => {
        // Given
        const tag = field.string('tag', { label: 'Tag' });
        // When
        const result = field.list('tags', { label: 'Tags', field: tag });
        // Then
        expect(result.decap).toEqual({ name: 'tags', label: 'Tags', widget: 'list', required: false, field: tag.decap });
        expect(result.itemField).toBe(tag);
    });
});
