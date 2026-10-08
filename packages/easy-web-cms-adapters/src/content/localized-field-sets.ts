import { field } from './fields.js';
import type { UiOptions } from './field-sets.js';
import type { FieldDef } from './types.js';
import type { InferFields } from './infer.js';

type NavigationOptions = UiOptions & {
    readonly footerNav?: boolean;
    readonly resourceLinks?: boolean;
    readonly socialLinks?: boolean;
};

type Nav = { readonly label: string; readonly href: string; readonly order?: number };
type LocaleNav<L extends readonly string[]> = { readonly [K in L[number]]: Nav[] };
type Enabled<O, K extends string, F> = O extends Readonly<Record<K, true>> ? readonly [F] : readonly [];
type NavigationFields<L extends readonly string[], O> = readonly [
    FieldDef<'mainNav', { readonly [K in L[number]]: (Nav & { readonly children?: Nav[] })[] }, 'perLocale'>,
    FieldDef<'legalNav', LocaleNav<L>, 'perLocale'>,
    FieldDef<'skipLabel', { readonly [K in L[number]]: string } | undefined, 'perLocale'>,
    ...Enabled<O, 'footerNav', FieldDef<'footerNav', LocaleNav<L>, 'perLocale'>>,
    ...Enabled<O, 'resourceLinks', FieldDef<'resourceLinks', LocaleNav<L>, 'perLocale'>>,
    ...Enabled<O, 'socialLinks', FieldDef<'socialLinks', { readonly network: string; readonly url: string; readonly label?: string }[], 'list'>>,
];
export function navigation<const L extends readonly string[], const O extends NavigationOptions = object>(locales: L, options?: O): NavigationFields<L, O>;
export function navigation(locales: readonly string[], options: NavigationOptions = {}): readonly FieldDef[] {
    const en = options.uiLocale === 'en';
    const main = field.perLocale('mainNav', { label: en ? 'Main navigation' : 'Hauptnavigation', locales,
        field: locale => field.navItems(locale, { label: locale, nested: true }) });
    const legal = field.perLocale('legalNav', { label: en ? 'Legal navigation' : 'Rechtliche Links', locales,
        field: locale => field.navItems(locale, { label: locale }) });
    const skip = field.perLocale('skipLabel', { label: en ? 'Skip link' : 'Sprunglink', locales, required: false,
        field: locale => field.string(locale, { label: locale }) });
    const footer = field.perLocale('footerNav', { label: en ? 'Footer navigation' : 'Fußnavigation', locales,
        field: locale => field.navItems(locale, { label: locale }) });
    const resources = field.perLocale('resourceLinks', { label: en ? 'Resources' : 'Ressourcen', locales,
        field: locale => field.navItems(locale, { label: locale }) });
    const social = field.list('socialLinks', { label: en ? 'Social links' : 'Soziale Netzwerke', required: true, fields: [
        field.string('network', { label: en ? 'Network' : 'Netzwerk' }),
        field.string('url', { label: 'URL' }),
        field.string('label', { label: en ? 'Label' : 'Beschriftung', required: false }),
    ] });
    return [main, legal, skip,
        ...(options.footerNav ? [footer] as const : [] as const),
        ...(options.resourceLinks ? [resources] as const : [] as const),
        ...(options.socialLinks ? [social] as const : [] as const),
    ] as const;
}

function notFoundFields({ uiLocale = 'de' }: UiOptions) {
    const en = uiLocale === 'en';
    return [
        field.image('image', { label: en ? 'Image' : 'Bild', required: false, alt: 'decorative' }),
        field.string('heading', { label: en ? 'Heading' : 'Überschrift', required: false }),
        field.text('message', { label: en ? 'Message' : 'Nachricht', required: false }),
    ] as const;
}

type NotFoundFields<L extends readonly string[]> = {
    readonly [K in keyof L]: FieldDef<L[K], InferFields<ReturnType<typeof notFoundFields>>, 'object'>;
};
export function notFound<const L extends readonly string[]>(locales: L, options?: UiOptions): NotFoundFields<L>;
export function notFound(locales: readonly string[], options: UiOptions = {}): readonly FieldDef[] {
    return locales.map(locale => field.object(locale, { label: locale.toUpperCase(), fields: notFoundFields(options) }));
}
