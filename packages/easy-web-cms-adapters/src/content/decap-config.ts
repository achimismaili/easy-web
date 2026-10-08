import type { ContentTypeDef, DecapField, SingletonDef, FieldDef } from './types.js';

export interface DecapCollection {
    readonly name: string;
    readonly label: string;
    readonly label_singular?: string;
    readonly folder: string;
    readonly create: boolean;
    readonly delete?: boolean;
    readonly slug?: string;
    readonly extension: 'md' | 'yml' | 'json';
    readonly format: 'frontmatter' | 'yml' | 'json';
    readonly identifier_field: string;
    readonly sortable_fields?: readonly string[];
    readonly filter?: { readonly field: string; readonly value: string };
    readonly media_folder?: string;
    readonly public_folder?: string;
    readonly fields: readonly DecapField[];
}
export interface DecapFilesCollection {
    readonly name: string;
    readonly label: string;
    readonly files: readonly { readonly name: string; readonly label: string; readonly file: string; readonly fields: readonly DecapField[] }[];
}
export interface DecapConfigOptions {
    readonly backend: { readonly name: 'azure'; readonly repo: string; readonly tenant_id: string; readonly app_id: string; readonly branch?: string };
    readonly mediaFolder: string;
    readonly publicFolder: string;
    readonly locale?: string;
    readonly contentTypes: readonly ContentTypeDef[];
    readonly singletons?: readonly SingletonDef[];
    readonly singletonsLabel?: string;
    readonly publishMode?: string;
}
export interface DecapConfig {
    readonly backend: { readonly name: 'azure'; readonly repo: string; readonly tenant_id: string; readonly app_id: string; readonly branch: string };
    readonly media_folder: string;
    readonly public_folder: string;
    readonly locale: string;
    readonly load_config_file: false;
    readonly collections: readonly (DecapCollection | DecapFilesCollection)[];
    readonly publish_mode?: string;
}

interface Globals { readonly mediaFolder: string; readonly publicFolder: string }

// Decap resolves a custom media_folder without a leading slash relative to the entry's own folder.
const absolute = (folder: string): string => (folder.startsWith('/') ? folder : `/${folder}`);

function clean(decap: DecapField, globals: Globals): DecapField {
    const { media_folder, public_folder, fields, field, ...rest } = decap;
    return { ...rest,
        ...(media_folder !== undefined && absolute(media_folder) !== absolute(globals.mediaFolder)
            ? { media_folder: absolute(media_folder) } : {}),
        ...(public_folder !== undefined && public_folder !== globals.publicFolder ? { public_folder } : {}),
        ...(fields ? { fields: fields.map(child => clean(child, globals)) } : {}),
        ...(field ? { field: clean(field, globals) } : {}) };
}

const formats = {
    md: { extension: 'md', format: 'frontmatter' },
    yml: { extension: 'yml', format: 'yml' },
    json: { extension: 'json', format: 'json' },
} as const;

function build(def: ContentTypeDef, globals: Globals, parts: {
    readonly name: string; readonly label: string; readonly labelSingular?: string; readonly folder: string;
    readonly filter?: { readonly field: string; readonly value: string };
    readonly leading: readonly FieldDef[]; readonly extra: readonly FieldDef[]; readonly locale?: string;
}): DecapCollection {
    const generated = def.generatedFields.map(f => (f.name === 'locale' && parts.locale !== undefined
        ? { ...f.decap, default: parts.locale } : f.decap));
    const ordered = [
        ...parts.leading.map(f => f.decap),
        ...def.fields.filter(f => f.kind !== 'body').map(f => f.decap),
        ...parts.extra.map(f => f.decap),
        ...generated,
        ...def.fields.filter(f => f.kind === 'body').map(f => f.decap),
    ].map(f => clean(f, globals));
    return { name: parts.name, label: parts.label,
        ...(parts.labelSingular !== undefined ? { label_singular: parts.labelSingular } : {}),
        folder: parts.folder, create: def.create,
        ...(def.delete !== undefined ? { delete: def.delete } : {}),
        ...(def.slug !== undefined ? { slug: def.slug } : {}),
        ...formats[def.format], identifier_field: def.identifierField,
        ...(def.sortableFields ? { sortable_fields: def.sortableFields } : {}),
        ...(parts.filter ? { filter: parts.filter } : {}),
        ...(def.mediaFolder !== undefined && absolute(def.mediaFolder) !== absolute(globals.mediaFolder)
            ? { media_folder: absolute(def.mediaFolder) } : {}),
        ...(def.publicFolder !== undefined && def.publicFolder !== globals.publicFolder
            ? { public_folder: def.publicFolder } : {}),
        fields: ordered };
}

