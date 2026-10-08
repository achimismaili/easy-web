import { field } from './fields.js';
import { navigation, notFound } from './localized-field-sets.js';
import { galleryVariants } from './gallery-field-sets.js';

export type UiOptions = { readonly uiLocale?: 'de' | 'en' };

function item({ uiLocale = 'de' }: UiOptions = {}) {
    const en = uiLocale === 'en';
    return [
        field.string('title', { label: en ? 'Title' : 'Titel' }),
        field.text('description', { label: en ? 'Description' : 'Beschreibung', required: false }),
        field.image('image', { label: en ? 'Image' : 'Bild', required: false, alt: 'required' }),
        field.number('order', { label: en ? 'Order' : 'Reihenfolge', required: false }),
    ] as const;
}

function page(options: UiOptions = {}) {
    const [title, , image, order] = item(options);
    return [title, field.text('description', { label: options.uiLocale === 'en' ? 'Description' : 'Beschreibung' }), image, order] as const;
}

function article(options: UiOptions = {}) {
    const en = options.uiLocale === 'en';
    return [...item(options),
        field.date('datePublished', { label: en ? 'Published date' : 'Veröffentlichungsdatum' }),
        field.date('dateModified', { label: en ? 'Modified date' : 'Änderungsdatum', required: false }),
        field.string('author', { label: en ? 'Author' : 'Autor', required: false }),
        field.list('tags', { label: en ? 'Tags' : 'Schlagwörter', field: field.string('tag', { label: en ? 'Tag' : 'Schlagwort' }) }),
    ] as const;
}

function event(options: UiOptions = {}) {
    const en = options.uiLocale === 'en';
    return [...item(options),
        field.date('startDate', { label: en ? 'Start date' : 'Startdatum' }),
        field.date('endDate', { label: en ? 'End date' : 'Enddatum', required: false }),
        field.string('location', { label: en ? 'Location' : 'Ort', required: false }),
    ] as const;
}

function organization({ uiLocale = 'de' }: UiOptions = {}) {
    const en = uiLocale === 'en';
    return [
        field.string('name', { label: 'Name' }),
        field.image('logo', { label: 'Logo', alt: 'required' }),
        field.string('url', { label: en ? 'Website' : 'Webseite', required: false }),
        field.text('description', { label: en ? 'Description' : 'Beschreibung', required: false }),
    ] as const;
}

function person({ uiLocale = 'de' }: UiOptions = {}) {
    const en = uiLocale === 'en';
    return [
        field.string('name', { label: 'Name' }),
        field.string('role', { label: en ? 'Role' : 'Rolle', required: false }),
        field.image('image', { label: en ? 'Image' : 'Bild', required: false, alt: 'required' }),
        field.string('email', { label: en ? 'Email' : 'E-Mail', required: false }),
    ] as const;
}

function product(options: UiOptions = {}) {
    const [title, description, , order] = item(options);
    return [title, description, field.image('image', { label: options.uiLocale === 'en' ? 'Image' : 'Bild', alt: 'required' }), order] as const;
}

function siteSettings({ uiLocale = 'de' }: UiOptions = {}) {
    return [field.string('siteName', { label: uiLocale === 'en' ? 'Site name' : 'Seitenname' })] as const;
}

export const fieldSets = Object.freeze({ item, page, article, event, organization, person, product, navigation, siteSettings, notFound, galleryVariants });
