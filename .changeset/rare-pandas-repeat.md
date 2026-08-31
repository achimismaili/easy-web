---
'@easy-web/i18n': patch
'@easy-web/seo': patch
---

Keep hreflang and sitemap URLs in the form the site actually serves

Two gaps in 1.2.0 let the URL form diverge again, both found by comparing the
built output of a real instance rather than by unit test.

**`createI18n` ignored the resolved URL form.** It is called from instance code,
not from an Astro integration, so it cannot read `astro.config.mjs` and defaulted
to trailing slashes. On a site configured with `trailingSlash: 'never'` the
canonical correctly dropped the slash while every hreflang alternate kept it —
including the self-referencing one, which invalidates the whole cluster. It now
inherits the form `@easy-web/seo` resolved, and an explicit `trailingSlash`
passed to `createI18n` still wins.

**Sitemap entries were not re-rendered into the served form.** `<loc>` and the
`xhtml:link` alternates came straight from `@astrojs/sitemap`, so they could
differ from the canonical the same build emitted. Both are now rendered through
the same helper that produces the canonical.

One cosmetic difference remains and is intentional: the underlying `sitemap`
library writes the site root as a bare origin (`https://example.com`) while the
canonical writes `https://example.com/`. Those are the same URL — an empty path
normalises to `/` before the request is sent — so no crawler sees two URLs, and
post-processing the emitted XML to force agreement is not worth the fragility.
