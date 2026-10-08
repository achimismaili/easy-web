import type { FieldDef, FieldOptions, TextOptions, NumberOptions, SelectOption, Pattern } from './types.js';
import type { RequiredValue } from './infer.js';
import { image, images } from './image-fields.js';
import { list, object, navItems, perLocale } from './structured-fields.js';

const whitespace: Pattern = ['\\S', 'Darf nicht nur aus Leerzeichen bestehen.'];

function textField<const N extends string, const K extends 'string' | 'text'>(name: N, kind: K, options: TextOptions): FieldDef<N, string | undefined, K> {
    const { label, required = true, pattern, hint, default: defaultValue } = options;
    const validation = required
        ? pattern ? [`^(?=[\\s\\S]*\\S)[\\s\\S]*?(?:${pattern[0]})`, pattern[1]] as const : whitespace
        : pattern;
    return Object.freeze({ name, kind, required, decap: { name, widget: kind, label, required,
        ...(hint !== undefined ? { hint } : {}), ...(defaultValue !== undefined ? { default: defaultValue } : {}),
        ...(validation ? { pattern: validation } : {}) } });
}

export function string<const N extends string, const O extends TextOptions>(name: N, options: O): FieldDef<N, RequiredValue<string, O>, 'string'>;
export function string(name: string, options: TextOptions): FieldDef { return textField(name, 'string', options); }

export function text<const N extends string, const O extends TextOptions>(name: N, options: O): FieldDef<N, RequiredValue<string, O>, 'text'>;
export function text(name: string, options: TextOptions): FieldDef { return textField(name, 'text', options); }

function body({ label = 'Inhalt' }: { readonly label?: string } = {}): FieldDef<'body', never, 'body'> {
    return Object.freeze({ name: 'body', kind: 'body', required: true, decap: { name: 'body', label, widget: 'markdown' } } as const);
}

function number<const N extends string, const O extends NumberOptions>(name: N, options: O): FieldDef<N, RequiredValue<number, O>, 'number'>;
function number(name: string, options: NumberOptions): FieldDef {
    const { label, required = true, valueType = 'int', min, max, step, hint, default: defaultValue } = options;
    return Object.freeze({ name, kind: 'number', required, decap: { name, widget: 'number', label, required, value_type: valueType,
        ...(hint !== undefined ? { hint } : {}), ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}),
        ...(step !== undefined ? { step } : {}), ...(defaultValue !== undefined ? { default: defaultValue } : {}) } } as const);
}

function boolean<const N extends string>(name: N, options: { readonly label: string; readonly default?: boolean }): FieldDef<N, boolean, 'boolean'> {
    return Object.freeze({ name, kind: 'boolean', required: false, decap: { name, widget: 'boolean', label: options.label, required: false, default: options.default ?? false } } as const);
}

function color<const N extends string>(name: N, options: { readonly label: string; readonly default?: string }): FieldDef<N, string, 'color'> {
    return Object.freeze({ name, kind: 'color', required: true, decap: { name, widget: 'color', label: options.label, required: true,
        ...(options.default !== undefined ? { default: options.default } : {}) } } as const);
}

function date<const N extends string, const O extends FieldOptions & { readonly hint?: string }>(name: N, options: O): FieldDef<N, RequiredValue<Date, O>, 'date'>;
function date(name: string, options: FieldOptions & { readonly hint?: string }): FieldDef {
    const { label, required = true, hint } = options;
    return Object.freeze({ name, kind: 'date', required, decap: { name, widget: 'datetime', label, required,
        ...(hint !== undefined ? { hint } : {}),
        format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, picker_utc: true } } as const);
}

type SelectOptions = FieldOptions & { readonly options: readonly SelectOption[]; readonly default?: string; readonly hint?: string };
type SelectValue<O extends SelectOptions> = O['options'][number] extends infer V
    ? V extends string ? V : V extends { readonly value: infer S } ? S : never : never;
function select<const N extends string, const O extends SelectOptions>(name: N, options: O): FieldDef<N, RequiredValue<SelectValue<O>, O>, 'select'>;
function select(name: string, options: SelectOptions): FieldDef {
    const { label, required = true, default: defaultValue, hint } = options;
    return Object.freeze({ name, kind: 'select', required, decap: { name, widget: 'select', label, required, options: options.options,
        ...(hint !== undefined ? { hint } : {}), ...(defaultValue !== undefined ? { default: defaultValue } : {}) } } as const);
}

function hidden<const N extends string, const V extends string>(name: N, options: { readonly default: V }): FieldDef<N, V, 'hidden'> {
    return Object.freeze({ name, kind: 'hidden', required: true, decap: { name, widget: 'hidden', default: options.default } } as const);
}

export const field = Object.freeze({ string, text, body, number, boolean, color, date, select, hidden, image, images, list, object, navItems, perLocale });
