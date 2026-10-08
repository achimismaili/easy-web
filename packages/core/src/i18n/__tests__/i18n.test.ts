import { describe, expect, it } from 'vitest'
import { createI18n, getLocaleFromPath, localizedHref } from '../index.js'

const i18n = createI18n({
  locales: ['de', 'en'] as const,
  defaultLocale: 'de',
  baseUrl: 'https://x.dev',
})

describe('i18n integration', () => {
  it('localizedHref returns path unchanged for de', () => {
    expect(localizedHref({ path: '/', locale: 'de', defaultLocale: 'de' })).toBe('/')
    expect(i18n.localizedHref('/', 'de')).toBe('/')
  })
  it('localizedHref prefixes /en for en', () => {
    expect(localizedHref({ path: '/', locale: 'en', defaultLocale: 'de' })).toBe('/en')
    expect(i18n.localizedHref('/', 'en')).toBe('/en')
  })
  it('getLocaleFromPath returns en for /en paths', () => {
    expect(getLocaleFromPath({ pathname: '/en', locales: i18n.locales, defaultLocale: i18n.defaultLocale })).toBe('en')
    expect(i18n.getLocaleFromPath('/en/about')).toBe('en')
  })
  it('getLocaleFromPath returns de for root and other paths', () => {
    expect(getLocaleFromPath({ pathname: '/', locales: i18n.locales, defaultLocale: i18n.defaultLocale })).toBe('de')
    expect(i18n.getLocaleFromPath('/about')).toBe('de')
  })
  it('factory return narrows locales', () => {
    type Locale = (typeof i18n.locales)[number]
    const locale: Locale = i18n.getLocaleFromPath('/en/about')

    expect(locale).toBe('en')
    expect(i18n.defaultLocale).toBe('de')
  })
  it('getAlternateLinks produces correct hreflangs', () => {
    const links = i18n.getAlternateLinks('/test')
    const hreflangs = links.map(l => l.hreflang)
    expect(hreflangs).toContain('de')
    expect(hreflangs).toContain('en')
    expect(hreflangs).toContain('x-default')
  })
})
