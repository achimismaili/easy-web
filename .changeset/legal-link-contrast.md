---
"@easy-web/theme-core": patch
"@easy-web/content-blocks": patch
---

Fix unreadable links on legal pages in dark mode

`LegalLayout` styled every element except `a`, so links on `/impressum` and
`/datenschutz`-style pages fell back to the browser default
`rgb(0, 0, 238)`. Against a dark surface (`#111827`) that is a 1.89:1
contrast ratio — under half of the WCAG AA minimum (4.5:1) for normal text.

- `theme-core`: add `--ew-link` (defaults to `var(--ew-primary)`) and a
  regression test that computes WCAG contrast for the default theme's link
  and body-text colors in both light and dark, so a future edit to either
  token that drops below AA fails CI instead of shipping silently.
- `content-blocks`: `LegalLayout` now styles `a` the same way `Prose` already
  does; `Prose` itself switches from hardcoding `--ew-primary` to
  `--ew-link` so both components share one token.

`--ew-link` defaults to an alias of `--ew-primary` rather than a fixed shade
of a color ramp, because a fixed step (e.g. `-700`) cannot be guaranteed to
pass AA against an arbitrary instance surface, and most instances only
override the single `--ew-primary` token rather than the full ramp. Instances
whose brand primary fails AA on their surface (as Harley's light-mode orange
does, at 3.38:1) should override `--ew-link` directly with a compliant shade,
the way `harleyrentflorida.de` now does with its existing `--ew-primary-dark`.
