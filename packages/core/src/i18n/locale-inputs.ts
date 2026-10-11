import { z } from 'astro/zod'

// RFC 5646 language tags, including private-use and grandfathered tags.
const languageTag = /^(?:[a-z]{2,3}(?:-[a-z]{3}){0,3}|[a-z]{4}|[a-z]{5,8})(?:-[a-z]{4})?(?:-[a-z]{2}|-\d{3})?(?:-(?:[a-z\d]{5,8}|\d[a-z\d]{3}))*(?:-[a-wy-z\d](?:-[a-z\d]{2,8})+)*(?:-x(?:-[a-z\d]{1,8})+)?$|^x(?:-[a-z\d]{1,8})+$|^(?:en-GB-oed|i-(?:ami|bnn|default|enochian|hak|klingon|lux|mingo|navajo|pwn|tao|tay|tsu)|sgn-(?:BE-FR|BE-NL|CH-DE)|art-lojban|cel-gaulish|no-bok|no-nyn|zh-(?:guoyu|hakka|min|min-nan|xiang))$/i

function isContentLocale(value: string): boolean {
    if (!languageTag.test(value)) return false
    const segments = value.toLowerCase().split('-')
    if (segments[0] === 'x' || /^(i-|sgn-|en-gb-oed$)/.test(value.toLowerCase())) return true
    const extensions = new Set<string>()
    const variants = new Set<string>()
    for (const segment of segments.slice(1)) {
        if (segment === 'x') break
        if (segment.length === 1) {
            if (extensions.has(segment)) return false
            extensions.add(segment)
        } else if (extensions.size === 0 && /^(?:[a-z\d]{5,8}|\d[a-z\d]{3})$/.test(segment)) {
            if (variants.has(segment)) return false
            variants.add(segment)
        }
    }
    return true
}

function supportsFormatLocale(value: string): boolean {
    try {
        return Intl.DateTimeFormat.supportedLocalesOf(value, { localeMatcher: 'lookup' }).length === 1
            && Intl.NumberFormat.supportedLocalesOf(value, { localeMatcher: 'lookup' }).length === 1
    } catch (error) {
        if (error instanceof RangeError) return false
        throw error
    }
}

function isTimeZone(value: string): boolean {
    // Intl also accepts numeric offsets; the create contract accepts named IANA zones only.
    if (!/^[A-Za-z][A-Za-z\d._+-]*(?:\/[A-Za-z\d._+-]+)*$/.test(value)) return false
    try {
        new Intl.DateTimeFormat('en', { timeZone: value })
        return true
    } catch (error) {
        if (error instanceof RangeError) return false
        throw error
    }
}

export const cliUiLocaleSchema = z.enum(['en', 'de'])
export type CliUiLocale = z.infer<typeof cliUiLocaleSchema>
export const contentLocaleSchema = z.string().refine(isContentLocale, 'Invalid BCP47 content locale').brand<'ContentLocale'>()
export type ContentLocale = z.infer<typeof contentLocaleSchema>
export const formatLocaleSchema = z.string().refine(supportsFormatLocale, 'Unsupported or malformed format locale').brand<'FormatLocale'>()
export type FormatLocale = z.infer<typeof formatLocaleSchema>
export const ianaTimeZoneSchema = z.string().refine(isTimeZone, 'Invalid IANA timezone').brand<'IanaTimeZone'>()
export type IanaTimeZone = z.infer<typeof ianaTimeZoneSchema>

// Intl accepts any three-letter code, so check its ISO 4217 catalog as well as shape.
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/).refine(
    (value) => Intl.supportedValuesOf('currency').includes(value),
    'Unsupported ISO 4217 currency',
).brand<'CurrencyCode'>()
export type CurrencyCode = z.infer<typeof currencyCodeSchema>
export const optionalCurrencyCodeSchema = currencyCodeSchema.optional()

/** Only auto-detected interview languages fall back; explicit input uses cliUiLocaleSchema. */
export function resolveDetectedCliUiLocale(detected: string | undefined): CliUiLocale {
    if (detected === undefined) return 'en'
    try {
        return new Intl.Locale(detected).language === 'de' ? 'de' : 'en'
    } catch (error) {
        if (error instanceof RangeError) return 'en'
        throw error
    }
}
