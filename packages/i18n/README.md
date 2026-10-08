# @easy-web/i18n (deprecated)

This package is a compatibility layer. The localization helpers now live in [`@easy-web/core`](../core/README.md). Every export keeps working and re-exports the core implementation unchanged, but new code should import from `@easy-web/core/i18n`.

| Old import | New import |
| :--- | :--- |
| `import { createI18n, type I18nConfig } from '@easy-web/i18n'` | `import { createI18n, type I18nConfig } from '@easy-web/core/i18n'` |
| `import { formatDate, formatNumber, formatRelativeTime, formatList, formatCurrency } from '@easy-web/i18n'` | `import { ... } from '@easy-web/core/i18n'` |
| `import { localizedHref, getLocaleFromPath, getAlternateLinks, getCanonicalUrl } from '@easy-web/i18n'` | `import { ... } from '@easy-web/core/i18n'` |
| `import { toServedPath, ambientTrailingSlash, normalizeLocalizedPath, findLocalizedGroup, validateLocalizedPaths, stripQueryAndHash } from '@easy-web/i18n'` | `import { ... } from '@easy-web/core/i18n'` |
| `import type { LocalizedPathGroup, TrailingSlash, AlternateLink } from '@easy-web/i18n'` | `import type { ... } from '@easy-web/core/i18n'` |
