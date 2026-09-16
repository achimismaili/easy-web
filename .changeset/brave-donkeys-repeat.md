---
"@easy-web/content-blocks": minor
"@easy-web/seo": patch
---

Ship a `<PageShell>` landmark scaffold, make the crawl policy reach the page, and let single-locale sites drop the language switch

**`<PageShell>` (new, content-blocks)** — a layout that renders
`<Header /> <slot /> <Footer />` produces a document with no `<main>`
landmark and no way to bypass the navigation, failing WCAG 2.1 SC 2.4.1
"Bypass Blocks" (Level A) on every route whose content does not open with
a heading. axe-core reports this via its `bypass` rule, which carries
`reviewOnFail` — so it surfaces as *incomplete*, not a violation, and a
gate asserting `violations.length === 0` stays green while the failure
ships. `PageShell` owns the skip link, the `<main>` landmark, and the DOM
order between them, because the skip link must precede the header to be
the first focusable element — which a caller cannot arrange if it renders
the header itself.

**Crawl policy now reaches the document (seo)** — `easyWebSeo()` resolves
the policy once and publishes it to `EASY_WEB_SEO_NO_INDEX`, which
`robots.txt` generation consumed but `<SeoHead>` did not: its `noIndex`
prop defaulted to `false`. The result was an integration and a document
disagreeing about the same policy — sitemap suppressed and robots.txt
disallowing everything, while every page still shipped without a robots
meta tag. `<SeoHead>` now defaults the prop from the published policy.
An explicit prop still wins, so a single page can opt out of a site-wide
setting, and 404 routes remain unconditionally noindexed.

**Optional `locales` prop on all four header variants (content-blocks)** —
the language switch rendered unconditionally, so a single-locale site
shipped a control that navigates to a route it does not build. Pass the
locales the site actually serves and the switch is omitted when there is
only one. Omitting the prop keeps the previous behaviour, so existing
consumers are unaffected.
