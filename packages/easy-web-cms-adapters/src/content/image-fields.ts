import type { Image, DecorativeImage } from '@easy-web/core/contracts';
import type { DecapField, FieldDef, Folders, ImageOptions, ImagesOptions } from './types.js';
import type { InferFields, RequiredValue } from './infer.js';

function source(folders: Folders): DecapField {
    return { name: 'src', label: 'Bild', widget: 'image', required: true,
        ...(folders.mediaFolder !== undefined ? { media_folder: folders.mediaFolder } : {}),
        ...(folders.publicFolder !== undefined ? { public_folder: folders.publicFolder } : {}) };
}

function description(options: { readonly altLabel?: string; readonly altHint?: string }): DecapField {
    return { name: 'alt', label: options.altLabel ?? 'Bildbeschreibung', widget: 'string', required: true,
        hint: options.altHint ?? 'Beschreibt das Bild für Screenreader.',
        pattern: ['\\S', 'Darf nicht nur aus Leerzeichen bestehen.'] };
}

type ImageData<O extends ImageOptions> = O['alt'] extends 'decorative' ? DecorativeImage : Image;
export function image<const N extends string, const O extends ImageOptions>(name: N, options: O): FieldDef<N, RequiredValue<ImageData<O>, O>, 'image'>;
export function image(name: string, options: ImageOptions): FieldDef {
    const { label, required = true, alt, mediaFolder, publicFolder } = options;
    const common = { name, kind: 'image', required, alt, mediaFolder, publicFolder } as const;
    switch (alt) {
        case 'required': {
            const fields = [source(options), description(options)];
            const decap: DecapField = required
                ? { name, label, widget: 'object', required, fields }
                : { name, label, widget: 'list', required, fields, min: 0, max: 1, label_singular: label, summary: '{{fields.alt}}' };
            return Object.freeze({ ...common, decap });
        }
        case 'decorative':
            return Object.freeze({ ...common, decap: { ...source(options), name, label, required } });
        default: {
            // The remaining union member is the explicit sibling-field alt source.
            const from: { readonly from: string } = alt;
            return Object.freeze({ ...common, alt: from, decap: { ...source(options), name, label, required } });
        }
    }
}

type GalleryData<O extends ImagesOptions> = O extends { readonly fields: infer F extends readonly FieldDef[] }
    ? (Image & InferFields<F>)[] : Image[];
export function images<const N extends string, const O extends ImagesOptions>(name: N, options: O): FieldDef<N, GalleryData<O>, 'images'>;
export function images(name: string, options: ImagesOptions): FieldDef {
    const { label, labelSingular = 'Foto', fields = [], required = false, min, max, mediaFolder, publicFolder } = options;
    return Object.freeze({ name, kind: 'images', required, fields, alt: 'required', mediaFolder, publicFolder,
        decap: { name, label, widget: 'list', required, label_singular: labelSingular, summary: '{{fields.alt}}',
            ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}),
            fields: [source(options), description({}), ...fields.map(f => f.decap)] } } as const);
}
