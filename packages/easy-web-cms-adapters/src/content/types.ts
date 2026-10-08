import type { PublishRule } from '@easy-web/core/contracts';

export declare const fieldData: unique symbol;
export type FieldKind = 'string' | 'text' | 'body' | 'number' | 'boolean' | 'color' | 'date'
    | 'select' | 'hidden' | 'image' | 'images' | 'list' | 'object' | 'navItems' | 'perLocale';
export type AltRule = 'required' | 'decorative' | { readonly from: string };
export type Pattern = readonly [string, string];
export type SelectOption = string | { readonly label: string; readonly value: string };

export interface DecapField {
    readonly name: string;
    readonly widget: 'string' | 'text' | 'markdown' | 'number' | 'boolean' | 'color'
        | 'datetime' | 'select' | 'hidden' | 'image' | 'list' | 'object';
    readonly label?: string;
    readonly required?: boolean;
    readonly hint?: string;
    readonly pattern?: Pattern;
    readonly default?: string | number | boolean;
    readonly value_type?: 'int' | 'float';
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly format?: string;
    readonly date_format?: string;
    readonly time_format?: false;
    readonly picker_utc?: boolean;
    readonly options?: readonly SelectOption[];
    readonly fields?: readonly DecapField[];
    readonly field?: DecapField;
    readonly label_singular?: string;
    readonly summary?: string;
    readonly media_folder?: string;
    readonly public_folder?: string;
}

/** Schema-only metadata stays outside `decap`; the phantom member is never emitted. */
export interface FieldDef<Name extends string = string, Data = unknown, Kind extends FieldKind = FieldKind> {
    readonly name: Name;
    readonly kind: Kind;
    readonly required: boolean;
    readonly decap: DecapField;
    readonly [fieldData]?: Data;
    readonly fields?: readonly FieldDef[];
    readonly itemField?: FieldDef;
    readonly alt?: AltRule;
    readonly mediaFolder?: string;
    readonly publicFolder?: string;
    readonly locales?: readonly string[];
}

export interface FieldOptions {
    readonly label: string;
    readonly required?: boolean;
}
export interface TextOptions extends FieldOptions {
    readonly hint?: string;
    readonly pattern?: Pattern;
    readonly default?: string;
}
export interface NumberOptions extends FieldOptions {
    readonly valueType?: 'int' | 'float';
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly default?: number;
}
export interface Folders {
    readonly mediaFolder?: string;
    readonly publicFolder?: string;
}
export interface ImageOptions extends FieldOptions, Folders {
    readonly alt: AltRule;
    readonly altLabel?: string;
    readonly altHint?: string;
}
export interface ListOptions extends FieldOptions {
    readonly labelSingular?: string;
    readonly fields: readonly FieldDef[];
    readonly min?: number;
    readonly max?: number;
}
export interface ImagesOptions extends Omit<ListOptions, 'fields'>, Folders {
    readonly fields?: readonly FieldDef[];
}
export interface VariantOption {
    readonly label: string;
    readonly labelSingular?: string;
    readonly collectionName?: string;
    readonly fields: readonly FieldDef[];
}
export interface Variants {
    readonly discriminator: string;
    readonly label: string;
    readonly options: Readonly<Record<string, VariantOption>>;
}
export interface DefinitionOptions extends Folders {
    readonly name: string;
    readonly label: string;
    readonly fields: readonly FieldDef[];
}
export interface ContentTypeOptions extends DefinitionOptions {
    readonly labelSingular?: string;
    readonly folder: string;
    readonly format?: 'md' | 'yml' | 'json';
    readonly slug?: string;
    readonly identifierField?: string;
    readonly create?: boolean;
    readonly delete?: boolean;
    readonly sortableFields?: readonly string[];
    readonly locales?: readonly string[];
    readonly publish?: PublishRule;
    readonly variants?: Variants;
}
export interface SingletonOptions extends DefinitionOptions {
    readonly file: string;
}
export type ResolvedVariants<V extends Variants> = Omit<V, 'options'> & {
    readonly options: { readonly [K in keyof V['options']]: V['options'][K] & { readonly collectionName: string } };
};
export type ContentTypeDef<O extends ContentTypeOptions = ContentTypeOptions> = Omit<O, 'variants'> & {
    readonly kind: 'contentType';
    readonly format: 'md' | 'yml' | 'json';
    readonly create: boolean;
    readonly identifierField: string;
    readonly generatedFields: readonly FieldDef[];
} & (O extends { readonly variants: infer V extends Variants }
    ? { readonly variants: ResolvedVariants<V> }
    : { readonly variants?: ResolvedVariants<Variants> });
export type SingletonDef<O extends SingletonOptions = SingletonOptions> = O & { readonly kind: 'singleton' };

export class DefinitionError extends Error {
    constructor(readonly definition: string, readonly field: string, readonly issue: string) {
        super(`${definition}: ${field}: ${issue}`);
        this.name = 'DefinitionError';
    }
}
