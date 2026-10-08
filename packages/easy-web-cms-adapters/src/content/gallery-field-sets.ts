import { field } from './fields.js';
import type { UiOptions } from './field-sets.js';
import type { Variants } from './types.js';

export function galleryVariants({ uiLocale = 'de' }: UiOptions = {}) {
    const en = uiLocale === 'en';
    const title = field.string('title', { label: en ? 'Title' : 'Titel', required: false });
    const gap = field.select('gap', { label: en ? 'Gap' : 'Abstand', options: ['sm', 'md', 'lg'], default: 'md' });
    const columns = field.number('columns', { label: en ? 'Columns' : 'Spalten', default: 3, min: 2, max: 4 });
    const caption = field.string('caption', { label: en ? 'Caption' : 'Bildunterschrift', required: false });
    const href = field.string('href', { label: 'Link', required: false });
    const headline = field.string('title', { label: en ? 'Headline' : 'Überschrift' });
    const cta = field.string('cta', { label: en ? 'CTA Label' : 'CTA-Beschriftung', required: false,
        hint: en ? 'Only shown when a link is also set' : 'Wird nur angezeigt, wenn auch ein Link gesetzt ist' });
    const imageLabels = {
        sourceLabel: en ? 'Image' : 'Bild',
        sourceHint: 'Supported formats: JPEG (jpe?g), PNG, WebP, AVIF, SVG. HEIC and JXL are not supported.',
        altLabel: en ? 'Alt Text' : 'Alt-Text',
        altHint: en ? 'Describes the image for screen readers.' : 'Beschreibt das Bild für Screenreader.',
        labelSingular: en ? 'Image' : 'Bild', required: true,
    } as const;
    const images = field.images('items', { ...imageLabels, label: en ? 'Images' : 'Bilder', fields: [caption, href] });
    return {
        discriminator: 'kind', label: en ? 'Type' : 'Typ',
        options: {
            'image-grid': { label: en ? 'Image Grid' : 'Bilderraster', fields: [
                field.string('title', { label: en ? 'Title' : 'Titel', required: false,
                    hint: en ? 'Optional heading above the grid' : 'Optionale Überschrift über dem Raster' }),
                field.number('columns', { label: en ? 'Columns' : 'Spalten', default: 3, min: 2, max: 6,
                    hint: en ? 'Recommended: 2, 3, 4 or 6' : 'Empfohlen: 2, 3, 4 oder 6' }),
                gap,
                field.select('aspectRatio', { label: en ? 'Aspect Ratio' : 'Bildformat', options: ['square', '4/3', '16/9', 'auto'], default: 'square' }),
                images,
            ] },
            'hero-slider': { label: en ? 'Hero Slider' : 'Hero-Slider', fields: [
                field.string('title', { label: en ? 'Title' : 'Titel', required: false,
                    hint: en ? 'Optional heading above the slider — usually left blank' : 'Optionale Überschrift über dem Slider — meist leer lassen' }),
                field.boolean('autoplay', { label: en ? 'Autoplay' : 'Automatisch wechseln', default: true }),
                field.number('interval', { label: en ? 'Interval (ms)' : 'Intervall (ms)', default: 5000, min: 1000,
                    hint: en ? 'Time between slides; ignored when autoplay is off' : 'Wartezeit zwischen Slides; ignoriert wenn Automatik aus ist' }),
                field.select('height', { label: en ? 'Height' : 'Höhe', options: ['sm', 'md', 'lg', 'full'], default: 'lg' }),
                field.images('slides', { ...imageLabels, label: 'Slides', sourceLabel: en ? 'Background Image' : 'Hintergrundbild', fields: [
                    headline,
                    field.text('subtitle', { label: en ? 'Subtitle' : 'Untertitel', required: false }),
                    field.string('href', { label: en ? 'CTA Link' : 'CTA-Link', required: false }), cta,
                ] }),
            ] },
            carousel: { label: en ? 'Carousel' : 'Karussell', fields: [title,
                field.boolean('autoplay', { label: en ? 'Autoplay' : 'Automatisch wechseln', default: false }),
                field.number('interval', { label: en ? 'Interval (ms)' : 'Intervall (ms)', default: 4000, min: 1000 }),
                field.boolean('showDots', { label: en ? 'Show dots' : 'Punkte anzeigen', default: true }),
                field.boolean('showArrows', { label: en ? 'Show arrows' : 'Pfeile anzeigen', default: true }),
                field.images('slides', { ...imageLabels, label: en ? 'Slides' : 'Folien', fields: [caption] }),
            ] },
            'masonry-grid': { label: en ? 'Masonry Grid' : 'Mosaik-Raster', fields: [title, columns, gap, images] },
            'feature-highlight': { label: en ? 'Feature Highlight' : 'Funktions-Hervorhebung', fields: [title,
                field.select('gap', { label: en ? 'Gap' : 'Abstand', options: ['sm', 'md', 'lg'], default: 'lg' }),
                field.images('items', { ...imageLabels, label: en ? 'Items' : 'Einträge', fields: [headline,
                    field.text('description', { label: en ? 'Description' : 'Beschreibung' }), href, cta,
                    field.select('imagePosition', { label: en ? 'Image Position' : 'Bildposition', options: ['left', 'right'], required: false,
                        hint: en ? 'Default: alternates automatically (left/right)' : 'Standard: alterniert automatisch (links/rechts)' }),
                ] }),
            ] },
            'lightbox-grid': { label: en ? 'Lightbox Grid' : 'Lightbox-Raster', fields: [title, columns, gap,
                field.select('aspectRatio', { label: en ? 'Aspect Ratio' : 'Bildformat', options: ['square', '4/3', 'auto'], default: 'square' }),
                field.images('items', { ...imageLabels, label: en ? 'Images' : 'Bilder', fields: [title,
                    field.text('description', { label: en ? 'Description' : 'Beschreibung', required: false }),
                ] }),
            ] },
        },
    } as const satisfies Variants;
}
