import type { FieldDef, FieldKind, Variants } from './types.js';

export type FieldData<F> = F extends FieldDef<string, infer Data, FieldKind> ? Data : never;
export type Simplify<T> = { readonly [K in keyof T]: T[K] };
export type InferFields<F extends readonly FieldDef[]> = Simplify<{
    readonly [Entry in F[number] as Entry['kind'] extends 'body' ? never
        : undefined extends FieldData<Entry> ? never : Entry['name']]: FieldData<Entry>;
} & {
    readonly [Entry in F[number] as Entry['kind'] extends 'body' ? never
        : undefined extends FieldData<Entry> ? Entry['name'] : never]?: FieldData<Entry>;
}>;
export type RequiredValue<T, O> = O extends { readonly required: infer R } ? false extends R ? T | undefined : T : T;
export type OptionalValue<T, O> = O extends { readonly required: true } ? T : T | undefined;
export type LocaleData<D> = D extends { readonly locales: readonly [string, string, ...string[]] }
    ? { readonly locale: D['locales'][number]; readonly translationKey: string } : object;
type PublishData<D> = D extends { readonly publish: string } ? { readonly publishDate?: Date } : object;
type VariantData<V extends Variants> = {
    readonly [K in keyof V['options']]: InferFields<V['options'][K]['fields']>
        & { readonly [P in V['discriminator']]: K };
}[keyof V['options']];
type Distribute<Base, Variant> = Variant extends unknown ? Simplify<Base & Variant> : never;

export type InferData<D extends { readonly fields: readonly FieldDef[] }> =
    Distribute<InferFields<D['fields']> & LocaleData<D> & PublishData<D>,
        D extends { readonly variants: infer V extends Variants } ? VariantData<V> : object>;
