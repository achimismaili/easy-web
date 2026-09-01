---
'@easy-web/seo': patch
---

Stop the built 404 documents from being indexable

Azure Static Web Apps returns the correct `404` status for a genuine miss, but
the 404 documents themselves are ordinary files, so requesting `/404` or
`/<locale>/404` directly answers `200`. That is a soft 404: a page whose content
says "not found" while its status says otherwise. Worse, it carried a
self-referencing canonical, actively asserting it was a canonical destination.

`<SeoHead>` now emits `noindex, nofollow` and omits the canonical when the route
is a 404. An explicit `noIndex` prop still applies as before, and every other
route is unchanged.

This is deliberately a metadata fix rather than a routing one. Forcing a real
`404` status would mean the integration writing SWA route rules, and ADR 0013
amendment A2 records why that surface is treated carefully: a previous version
generated a greedy per-locale route that shadowed an entire language of the site.
Exact-match status rules would not repeat that failure, but they interact with
`navigationFallback` in ways that need live verification, so they are tracked as
follow-up work rather than bundled here.
