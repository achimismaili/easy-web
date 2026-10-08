import { describe, expect, it } from 'vitest';
import { buildDecapConfig, defineContentType, defineSingleton, field, toDecapCollections, toDecapFiles } from '../index.js';
import type { DecapCollection } from '../index.js';

const backend = { name: 'azure', repo: 'o/p/r', tenant_id: 't', app_id: 'a' } as const;
const globals = { mediaFolder: 'src/assets/images', publicFolder: '/src/assets/images' };
const title = field.string('title', { label: 'Titel' });
const required = (f: { required?: boolean }): boolean => f.required !== false;

describe('toDecapCollections', () => {
    it('returns one collection with the format mapping and passthroughs', () => {
        const def = defineContentType({ name: 'p', label: 'Seiten', folder: 'src/content/p', format: 'yml', slug: '{{slug}}',
            sortableFields: ['title'], fields: [title] });
        const [c, ...rest] = toDecapCollections(def, globals);
        expect(rest).toHaveLength(0);
        expect(c).toMatchObject({ name: 'p', folder: 'src/content/p', extension: 'yml', format: 'yml', slug: '{{slug}}',
            identifier_field: 'title', sortable_fields: ['title'] });
        expect(c).not.toHaveProperty('filter');
    });

    it.each([['md', 'frontmatter'], ['yml', 'yml'], ['json', 'json']] as const)('maps %s', (format, decap) => {
        const def = defineContentType({ name: 'p', label: 'P', folder: 'f', format, fields: [title] });
        expect(toDecapCollections(def)[0]).toMatchObject({ extension: format, format: decap });
    });

    it('expands per locale with hidden locale, translationKey and ordered fields (publishDate, then body)', () => {
        const def = defineContentType({ name: 'pages', label: 'Seiten', folder: 'src/content/pages', locales: ['de', 'en'],
            publish: 'missing-date-means-draft', fields: [title, field.body(), field.string('teaser', { label: 'Teaser' })] });
        const result = toDecapCollections(def, globals);
        expect(result.map(c => [c.name, c.folder, c.label])).toEqual([
            ['pages_de', 'src/content/pages/de', 'Seiten (DE)'], ['pages_en', 'src/content/pages/en', 'Seiten (EN)']]);
        expect(result[1]?.fields.map(f => f.name)).toEqual(['title', 'teaser', 'locale', 'translationKey', 'publishDate', 'body']);
        expect(result[1]?.fields.find(f => f.name === 'locale')).toMatchObject({ widget: 'hidden', default: 'en' });
        expect(result[0]?.fields.find(f => f.name === 'locale')).toMatchObject({ default: 'de' });
        expect(result[0]?.fields.find(f => f.name === 'translationKey')).toMatchObject({ widget: 'string' });
    });

    it('emits media_folder with a leading slash only when it differs from the global one', () => {
        const same = defineContentType({ name: 'a', label: 'A', folder: 'f', mediaFolder: 'src/assets/images', fields: [title] });
        const other = defineContentType({ name: 'b', label: 'B', folder: 'f', mediaFolder: 'src/assets/galleries',
            publicFolder: '/src/assets/galleries', fields: [title,
                field.image('cover', { label: 'C', alt: 'decorative', mediaFolder: 'src/assets/covers' })] });
        const [a] = toDecapCollections(same, globals);
        const [b] = toDecapCollections(other, globals);
        expect(a).not.toHaveProperty('media_folder');
        expect(a).not.toHaveProperty('public_folder');
        expect(b).toMatchObject({ media_folder: '/src/assets/galleries', public_folder: '/src/assets/galleries' });
        expect(b?.fields.find(f => f.name === 'cover')).toMatchObject({ media_folder: '/src/assets/covers' });
    });

    it('drops field-level folders equal to the global ones', () => {
        const def = defineContentType({ name: 'a', label: 'A', folder: 'f', publicFolder: '/src/assets/images',
            fields: [title, field.image('cover', { label: 'C', alt: 'decorative' })] });
        const cover = toDecapCollections(def, globals)[0]?.fields.find(f => f.name === 'cover');
        expect(cover).not.toHaveProperty('public_folder');
        expect(cover).not.toHaveProperty('media_folder');
    });
});

