---
"@achimismaili/easy-web-content-blocks": patch
---

Align `ThemeToggle` and `LanguageSwitch` to a shared header-control height (2.25rem / 36px) so the two utility controls form a consistent row inside the header actions area.

- `ThemeToggle` becomes an explicit 36×36 square icon button (removes padding, adds `width`/`height`, sets `box-sizing: border-box`).
- `LanguageSwitch` gains an explicit height of 36px, keeps `min-width: 2.5rem`, and switches to horizontal-only padding — vertical size is now driven by `height`, so its aspect ratio reads as "nearly square" next to the toggle instead of landscape.
- Both use `box-sizing: border-box` for predictable sizing regardless of any downstream site's global reset.
- No visual behaviour, no API change, no class-name change — this is a self-contained CSS-only refinement.
