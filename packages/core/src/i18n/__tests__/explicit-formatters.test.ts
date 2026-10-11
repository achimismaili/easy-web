import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    createExplicitFormatters, currencyCodeSchema, dateOnlySchema,
    formatLocaleSchema, ianaTimeZoneSchema,
} from '../index.js'

const context = {
    locale: formatLocaleSchema.parse('en-GB'),
    timeZone: ianaTimeZoneSchema.parse('America/Los_Angeles'),
}
const currency = currencyCodeSchema.parse('EUR')
const date = dateOnlySchema.parse('2024-03-10')
const instant = Date.UTC(2024, 2, 10, 7, 30)

afterEach(() => vi.unstubAllEnvs())

describe('explicit formatters', () => {
    it('produces identical dates, instants, numbers and money when the host timezone changes', () => {
        // Given
        const outputs = (host: string) => {
            vi.stubEnv('TZ', host)
            const format = createExplicitFormatters(context)
            return [format.dateOnly(date), format.instant(instant), format.number(1234.5), format.currency(12.5, currency)]
        }
        // When
        const utc = outputs('UTC')
        const newYork = outputs('America/New_York')
        // Then
        expect(newYork).toEqual(utc)
        expect(utc).toEqual(['10 Mar 2024', '9 Mar 2024, 23:30', '1,234.5', '€12.50'])
    })

    it('preserves the civil date when the explicit timezone crosses midnight', () => {
        // Given
        const format = createExplicitFormatters(context)
        // When
        const result = format.dateOnly(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
        // Then
        expect(result).toBe('10/03/2024')
    })

    it('uses the explicit timezone including daylight saving when formatting an instant', () => {
        // Given
        const format = createExplicitFormatters(context)
        // When
        const result = format.instant(Date.UTC(2024, 2, 10, 10, 30))
        // Then
        expect(result).toBe('10 Mar 2024, 03:30')
    })

    it('honors a format locale different from content language when formatting numbers', () => {
        // Given
        const format = createExplicitFormatters({ ...context, locale: formatLocaleSchema.parse('de-AT') })
        // When
        const result = format.number(1234.5)
        // Then
        expect(result).toBe('1\u00a0234,5')
    })

    it('honors the supplied currency rather than locale currency when formatting money', () => {
        // Given
        const format = createExplicitFormatters(context)
        // When
        const result = format.currency(12.5, currencyCodeSchema.parse('JPY'), { currencyDisplay: 'code' })
        // Then
        expect(result).toMatch(/^JPY\s13$/)
    })

    it.each(['2023-02-29', '2024-02-30', '2024-13-01', '03/10/2024', '2024-03-10T00:00:00'])('rejects invalid civil dates when given %s', (value) => {
        // Given / When
        const result = dateOnlySchema.safeParse(value)
        // Then
        expect(result.success).toBe(false)
    })

    it('accepts a real leap date when parsing a civil date', () => {
        // Given / When
        const result = dateOnlySchema.parse('2024-02-29')
        // Then
        expect(result).toBe('2024-02-29')
    })
})
