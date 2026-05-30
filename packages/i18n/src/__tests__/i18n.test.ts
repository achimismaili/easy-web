import { describe, it, expect } from 'vitest'
import { localizedHref, getLocaleFromPath, defaultLocale } from '../index.js'

describe('i18n', () => {
  it('localizedHref returns path unchanged for de', () => {
    expect(localizedHref('/', 'de')).toBe('/')
  })
  it('localizedHref prefixes /en for en', () => {
    expect(localizedHref('/', 'en')).toBe('/en')
  })
  it('getLocaleFromPath returns en for /en paths', () => {
    expect(getLocaleFromPath('/en')).toBe('en')
    expect(getLocaleFromPath('/en/about')).toBe('en')
  })
  it('getLocaleFromPath returns de for root and other paths', () => {
    expect(getLocaleFromPath('/')).toBe('de')
    expect(getLocaleFromPath('/about')).toBe('de')
  })
  it('defaultLocale is de', () => {
    expect(defaultLocale).toBe('de')
  })
})
