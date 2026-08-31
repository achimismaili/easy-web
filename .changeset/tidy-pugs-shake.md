---
'@easy-web/i18n': patch
'@easy-web/content-blocks': patch
---

Point language-switch links at the served URL form

`LanguageSwitch` derived the alternate href with its own hardcoded rule and
ignored `trailingSlash` entirely, so on a site configured `trailingSlash: 'never'`
every language switch pointed at `/en/` while the site serves `/en`. In
production Azure SWA redirects that, costing a `301` on every switch; under
`astro preview` it is a plain `404`.

The component now renders the href in the form the site actually serves, which
also normalises any `alternateHref` a page passes in — so pages declaring
`alternateHref="/en/privacy/"` no longer need editing.

`ambientTrailingSlash()` is exported from `@easy-web/i18n` for this: components
run outside the Astro integration and cannot read `astro.config.mjs`, so they
read the form `@easy-web/seo` resolved at config time. `createI18n` now uses the
same helper instead of its own copy.
