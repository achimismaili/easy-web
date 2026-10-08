import type { FieldDef, FieldOptions, ListOptions } from './types.js';
import type { FieldData, InferFields, OptionalValue, RequiredValue } from './infer.js';

export type ScalarListOptions = Omit<ListOptions, 'fields'> & { readonly field: FieldDef };
export function list<const N extends string, const O extends ListOptions>(name: N, options: O): FieldDef<N, OptionalValue<InferFields<O['fields']>[], O>, 'list'>;
export function list<const N extends string, const O extends ScalarListOptions>(name: N, options: O): FieldDef<N, OptionalValue<FieldData<O['field']>[], O>, 'list'>;
export function list(name: string, options: ListOptions | ScalarListOptions): FieldDef {
    const { label, labelSingular, required = false, min, max } = options;
    const common = { name, label, widget: 'list', required,
        ...(labelSingular !== undefined ? { label_singular: labelSingular } : {}),
        ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } as const;
    return 'fields' in options
        ? Object.freeze({ name, kind: 'list', required, fields: options.fields, decap: { ...common, fields: options.fields.map(f => f.decap) } })
        : Object.freeze({ name, kind: 'list', required, itemField: options.field, decap: { ...common, field: options.field.decap } });
}

type ObjectOptions = FieldOptions & { readonly fields: readonly FieldDef[] };
export function object<const N extends string, const O extends ObjectOptions>(name: N, options: O): FieldDef<N, RequiredValue<InferFields<O['fields']>, O>, 'object'>;
export function object(name: string, options: ObjectOptions): FieldDef {
    const { label, fields, required = true } = options;
    return Object.freeze({ name, kind: 'object', required, fields,
        decap: { name, label, widget: 'object', required, fields: fields.map(f => f.decap) } } as const);
}

type NavEntry = { readonly label: string; readonly href: string; readonly order?: number };
type NavOptions = { readonly label: string; readonly nested?: boolean };
type NavData<O extends NavOptions> = O extends { readonly nested: true }
    ? (NavEntry & { readonly children?: NavEntry[] })[] : NavEntry[];
export function navItems<const N extends string, const O extends NavOptions>(name: N, options: O): FieldDef<N, NavData<O>, 'navItems'>;
export function navItems(name: string, options: NavOptions): FieldDef {
    const fields: readonly FieldDef[] = [
        { name: 'label', kind: 'string', required: true, decap: { name: 'label', label: 'Beschriftung', widget: 'string', required: true, pattern: ['\\S', 'Darf nicht nur aus Leerzeichen bestehen.'] } },
        { name: 'href', kind: 'string', required: true, decap: { name: 'href', label: 'Link', widget: 'string', required: true, pattern: ['\\S', 'Darf nicht nur aus Leerzeichen bestehen.'] } },
        { name: 'order', kind: 'number', required: false, decap: { name: 'order', label: 'Reihenfolge', widget: 'number', required: false, value_type: 'int' } },
    ];
    const children = list('children', { label: 'Unterpunkte', fields });
    const result = list(name, { label: options.label, required: true, fields: options.nested ? [...fields, children] : fields });
    return Object.freeze({ ...result, kind: 'navItems' });
}

type PerLocaleOptions<L extends readonly string[], F extends FieldDef> = FieldOptions & {
    readonly locales: L;
    readonly field: (locale: L[number]) => F;
};
type LocalizedData<L extends readonly string[], F extends FieldDef> = undefined extends FieldData<F>
    ? { readonly [K in L[number]]?: FieldData<F> } : { readonly [K in L[number]]: FieldData<F> };
export function perLocale<const N extends string, const O extends PerLocaleOptions<readonly string[], FieldDef>>(
    name: N, options: O,
): FieldDef<N, RequiredValue<LocalizedData<O['locales'], ReturnType<O['field']>>, O>, 'perLocale'>;
export function perLocale(name: string, options: PerLocaleOptions<readonly string[], FieldDef>): FieldDef {
    const fields = options.locales.map(locale => {
        const entry = options.field(locale);
        return Object.freeze({ ...entry, name: locale, decap: { ...entry.decap, name: locale } });
    });
    return Object.freeze({ ...object(name, { label: options.label, fields, required: options.required ?? true }), kind: 'perLocale', locales: options.locales });
}
