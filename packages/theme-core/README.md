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
- **Shadows:** `shadow.xs` to `shadow.2xl` + `shadow.inner` / `--ew-shadow-*`
- **Motion durations:** `motion.duration.instant` to `motion.duration.slower` / `--ew-duration-*`
- **Motion easings:** `motion.ease.default`, `.in`, `.out`, `.inOut`, `.spring` / `--ew-ease-*`
- **Z-index:** `zIndex.hide` to `zIndex.toast` (−1 to 1500) / `--ew-z-*`
- **Breakpoints:** `breakpoints.sm` to `breakpoints['2xl']` (raw px numbers) / `--ew-bp-*`

### Shadow Scale
| Token | CSS Variable | Description |
|---|---|---|
| `shadow.xs` | `--ew-shadow-xs` | Very subtle elevation |
| `shadow.sm` | `--ew-shadow-sm` | Light card shadow |
| `shadow.md` | `--ew-shadow-md` | Standard elevation |
| `shadow.lg` | `--ew-shadow-lg` | Pronounced elevation |
| `shadow.xl` | `--ew-shadow-xl` | High elevation |
| `shadow.2xl` | `--ew-shadow-2xl` | Maximum elevation |
| `shadow.inner` | `--ew-shadow-inner` | Inset shadow |

Shadows automatically increase opacity in dark mode via the `--ew-shadow-color` primitive.

```css
.card { box-shadow: var(--ew-shadow-md); }
```

### Motion Tokens
#### Durations
| Token | CSS Variable | Value |
|---|---|---|
| `motion.duration.instant` | `--ew-duration-instant` | 0ms |
| `motion.duration.fast` | `--ew-duration-fast` | 100ms |
| `motion.duration.normal` | `--ew-duration-normal` | 200ms |
| `motion.duration.moderate` | `--ew-duration-moderate` | 300ms |
| `motion.duration.slow` | `--ew-duration-slow` | 500ms |
| `motion.duration.slower` | `--ew-duration-slower` | 700ms |

All durations automatically reset to `0ms` under `prefers-reduced-motion: reduce`.

#### Easings
| Token | CSS Variable | Usage |
|---|---|---|
| `motion.ease.default` | `--ew-ease-default` | General purpose |
| `motion.ease.in` | `--ew-ease-in` | Accelerating |
| `motion.ease.out` | `--ew-ease-out` | Decelerating |
| `motion.ease.inOut` | `--ew-ease-in-out` | Smooth both ways |
| `motion.ease.spring` | `--ew-ease-spring` | Playful overshoot |

```css
.menu { transition: transform var(--ew-duration-normal) var(--ew-ease-out); }
```

### Breakpoints
Breakpoints are raw pixel numbers — CSS variables **cannot** be used inside `@media` queries.

```typescript
import { breakpoints } from '@itci/easy-web-theme-core';
const isMobile = window.matchMedia(`(max-width: ${breakpoints.md}px)`).matches;
```

| Export | Value | Tailwind |
|---|---|---|
| `breakpoints.sm` | 640 | `sm` |
| `breakpoints.md` | 768 | `md` |
| `breakpoints.lg` | 1024 | `lg` |
| `breakpoints.xl` | 1280 | `xl` |
| `breakpoints['2xl']` | 1536 | `2xl` |

CSS reference variables also available: `--ew-bp-sm`, `--ew-bp-md`, `--ew-bp-lg`, `--ew-bp-xl`, `--ew-bp-2xl`.

### Z-Index Scale
| Token | CSS Variable | Value | Use case |
|---|---|---|---|
| `zIndex.hide` | `--ew-z-hide` | -1 | Hidden elements |
| `zIndex.base` | `--ew-z-base` | 0 | Default flow |
| `zIndex.raised` | `--ew-z-raised` | 1 | Slightly elevated |
| `zIndex.dropdown` | `--ew-z-dropdown` | 1000 | Dropdowns |
| `zIndex.sticky` | `--ew-z-sticky` | 1100 | Sticky headers |
| `zIndex.overlay` | `--ew-z-overlay` | 1200 | Background overlays |
| `zIndex.modal` | `--ew-z-modal` | 1300 | Modal dialogs |
| `zIndex.popover` | `--ew-z-popover` | 1400 | Floating tooltips |
| `zIndex.toast` | `--ew-z-toast` | 1500 | Toast notifications |

```css
.header { position: sticky; z-index: var(--ew-z-sticky); }
.modal  { z-index: var(--ew-z-modal); }
```

### Self-Hosted Fonts (Opt-in)
Import `fonts.css` to activate Inter Variable + JetBrains Mono Variable. Sites that do not import it continue to use the system font stack at zero cost.

**Step 1: Import the stylesheet** (after `tokens.css`)
```typescript
import '@itci/easy-web-theme-core/tokens.css';
import '@itci/easy-web-theme-core/fonts.css';
```

**Step 2: Add font files** to `public/fonts/`:
- `Inter-Variable.woff2` — [rsms/inter releases](https://github.com/rsms/inter/releases)
- `JetBrainsMono-Variable.woff2` — [JetBrains/JetBrainsMono releases](https://github.com/JetBrains/JetBrainsMono/releases)

**Step 3: Recommended — add preload hints in `<head>`**
```html
<link rel="preload" as="font" href="/fonts/Inter-Variable.woff2" type="font/woff2" crossorigin>
<link rel="preload" as="font" href="/fonts/JetBrainsMono-Variable.woff2" type="font/woff2" crossorigin>
```

## Migration from v0.1

| Old Key (v0.1) | New Token (v0.3) | New CSS Variable |
|---|---|---|
| `theme.light.bg` | `tokens.color.surface` | `var(--ew-surface)` |
| `theme.light.fg` | `tokens.color.onSurface` | `var(--ew-on-surface)` |
| `theme.light.accent` | `tokens.color.primary` | `var(--ew-primary)` |
