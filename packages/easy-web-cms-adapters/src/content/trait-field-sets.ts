import type { ContentTrait } from '@easy-web/core/contracts';
import { field } from './fields.js';
import type { UiOptions } from './field-sets.js';
import type { FieldDef, Folders } from './types.js';

export type TraitFieldOptions = UiOptions & Folders;

function labels(options: TraitFieldOptions) {
    const en = options.uiLocale === 'en';
    return {
        title: en ? 'Title' : 'Titel',
        slug: 'Slug',
        summary: en ? 'Summary' : 'Zusammenfassung',
        body: en ? 'Content' : 'Inhalt',
        image: en ? 'Image' : 'Bild',
        photos: en ? 'Photos' : 'Fotos',
        order: en ? 'Order' : 'Reihenfolge',
        taxonomy: en ? 'Taxonomy' : 'Taxonomie',
        publishDate: en ? 'Published date' : 'Veröffentlichungsdatum',
        modifiedDate: en ? 'Modified date' : 'Änderungsdatum',
        startDate: en ? 'Start date' : 'Startdatum',
        endDate: en ? 'End date' : 'Enddatum',
        location: en ? 'Location' : 'Ort',
        cta: en ? 'Call to action' : 'Handlungsaufforderung',
        ctaLabel: en ? 'Label' : 'Beschriftung',
        amount: en ? 'Amount' : 'Betrag',
        currency: en ? 'Currency' : 'Währung',
        featured: en ? 'Featured' : 'Hervorgehoben',
    } as const;
}

function fieldsForTrait(trait: ContentTrait, options: TraitFieldOptions): readonly FieldDef[] {
    const label = labels(options);
    switch (trait) {
        case 'title':
            return [field.string('title', { label: label.title })];
        case 'slug':
            return [field.string('slug', { label: label.slug, pattern: ['^[a-z0-9]+(?:-[a-z0-9]+)*$', 'Use lowercase kebab-case.'] })];
        case 'summary':
            return [field.text('summary', { label: label.summary })];
        case 'body':
            return [field.body({ label: label.body })];
        case 'image':
            return [field.image('image', { label: label.image, alt: 'required', ...options })];
        case 'photos':
            return [field.images('photos', { label: label.photos, ...options })];
        case 'order':
            return [field.number('order', { label: label.order })];
        case 'taxonomy':
            return [field.list('taxonomy', { label: label.taxonomy, field: field.string('term', { label: label.taxonomy }) })];
        case 'publication':
            return [
                field.date('publishDate', { label: label.publishDate }),
                field.date('modifiedDate', { label: label.modifiedDate, required: false }),
            ];
        case 'schedule':
            return [
                field.date('startDate', { label: label.startDate }),
                field.date('endDate', { label: label.endDate, required: false }),
            ];
        case 'location':
            return [field.string('location', { label: label.location })];
        case 'cta':
            return [field.object('cta', { label: label.cta, fields: [
                field.string('label', { label: label.ctaLabel }),
                field.string('href', { label: 'Link' }),
                field.boolean('external', { label: 'External' }),
            ] })];
        case 'money':
            return [
                field.number('amount', { label: label.amount, valueType: 'float' }),
                field.select('currency', { label: label.currency, options: Intl.supportedValuesOf('currency') }),
            ];
        case 'featured':
            return [field.boolean('featured', { label: label.featured })];
    }
}

export function fieldsForTraits(traits: readonly ContentTrait[], options: TraitFieldOptions = {}): readonly FieldDef[] {
    return traits.flatMap((trait) => fieldsForTrait(trait, options));
}
