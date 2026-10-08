import { field } from './fields.js';
import { resolveFields } from './definition-fields.js';
import { DefinitionError } from './types.js';
import type { ContentTypeOptions, ContentTypeDef, SingletonOptions, SingletonDef, FieldDef } from './types.js';

export function defineContentType<const O extends ContentTypeOptions>(options: O): ContentTypeDef<O>;
export function defineContentType(options: ContentTypeOptions): ContentTypeDef {
    const generatedFields: FieldDef[] = [];
    if (options.locales && options.locales.length > 1) {
        generatedFields.push(field.hidden('locale', { default: options.locales[0] }),
            field.string('translationKey', { label: 'Übersetzungsschlüssel' }));
    }
    switch (options.publish) {
        case 'missing-date-means-draft':
            generatedFields.push(field.date('publishDate', { label: 'Veröffentlichungsdatum', required: false,
                hint: 'Ohne Datum bleibt der Eintrag unveröffentlicht. Ein Datum in der Zukunft hält ihn bis dahin zurück.' }));
            break;
        case 'missing-date-means-published':
            generatedFields.push(field.date('publishDate', { label: 'Veröffentlichungsdatum', required: false,
                hint: 'Ohne Datum sofort sichtbar. Ein zukünftiges Datum hält den Eintrag bis dahin überall zurück.' }));
            break;
        case undefined: break;
        default: {
            const exhaustive: never = options.publish;
            throw new DefinitionError(options.name, 'publish', String(exhaustive));
        }
    }
    const identifierField = options.identifierField ?? (options.fields.some(f => f.name === 'title') ? 'title' : 'name');
    if (!options.fields.some(f => f.name === identifierField)) {
        throw new DefinitionError(options.name, 'identifierField', `missing ${identifierField}; expected title or name or configured identifier`);
    }
    const allFields = resolveFields(options, [...options.fields, ...generatedFields]);
    const fields = allFields.slice(0, options.fields.length);
    const { variants, ...settings } = options;
    const common = { ...settings, kind: 'contentType', format: options.format ?? 'md', create: options.create ?? true,
        identifierField, fields, generatedFields: allFields.slice(options.fields.length) } as const;
    if (!variants) return Object.freeze(common);
    if (Object.keys(variants.options).length === 0) {
        throw new DefinitionError(options.name, variants.discriminator, 'empty variant options');
    }
    const collections = new Set<string>();
    const entries = Object.entries(variants.options).map(([value, variant]) => {
        const collectionName = variant.collectionName ?? `${options.name}_${value}`;
        if (!collectionName.trim() || collections.has(collectionName)) {
            throw new DefinitionError(options.name, value, 'collectionName must be non-empty and unique');
        }
        collections.add(collectionName);
        if (!value.trim()) throw new DefinitionError(options.name, variants.discriminator, 'empty variant value');
        const resolved = resolveFields(options, [...allFields, ...variant.fields,
            field.hidden(variants.discriminator, { default: value })]);
        return [value, Object.freeze({ ...variant, collectionName,
            fields: resolved.slice(allFields.length, allFields.length + variant.fields.length) })] as const;
    });
    return Object.freeze({ ...common, variants: Object.freeze({ ...variants, options: Object.freeze(Object.fromEntries(entries)) }) });
}

export function defineSingleton<const O extends SingletonOptions>(options: O): SingletonDef<O>;
export function defineSingleton(options: SingletonOptions) {
    return Object.freeze({ ...options, kind: 'singleton', fields: resolveFields(options, options.fields) });
}
