# @itci/easy-web-theme-core

Design token package for the `easy-web` component family. Provides a typed `theme` object with `light` and `dark` palettes, plus a CSS custom properties stylesheet.

## Usage

```ts
import { theme } from '@itci/easy-web-theme-core'

// Access typed tokens
console.log(theme.light.bg)    // '#ffffff'
console.log(theme.dark.accent) // '#4da6ff'
```

Import the CSS tokens in your entry stylesheet:

```css
@import '@itci/easy-web-theme-core/styles/tokens.css';
```
