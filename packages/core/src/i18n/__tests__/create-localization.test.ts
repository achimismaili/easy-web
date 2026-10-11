import { describe, expect, it } from 'vitest'
import {
    cliUiLocaleSchema, contentLocaleSchema, currencyCodeSchema, formatLocaleSchema,
    ianaTimeZoneSchema, localizationInterviewCatalogs, optionalCurrencyCodeSchema,
    parseCreateLocalization, resolveDetectedCliUiLocale, resolveFormatContext,
    createI18n, UnselectedContentLocaleError,
} from '../index.js'

const input = {
    cliUiLocale: 'en',
    contentLocales: ['de', 'fr'],
    defaultContentLocale: 'de',
    localizedLabels: { de: { contact: 'Kontakt' }, fr: { contact: 'Contact' } },
    localizedPaths: [{ de: '/kontakt/', fr: '/fr/contact/' }],
    formatLocales: { mode: 'shared', locale: 'de-AT' },
    timeZone: 'Europe/Vienna',
} as const

describe('create-time localization', () => {
    it('keeps interview, content, labels/routes, formatting and timezone independent when parsed', () => {
        // Given
        const configuration = input
        // When
        const result = parseCreateLocalization(configuration)
        // Then
        expect(result).toEqual(configuration)
        expect(resolveFormatContext(result, 'fr')).toEqual({ locale: 'de-AT', timeZone: 'Europe/Vienna' })
    })

    it('uses the existing route convention when passed to createI18n', () => {
        // Given
        const parsed = parseCreateLocalization(input)
        // When
        const links = createI18n({
            locales: parsed.contentLocales, defaultLocale: parsed.defaultContentLocale,
            localizedPaths: parsed.localizedPaths, baseUrl: 'https://example.test',
        }).getAlternateLinks('/kontakt/')
        // Then
        expect(links).toContainEqual({ hreflang: 'fr', href: 'https://example.test/fr/contact/' })
    })

    it('selects each regional format locale when per-language formatting is selected', () => {
        // Given
        const parsed = parseCreateLocalization({ ...input, formatLocales: { mode: 'per-language', locales: { de: 'de-AT', fr: 'fr-CA' } } })
        // When
        const context = resolveFormatContext(parsed, 'fr')
        // Then
        expect(context).toEqual({ locale: 'fr-CA', timeZone: 'Europe/Vienna' })
    })

    it.each([
        { contentLocales: [] }, { contentLocales: ['de', 'DE'] }, { defaultContentLocale: 'en' },
        { cliUiLocale: 'fr' }, { timeZone: undefined }, { currency: 'EUR' },
        { formatLocales: { mode: 'shared', locale: '' } },
        { formatLocales: { mode: 'per-language', locales: { de: 'de-DE' } } },
        { formatLocales: { mode: 'per-language', locales: { de: 'de-DE', fr: 'fr-FR', en: 'en-US' } } },
        { localizedLabels: { de: { contact: 'Kontakt' } } },
        { localizedLabels: { de: { contact: 'Kontakt' }, fr: { about: 'À propos' } } },
        { localizedPaths: [{ de: '/kontakt/' }] },
        { localizedPaths: [{ de: '//example.test', fr: '/fr/contact/' }] },
    ])('rejects inconsistent or inferred inputs when given %j', (override) => {
        // Given
        const invalid = { ...input, ...override }
        // When / Then
        expect(() => parseCreateLocalization(invalid)).toThrow()
    })

    it('rejects an unselected content language when resolving a shared format', () => {
        // Given
        const parsed = parseCreateLocalization(input)
        // When / Then
        expect(() => resolveFormatContext(parsed, 'en')).toThrow(UnselectedContentLocaleError)
    })
})

describe('locale and currency boundaries', () => {
    it.each(['fr', 'zh-Hant-TW', 'sr-Latn-RS', 'es-419', 'de-DE-u-co-phonebk', 'x-site', 'i-klingon'])('accepts arbitrary BCP47 content when given %s', (tag) => {
        // Given / When
        const result = contentLocaleSchema.safeParse(tag)
        // Then
        expect(result.success).toBe(true)
    })
    it.each(['', 'de_DE', 'en--US', 'en-a', 'en-u-ca-gregory-u-nu-latn', 'de-1901-1901', 'not a locale'])('rejects malformed content when given %s', (tag) => {
        // Given / When
        const result = contentLocaleSchema.safeParse(tag)
        // Then
        expect(result.success).toBe(false)
    })
    it.each(['', 'zz-ZZ', 'de_DE'])('rejects unsupported explicit formatting when given %s', (tag) => {
        // Given / When
        const result = formatLocaleSchema.safeParse(tag)
        // Then
        expect(result.success).toBe(false)
    })
    it.each(['', 'Mars/Olympus', '+01:00', 'Europe/Berlin '])('rejects non-IANA timezones when given %s', (zone) => {
        // Given / When
        const result = ianaTimeZoneSchema.safeParse(zone)
        // Then
        expect(result.success).toBe(false)
    })
    it.each(['UTC', 'Europe/Berlin', 'America/New_York', 'Asia/Kathmandu'])('accepts named zones when given %s', (zone) => {
        // Given / When
        const result = ianaTimeZoneSchema.safeParse(zone)
        // Then
        expect(result.success).toBe(true)
    })
    it.each(['EUR', 'USD', 'JPY', 'CHF'])('accepts an explicit ISO currency when given %s', (code) => {
        // Given / When
        const result = currencyCodeSchema.safeParse(code)
        // Then
        expect(result.success).toBe(true)
    })
    it.each(['', 'eur', 'EURO', 'ZZZ', 'XXX'])('rejects malformed or unsupported currencies when given %s', (code) => {
        // Given / When
        const result = currencyCodeSchema.safeParse(code)
        // Then
        expect(result.success).toBe(false)
    })
    it('does not infer currency when the optional primitive is absent', () => {
        // Given / When
        const result = optionalCurrencyCodeSchema.parse(undefined)
        // Then
        expect(result).toBeUndefined()
    })
    it.each([['de-AT', 'de'], ['fr-CA', 'en'], ['bad_tag', 'en'], [undefined, 'en']] as const)('falls back safely when auto-detected UI locale is %s', (detected, expected) => {
        // Given / When
        const result = resolveDetectedCliUiLocale(detected)
        // Then
        expect(result).toBe(expected)
        expect(Object.keys(localizationInterviewCatalogs[result])).toEqual(Object.keys(localizationInterviewCatalogs.en))
    })
    it('rejects unsupported UI input rather than applying detection fallback when explicit', () => {
        // Given / When
        const result = cliUiLocaleSchema.safeParse('fr')
        // Then
        expect(result.success).toBe(false)
    })
})
