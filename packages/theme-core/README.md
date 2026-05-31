# @itci/easy-web-theme-core

Design system foundation for the easy-web ecosystem. This package provides semantic design tokens, color ramps, typography, and spacing constants as CSS custom properties and typed TypeScript objects.

## Installation

```bash
pnpm add @itci/easy-web-theme-core
```

**Note:** This package is hosted on Azure Artifacts. Ensure your `.npmrc` is configured to point to the `websites` feed.

## Setup

### 1. Import CSS
Import the design tokens in your main entry file (e.g., `main.ts` or `app.tsx`).

```typescript
import '@itci/easy-web-theme-core/tokens.css';
```

### 2. Prevent Theme Flash (Optional)
To avoid a white flash during page load when using dark mode, inject the `noFlashScript` in your HTML `<head>` before the stylesheet.

```typescript
import { noFlashScript } from '@itci/easy-web-theme-core';

// In your root component or HTML template:
// <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
```

**CSP Note:** This script requires `'unsafe-inline'` or a hash-based Content Security Policy.

## Usage

### CSS Variables
Use semantic variables in your CSS files.

```css
.card {
  background: var(--ew-surface);
  color: var(--ew-on-surface);
  border: 1px solid var(--ew-border);
  border-radius: var(--ew-radius-md);
  padding: var(--ew-space-4);
}
```

### TypeScript Tokens
Use the typed `tokens` object for CSS-in-JS or dynamic styles.

```typescript
import { tokens } from '@itci/easy-web-theme-core';

const styles = {
  backgroundColor: tokens.color.surface,
  color: tokens.color.onSurface,
  fontSize: tokens.text.base,
};
```

## Theme Management

The system supports light and dark modes via the `data-theme` attribute on the `<html>` element. System preference is automatically detected via media query.

### JavaScript API

```typescript
import { applyTheme, getPreferredTheme } from '@itci/easy-web-theme-core';

// Set theme manually (persists to localStorage)
applyTheme('dark');

// Reset to system preference
applyTheme('system');

// Get current setting
const current = getPreferredTheme();
```

### Manual Trigger
You can also toggle the theme manually by setting the attribute.

```html
<html data-theme="dark">
```

## Token Reference

### Semantic Colors
| Token | CSS Variable | Description |
|---|---|---|
| `color.surface` | `--ew-surface` | Main background color |
| `color.onSurface` | `--ew-on-surface` | Text color on surface |
| `color.surfaceMuted` | `--ew-surface-muted` | Subtle background for containers |
| `color.primary` | `--ew-primary` | Brand primary color |
| `color.onPrimary` | `--ew-on-primary` | Text color on primary |
| `color.border` | `--ew-border` | Default border color |
| `color.muted` | `--ew-muted` | De-emphasized text |
| `color.danger` | `--ew-danger` | Error/danger state |

### Other Systems
- **Neutral Ramp:** `color.neutral[50-950]` / `--ew-neutral-[50-950]`
- **Primary Ramp:** `color.primaryRamp[50-950]` / `--ew-primary-[50-950]`
- **Typography:** `font.sans`, `font.mono`, `text.xs` to `text.3xl`
- **Spacing:** `space[0-12]` / `--ew-space-[0-12]`
- **Radius:** `radius.none`, `radius.sm`, `radius.md`, `radius.lg`, `radius.xl`, `radius.full`

## Migration from v0.1

| Old Key (v0.1) | New Token (v0.3) | New CSS Variable |
|---|---|---|
| `theme.light.bg` | `tokens.color.surface` | `var(--ew-surface)` |
| `theme.light.fg` | `tokens.color.onSurface` | `var(--ew-on-surface)` |
| `theme.light.accent` | `tokens.color.primary` | `var(--ew-primary)` |
