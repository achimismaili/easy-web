import { z } from 'astro/zod'
import type { CurrencyCode, FormatLocale, IanaTimeZone } from './locale-inputs.js'

export type ExplicitFormatContext = {
    readonly locale: FormatLocale
    readonly timeZone: IanaTimeZone
}

/** A civil date is not an instant: never shift it across dates in the site's timezone. */
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Invalid Gregorian date').brand<'DateOnly'>()
export type DateOnly = z.infer<typeof dateOnlySchema>

export type DateOnlyFormatOptions = Pick<Intl.DateTimeFormatOptions,
    'dateStyle' | 'year' | 'month' | 'day' | 'weekday' | 'era' | 'calendar' | 'numberingSystem'>
export type InstantFormatOptions = Omit<Intl.DateTimeFormatOptions, 'timeZone'>
export type DecimalFormatOptions = Omit<Intl.NumberFormatOptions, 'style' | 'currency' | 'unit'>
export type CurrencyFormatOptions = Omit<Intl.NumberFormatOptions, 'style' | 'currency'>

export function createExplicitFormatters(context: ExplicitFormatContext) {
    return {
        dateOnly: (value: DateOnly, options: DateOnlyFormatOptions = { dateStyle: 'medium' }): string =>
            new Intl.DateTimeFormat(context.locale, { ...options, timeZone: 'UTC' })
                .format(new Date(`${value}T00:00:00.000Z`)),
        // Date/epoch inputs represent absolute instants; local datetime strings are intentionally excluded.
        instant: (value: Date | number, options: InstantFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string =>
            new Intl.DateTimeFormat(context.locale, { ...options, timeZone: context.timeZone }).format(value),
        number: (value: number, options: DecimalFormatOptions = {}): string =>
            new Intl.NumberFormat(context.locale, { ...options, style: 'decimal' }).format(value),
        // Currency is always a required argument, never guessed from locale or timezone.
        currency: (value: number, currency: CurrencyCode, options: CurrencyFormatOptions = {}): string =>
            new Intl.NumberFormat(context.locale, { ...options, style: 'currency', currency }).format(value),
    }
}
