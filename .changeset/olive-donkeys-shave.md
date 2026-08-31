---
'@easy-web/swa': minor
'@easy-web/seo': minor
---

Derive the SWA trailingSlash redirect from Astro config

Azure Static Web Apps serves `/about` and `/about/` with `200` by default, so
both forms are reachable and only the canonical tag disambiguates them. Microsoft
recommends configuring an explicit `trailingSlash` strategy so one form `301`s to
the other; until now every instance had to remember to hand-edit
`staticwebapp.config.json` to get it, and nothing stopped that value from
contradicting the canonical URLs `@easy-web/seo` emits.

`easyWebNotFound()` now derives `trailingSlash` from the same Astro configuration
that drives canonical, hreflang and sitemap URLs, and manages it through the
existing sidecar so it stays upgrade-safe:

| Astro config | Emitted `trailingSlash` |
| :--- | :--- |
| `trailingSlash: 'always'` or `'never'` | used as-is — an explicit statement of intent outranks the output shape |
| `build.format: 'directory'` (Astro default) | `always` |
| `build.format: 'file'` | `never` |
| `build.format: 'preserve'` | left unmanaged, with a warning |

`preserve` mirrors the source tree, so some routes emit as files and others as
directories. No single redirect rule is correct for the whole site, so the key is
left alone rather than guessed.

A `trailingSlash` you set yourself in `staticwebapp.config.json` still wins, with
a warning, exactly as a user-defined `responseOverrides.404` already does. Remove
it to hand control back to the integration.

Also fixes `@easy-web/seo`'s resolution of the same value. It previously ignored
an explicit `trailingSlash: 'always'` whenever `build.format` was not `directory`,
and silently treated `preserve` as no-slash. Both packages now apply the same
precedence.

Behaviour change on upgrade: instances on Astro defaults will start emitting
`"trailingSlash": "always"`, so SWA begins `301`-ing `/about` to `/about/`. To
get the opposite form, set `trailingSlash: 'never'` in `astro.config.mjs` — one
line, and the canonical, hreflang, sitemap and redirect all follow it together.
