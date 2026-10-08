import { expectTypeOf, it } from 'vitest';
import type { Event, Image, DecorativeImage, NotFoundContent } from '@easy-web/core/contracts';
import { defineContentType, defineSingleton, field, fieldSets } from '../index.js';
import type { InferData } from '../index.js';

it('infers parsed values when every builder is used in a definition', () => {
    // Given / When
    const def = defineSingleton({ name: 'all', label: 'All', file: 'all.json', publicFolder: '/img', fields: [
        field.string('title', { label: 'Title' }), field.text('text', { label: 'Text', required: false }),
        field.body(), field.number('count', { label: 'Count' }), field.boolean('active', { label: 'Active' }),
        field.color('color', { label: 'Color' }), field.date('date', { label: 'Date' }),
        field.select('choice', { label: 'Choice', options: ['a', 'b'] }), field.hidden('hidden', { default: 'fixed' }),
        field.image('image', { label: 'Image', alt: 'required' }), field.image('optional', { label: 'Image', alt: 'required', required: false }),
        field.image('decorative', { label: 'Image', alt: 'decorative' }), field.image('derived', { label: 'Image', alt: { from: 'title' } }),
        field.images('photos', { label: 'Photos' }),
        field.list('items', { label: 'Items', fields: [field.string('label', { label: 'Label' })] }),
        field.object('obj', { label: 'Obj', fields: [field.number('n', { label: 'N' })] }),
        field.navItems('nav', { label: 'Nav' }),
        field.perLocale('localized', { label: 'Localized', locales: ['de', 'en'], field: locale => field.string(locale, { label: locale }) }),
    ] });
    type Data = InferData<typeof def>;
    // Then
    expectTypeOf<Data['title']>().toEqualTypeOf<string>();
    expectTypeOf<Data['text']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Data['count']>().toEqualTypeOf<number>();
    expectTypeOf<Data['active']>().toEqualTypeOf<boolean>();
    expectTypeOf<Data['color']>().toEqualTypeOf<string>();
    expectTypeOf<Data['date']>().toEqualTypeOf<Date>();
    expectTypeOf<Data['choice']>().toEqualTypeOf<'a' | 'b'>();
    expectTypeOf<Data['hidden']>().toEqualTypeOf<'fixed'>();
    expectTypeOf<Data['image']>().toEqualTypeOf<Image>();
    expectTypeOf<Data['optional']>().toEqualTypeOf<Image | undefined>();
    expectTypeOf<Data['decorative']>().toEqualTypeOf<DecorativeImage>();
    expectTypeOf<Data['derived']>().toEqualTypeOf<Image>();
    expectTypeOf<Data['photos']>().toEqualTypeOf<Image[]>();
    expectTypeOf<Data['items']>().toEqualTypeOf<{ readonly label: string }[] | undefined>();
    expectTypeOf<Data['obj']>().toEqualTypeOf<{ readonly n: number }>();
    expectTypeOf<Data['nav']>().toEqualTypeOf<{ readonly label: string; readonly href: string; readonly order?: number }[]>();
    expectTypeOf<Data['localized']>().toEqualTypeOf<{ readonly de: string; readonly en: string }>();
    expectTypeOf<Data>().not.toHaveProperty('body');
    void def;
});

it('infers optional scalars and nested values when their fields are optional', () => {
    // Given / When
    const def = defineSingleton({ name: 'optional', label: 'Optional', file: 'optional.json', publicFolder: '/img', fields: [
        field.string('title', { label: 'Title', required: false }),
        field.text('text', { label: 'Text' }),
        field.number('count', { label: 'Count', required: false }),
        field.date('date', { label: 'Date', required: false }),
        field.select('choice', { label: 'Choice', required: false, options: [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }] }),
        field.object('obj', { label: 'Obj', required: false, fields: [field.number('n', { label: 'N' })] }),
        field.list('items', { label: 'Items', required: true, fields: [field.string('label', { label: 'Label' })] }),
        field.list('tags', { label: 'Tags', field: field.string('tag', { label: 'Tag' }) }),
        field.images('photos', { label: 'Photos', fields: [field.string('caption', { label: 'Caption' })] }),
        field.image('decoration', { label: 'Decoration', alt: 'decorative', required: false }),
        field.perLocale('localized', { label: 'Localized', locales: ['de', 'en'], required: false, field: locale => field.string(locale, { label: locale }) }),
    ] });
    type Data = InferData<typeof def>;
    // Then
    expectTypeOf<Data['title']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Data['text']>().toEqualTypeOf<string>();
    expectTypeOf<Data['count']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Data['date']>().toEqualTypeOf<Date | undefined>();
    expectTypeOf<Data['choice']>().toEqualTypeOf<'a' | 'b' | undefined>();
    expectTypeOf<Data['obj']>().toEqualTypeOf<{ readonly n: number } | undefined>();
    expectTypeOf<Data['items']>().toEqualTypeOf<{ readonly label: string }[]>();
    expectTypeOf<Data['tags']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<Data['photos'][number]['caption']>().toEqualTypeOf<string>();
    expectTypeOf<Data['decoration']>().toEqualTypeOf<DecorativeImage | undefined>();
    expectTypeOf<Data['localized']>().toEqualTypeOf<{ readonly de: string; readonly en: string } | undefined>();
    void def;
});

it('satisfies core contracts when using event and not-found sets', () => {
    // Given / When
    const event = defineContentType({ name: 'events', label: 'Events', folder: 'events', publicFolder: '/img', fields: fieldSets.event() });
    const notFound = defineSingleton({ name: 'notFound', label: '404', file: '404.json', publicFolder: '/img', fields: fieldSets.notFound(['de', 'en']) });
    // Then
    expectTypeOf<InferData<typeof event>>().toExtend<Event>();
    expectTypeOf<InferData<typeof notFound>>().toExtend<NotFoundContent>();
    void [event, notFound];
});