describe('darts equivalence: two forms over one folder', () => {
    const events = defineContentType({ name: 'events', label: 'Veranstaltungen', labelSingular: 'Veranstaltung',
        folder: 'src/content/events', slug: '{{year}}-{{month}}-{{day}}-{{slug}}', sortableFields: ['date', 'title'],
        publicFolder: '/src/assets/images', publish: 'missing-date-means-published',
        fields: [title, field.date('date', { label: 'Datum' }), field.body()],
        variants: { discriminator: 'kind', label: 'Art', options: {
            event: { label: 'Veranstaltungen', labelSingular: 'Veranstaltung', collectionName: 'events', fields: [
                field.date('dateend', { label: 'Enddatum', required: false }),
                field.text('teaser', { label: 'Teaser' }),
                field.image('image', { label: 'Titelbild', alt: { from: 'imageAlt' } }),
                field.string('imageAlt', { label: 'Bildbeschreibung' })] },
            news: { label: 'Meldungen', labelSingular: 'Meldung', collectionName: 'news', fields: [
                field.select('section', { label: 'Bereich', required: false, options: ['news', 'archive'] }),
                field.text('teaser', { label: 'Teaser', required: false })] },
        } } });
    const [event, news] = toDecapCollections(events, globals) as readonly [DecapCollection, DecapCollection];
    const flags = (c: DecapCollection): Record<string, boolean> =>
        Object.fromEntries(c.fields.filter(f => f.widget !== 'hidden').map(f => [f.name, required(f)]));

    it('shares one folder and filters each form by its own discriminator value', () => {
        expect(event.folder).toBe('src/content/events');
        expect(news.folder).toBe(event.folder);
        expect(event.filter).toEqual({ field: 'kind', value: 'event' });
        expect(news.filter).toEqual({ field: 'kind', value: 'news' });
        expect([event.name, news.name]).toEqual(['events', 'news']);
        expect([event.label, news.label]).toEqual(['Veranstaltungen: Veranstaltungen', 'Veranstaltungen: Meldungen']);
        expect(event.fields[0]).toMatchObject({ name: 'kind', widget: 'hidden', default: 'event' });
        expect(news.fields[0]).toMatchObject({ name: 'kind', widget: 'hidden', default: 'news' });
        expect(event.fields.at(-1)?.name).toBe('body');
    });

    it('matches the required flags of the hand-written darts config', () => {
        expect(flags(event)).toMatchObject({ title: true, date: true, dateend: false, teaser: true, image: true, imageAlt: true,
            publishDate: false, body: true });
        expect(flags(news)).toMatchObject({ title: true, date: true, section: false, teaser: false, publishDate: false, body: true });
    });
});

describe('toDecapFiles and buildDecapConfig', () => {
    const site = defineSingleton({ name: 'site', label: 'Website', file: 'src/content/site.json', fields: [title] });
    const page = defineContentType({ name: 'pages', label: 'Seiten', folder: 'f', fields: [title] });

    it('builds one files collection with defaults', () => {
        expect(toDecapFiles([site])).toEqual({ name: 'site_config', label: 'Site-Konfiguration', files: [
            { name: 'site', label: 'Website', file: 'src/content/site.json', fields: [expect.objectContaining({ name: 'title' })] }] });
    });

    it('assembles the config without publish_mode unless passed', () => {
        const config = buildDecapConfig({ backend, ...globals, contentTypes: [page], singletons: [site] });
        expect(Object.hasOwn(config, 'publish_mode')).toBe(false);
        expect(config).toMatchObject({ load_config_file: false, locale: 'de', media_folder: globals.mediaFolder,
            backend: { name: 'azure', branch: 'main' } });
        expect(config.collections.map(c => c.name)).toEqual(['pages', 'site_config']);
        expect(buildDecapConfig({ backend, ...globals, contentTypes: [], publishMode: 'editorial_workflow' }).publish_mode)
            .toBe('editorial_workflow');
    });

    it('throws when a singleton public folder differs from the global one', () => {
        const odd = defineSingleton({ name: 'odd', label: 'Odd', file: 'x.json', publicFolder: '/other', fields: [title] });
        expect(() => buildDecapConfig({ backend, ...globals, contentTypes: [], singletons: [odd] }))
            .toThrow(/Singleton "odd": public folder "\/other" differs from the global public folder/);
    });
});
