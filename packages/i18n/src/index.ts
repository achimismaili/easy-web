export type SupportedLocale = 'de' | 'en'

export const defaultLocale: SupportedLocale = 'de'

export function localizedHref(path: string, locale: SupportedLocale): string {
  if (locale === 'de') return path
  return '/en' + (path === '/' ? '' : path)
}

export function getLocaleFromPath(pathname: string): SupportedLocale {
  return pathname.startsWith('/en') ? 'en' : 'de'
}
