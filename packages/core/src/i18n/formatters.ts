const dateFormatCache = new Map<string, Intl.DateTimeFormat>()
const numberFormatCache = new Map<string, Intl.NumberFormat>()
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>()
const listFormatCache = new Map<string, Intl.ListFormat>()

function getDateFormat(locale: string, opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + ':' + JSON.stringify(opts)
  if (!dateFormatCache.has(key)) dateFormatCache.set(key, new Intl.DateTimeFormat(locale, opts))
  return dateFormatCache.get(key)!
}

function getNumberFormat(locale: string, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + ':' + JSON.stringify(opts)
  if (!numberFormatCache.has(key)) numberFormatCache.set(key, new Intl.NumberFormat(locale, opts))
  return numberFormatCache.get(key)!
}

function getRelativeTimeFormat(locale: string, opts?: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
  const key = locale + ':' + JSON.stringify(opts)
  if (!relativeTimeFormatCache.has(key)) relativeTimeFormatCache.set(key, new Intl.RelativeTimeFormat(locale, opts))
  return relativeTimeFormatCache.get(key)!
}

function getListFormat(locale: string, opts?: Intl.ListFormatOptions): Intl.ListFormat {
  const key = locale + ':' + JSON.stringify(opts)
  if (!listFormatCache.has(key)) listFormatCache.set(key, new Intl.ListFormat(locale, opts))
  return listFormatCache.get(key)!
}

export function formatDate(locale: string, date: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return getDateFormat(locale, opts).format(date)
}

export function formatNumber(locale: string, value: number, opts?: Intl.NumberFormatOptions): string {
  return getNumberFormat(locale, opts).format(value)
}

export function formatRelativeTime(
  locale: string,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  opts?: Intl.RelativeTimeFormatOptions,
): string {
  return getRelativeTimeFormat(locale, opts).format(value, unit)
}

export function formatList(locale: string, items: string[], opts?: Intl.ListFormatOptions): string {
  return getListFormat(locale, opts).format(items)
}

export function formatCurrency(
  locale: string,
  value: number,
  currency: string,
  opts?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>,
): string {
  return formatNumber(locale, value, { ...opts, style: 'currency', currency })
}