export function toDecapCollections(def: ContentTypeDef, globals: Globals = { mediaFolder: '', publicFolder: '' }): readonly DecapCollection[] {
    const locales = def.locales && def.locales.length > 1 ? def.locales : [undefined];
    return locales.flatMap(locale => {
        const suffix = locale === undefined ? '' : `_${locale}`;
        const folder = locale === undefined ? def.folder : `${def.folder}/${locale}`;
        const tag = locale === undefined ? '' : ` (${locale.toUpperCase()})`;
        if (!def.variants) {
            return [build(def, globals, { name: `${def.name}${suffix}`, label: `${def.label}${tag}`,
                ...(def.labelSingular !== undefined ? { labelSingular: def.labelSingular } : {}),
                folder, leading: [], extra: [], ...(locale !== undefined ? { locale } : {}) })];
        }
        const { discriminator, options } = def.variants;
        return Object.entries(options).map(([value, option]) => {
            const singular = option.labelSingular ?? def.labelSingular;
            return build(def, globals, { name: `${option.collectionName}${suffix}`,
                label: `${def.label}: ${option.label}${tag}`,
                ...(singular !== undefined ? { labelSingular: singular } : {}),
                folder, filter: { field: discriminator, value },
                leading: [{ name: discriminator, kind: 'hidden', required: false,
                    decap: { name: discriminator, label: def.variants?.label ?? discriminator, widget: 'hidden', default: value } }],
                extra: option.fields, ...(locale !== undefined ? { locale } : {}) });
        });
    });
}

export function toDecapFiles(
    singletons: readonly SingletonDef[],
    { name = 'site_config', label = 'Site-Konfiguration' }: { readonly name?: string; readonly label?: string } = {},
    globals: Globals = { mediaFolder: '', publicFolder: '' },
): DecapFilesCollection {
    return { name, label, files: singletons.map(s => ({ name: s.name, label: s.label, file: s.file,
        fields: s.fields.map(f => clean(f.decap, globals)) })) };
}

export function buildDecapConfig(options: DecapConfigOptions): DecapConfig {
    const { backend, mediaFolder, publicFolder, locale, contentTypes, singletons = [], singletonsLabel, publishMode } = options;
    const globals = { mediaFolder, publicFolder };
    for (const singleton of singletons) {
        const effective = singleton.publicFolder ?? publicFolder;
        if (effective !== publicFolder) {
            throw new Error(`Singleton "${singleton.name}": public folder "${effective}" differs from the global public folder `
                + `"${publicFolder}"; Decap files collections cannot override media folders per file.`);
        }
    }
    return {
        backend: { name: 'azure', repo: backend.repo, tenant_id: backend.tenant_id, app_id: backend.app_id,
            branch: backend.branch ?? 'main' },
        media_folder: mediaFolder, public_folder: publicFolder, locale: locale ?? 'de', load_config_file: false,
        collections: [
            ...contentTypes.flatMap(def => toDecapCollections(def, globals)),
            ...(singletons.length > 0
                ? [toDecapFiles(singletons, singletonsLabel !== undefined ? { label: singletonsLabel } : {}, globals)] : []),
        ],
        ...(publishMode ? { publish_mode: publishMode } : {}),
    };
}
