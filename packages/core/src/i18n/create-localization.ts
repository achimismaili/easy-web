import { z } from 'astro/zod'
import { cliUiLocaleSchema, contentLocaleSchema, formatLocaleSchema, ianaTimeZoneSchema } from './locale-inputs.js'
import { validateLocalizedPaths } from './localized-paths.js'
import type { ExplicitFormatContext } from './explicit-formatters.js'

export const formatLocalesSchema = z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('shared'), locale: formatLocaleSchema }).strict().readonly(),
    z.object({ mode: z.literal('per-language'), locales: z.record(z.string(), formatLocaleSchema).readonly() }).strict().readonly(),
])
export type FormatLocales = z.infer<typeof formatLocalesSchema>

/** Interview language is not site content; regional presentation is not route identity. */
export const createLocalizationSchema = z.object({
    cliUiLocale: cliUiLocaleSchema,
    contentLocales: z.array(contentLocaleSchema).min(1).readonly(),
    defaultContentLocale: contentLocaleSchema,
    localizedLabels: z.record(z.string(), z.record(z.string(), z.string()).readonly()).readonly(),
    // Same complete public paths consumed by createI18n and easyWebSeo, not slug fragments.
    localizedPaths: z.array(z.record(z.string(), z.string()).readonly()).readonly(),
    formatLocales: formatLocalesSchema,
    timeZone: ianaTimeZoneSchema,
}).strict().superRefine((input, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
    const localeKeys = input.contentLocales.map((locale) => locale.toLowerCase())
    if (new Set(localeKeys).size !== localeKeys.length) add('contentLocales', 'Content locales must be unique')
    if (!input.contentLocales.includes(input.defaultContentLocale)) add('defaultContentLocale', 'Default must be a selected content locale')
    const checkKeys = (path: string, keys: readonly string[]) => {
        if (keys.length !== input.contentLocales.length || keys.some((key) => !input.contentLocales.some((locale) => locale === key))) {
            add(path, 'Declare exactly the selected content locales')
        }
    }
    checkKeys('localizedLabels', Object.keys(input.localizedLabels))
    const labelSets = Object.values(input.localizedLabels).map((labels) => Object.keys(labels).sort().join('\0'))
    if (new Set(labelSets).size > 1) add('localizedLabels', 'Translate the same label keys in every content locale')
    for (const problem of validateLocalizedPaths(input.localizedPaths, input.contentLocales)) add('localizedPaths', problem)
    if (input.formatLocales.mode === 'per-language') checkKeys('formatLocales', Object.keys(input.formatLocales.locales))
}).readonly()

export type CreateLocalization = z.infer<typeof createLocalizationSchema>

export function parseCreateLocalization(input: unknown): CreateLocalization {
    return createLocalizationSchema.parse(input)
}

export class UnselectedContentLocaleError extends RangeError {
    constructor(readonly locale: string) {
        super(`Content locale was not selected: ${locale}`)
        this.name = 'UnselectedContentLocaleError'
    }
}

export function resolveFormatContext(input: CreateLocalization, contentLocale: string): ExplicitFormatContext {
    if (!input.contentLocales.some((locale) => locale === contentLocale)) throw new UnselectedContentLocaleError(contentLocale)
    switch (input.formatLocales.mode) {
        case 'shared':
            return { locale: input.formatLocales.locale, timeZone: input.timeZone }
        case 'per-language': {
            const locale = input.formatLocales.locales[contentLocale]
            if (locale === undefined) throw new UnselectedContentLocaleError(contentLocale)
            return { locale, timeZone: input.timeZone }
        }
        default: {
            const exhaustive: never = input.formatLocales
            return exhaustive
        }
    }
}
