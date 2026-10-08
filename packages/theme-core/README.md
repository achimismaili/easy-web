# @easy-web/theme-core (deprecated)

This package is a compatibility layer. The theme helpers, tokens and stylesheets now live in [`@easy-web/core`](../core/README.md). Every export keeps working and re-exports the core implementation unchanged, but new code should import from `@easy-web/core`.

| Old import | New import |
| :--- | :--- |
| `import { applyTheme, getPreferredTheme, subscribeToSystem, noFlashScript } from '@easy-web/theme-core'` | `import { ... } from '@easy-web/core/theme'` |
| `import { tokens, breakpoints, type Theme, type Tokens, type Breakpoint } from '@easy-web/theme-core'` | `import { ... } from '@easy-web/core/theme'` |
| `import '@easy-web/theme-core/tokens.css'` | `import '@easy-web/core/styles/tokens.css'` |
| `import '@easy-web/theme-core/fonts.css'` | `import '@easy-web/core/styles/fonts.css'` |

The two stylesheets in this package contain a single `@import` of the core stylesheet, so the CSS a site ships is identical.
