import { z } from 'astro/zod';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { GalleryItem } from '@easy-web/core/contracts';
import { defineContentType, field, fieldSets, toAstroSchema, toDecapCollections } from '../index.js';
import type { InferData } from '../infer.js';

const kinds = [
    ['image-grid', 'items', ['title', 'columns', 'gap', 'aspectRatio', 'items'], ['src', 'alt', 'caption', 'href']],
    ['hero-slider', 'slides', ['title', 'autoplay', 'interval', 'height', 'slides'], ['src', 'alt', 'title', 'subtitle', 'href', 'cta']],
    ['carousel', 'slides', ['title', 'autoplay', 'interval', 'showDots', 'showArrows', 'slides'], ['src', 'alt', 'caption']],
    ['masonry-grid', 'items', ['title', 'columns', 'gap', 'items'], ['src', 'alt', 'caption', 'href']],
    ['feature-highlight', 'items', ['title', 'gap', 'items'], ['src', 'alt', 'title', 'description', 'href', 'cta', 'imagePosition']],
    ['lightbox-grid', 'items', ['title', 'columns', 'gap', 'aspectRatio', 'items'], ['src', 'alt', 'title', 'description']],
] as const;

function definition(publicFolder = '/images') {
    return defineContentType({ name: 'galleries', label: 'Galerien', folder: 'src/content/galleries',
        publicFolder, fields: [],
        variants: fieldSets.galleryVariants(),
    });
}

describe('gallery field sets', () => {
    it('rejects an identifier missing from one variant', () => {
        // Given
        const options = { name: 'galleries', label: 'Galleries', folder: 'src/content/galleries', fields: [],
            variants: { discriminator: 'kind', label: 'Kind', options: {
                first: { label: 'First', fields: [field.string('title', { label: 'Title' })] },
                second: { label: 'Second', fields: [] },
            } },
        } as const;
        // When / Then
        expect(() => defineContentType(options)).toThrow(/identifierField/);
    });

    it.each(kinds)('generates only the pilot fields for %s', (kind, list, names, itemNames) => {
        // Given
        const def = definition();
        // When
        const fields = toDecapCollections(def).find(collection => collection.filter?.value === kind)?.fields;
        // Then
        expect(fields?.filter(entry => entry.name !== 'kind').map(entry => entry.name)).toEqual(names);
        expect(fields?.find(entry => entry.name === list)?.fields?.map(entry => entry.name)).toEqual(itemNames);
    });

    it.each(kinds)('inherits the definition image folder and requires nonempty alt for %s', (kind, list) => {
        // Given
        const def = definition('/src/assets/galleries');
        const source = z.string().transform(src => ({ src, width: 1600, height: 900, format: 'png' as const }));
        const schema = toAstroSchema(def)({ image: () => source });
        const photo = { src: '/src/assets/galleries/lake.png', alt: 'Lake', title: 'Headline', description: 'Description' };
        const entry = { kind, gap: 'md', aspectRatio: 'square', height: 'lg', [list]: [photo] };
        // When
        const parsed = schema.parse(entry);
        // Then
        const photos = 'items' in parsed ? parsed.items : parsed.slides;
        expect(photos[0]?.src).toEqual({ src: '/src/assets/galleries/lake.png', width: 1600, height: 900, format: 'png' });
        expect(schema.safeParse({ ...entry, [list]: [{ ...photo, alt: ' ' }] }).success).toBe(false);
        const imageList = def.variants.options[kind].fields.find(entry => entry.name === list);
        expect(imageList?.publicFolder).toBe('/src/assets/galleries');
        expect(imageList?.decap.fields?.find(entry => entry.name === 'alt')).toMatchObject({ required: true, pattern: ['\\S', 'Darf nicht nur aus Leerzeichen bestehen.'] });
    });

    it('preserves option defaults, bounds and per-kind differences', () => {
        // Given / When
        const variants = fieldSets.galleryVariants();
        // Then
        expect(variants.discriminator).toBe('kind');
        expect(variants.options['image-grid'].fields.find(f => f.name === 'columns')?.decap).toMatchObject({ default: 3, min: 2, max: 6, value_type: 'int' });
        expect(variants.options['lightbox-grid'].fields.find(f => f.name === 'aspectRatio')?.decap.options).toEqual(['square', '4/3', 'auto']);
        expect(variants.options['image-grid'].fields.find(f => f.name === 'aspectRatio')?.decap.options).toEqual(['square', '4/3', '16/9', 'auto']);
        expect(variants.options['hero-slider'].fields.find(f => f.name === 'autoplay')?.decap.default).toBe(true);
        expect(variants.options.carousel.fields.find(f => f.name === 'autoplay')?.decap.default).toBe(false);
        expect(variants.options['hero-slider'].fields.find(f => f.name === 'interval')?.decap).toMatchObject({ default: 5000, min: 1000 });
        expect(variants.options.carousel.fields.find(f => f.name === 'interval')?.decap).toMatchObject({ default: 4000, min: 1000 });
    });

    it('localizes image and alt labels as well as variant fields', () => {
        // Given / When
        const variants = fieldSets.galleryVariants({ uiLocale: 'en' });
        const slides = variants.options['hero-slider'].fields.find(f => f.name === 'slides');
        // Then
        expect(slides?.decap.fields?.[0]?.label).toBe('Background Image');
        expect(slides?.decap.fields?.[1]?.label).toBe('Alt Text');
        expect(variants.options['image-grid'].fields[0].decap.label).toBe('Title');
    });

    it('infers a discriminated union whose lists satisfy the gallery contract', () => {
        // Given
        type Data = InferData<ReturnType<typeof definition>>;
        // When / Then
        expectTypeOf<Data['kind']>().toEqualTypeOf<typeof kinds[number][0]>();
        expectTypeOf<Extract<Data, { kind: 'hero-slider' }>['slides'][number]>().toExtend<GalleryItem>();
        expectTypeOf<Extract<Data, { kind: 'feature-highlight' }>['items'][number]>().toExtend<GalleryItem>();
    });
});
