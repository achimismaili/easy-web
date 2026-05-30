# @itci/easy-web-i18n

Bilingual (de/en) i18n utilities for IT-CI web projects. Provides locale detection and URL helpers for German/English sites built with Astro.

## Usage

```ts
import { localizedHref, getLocaleFromPath, defaultLocale, type SupportedLocale } from '@itci/easy-web-i18n'

const locale: SupportedLocale = getLocaleFromPath('/en/about') // 'en'
const href = localizedHref('/about', 'en')                     // '/en/about'
const deHref = localizedHref('/about', 'de')                   // '/about'
console.log(defaultLocale)                                      // 'de'
```
