---
"@easy-web/content-blocks": patch
---

Make header `navId` stable so consuming builds are reproducible

All four header variants (`Header`, `HeaderCentered`, `HeaderFlyout`,
`HeaderHideOnScroll`) derived their nav element's DOM id from
`Math.random()`. The id is only used to pair the menu button's
`aria-controls` with the `<nav>`'s `id` — the component's own script
resolves both by class, scoped to the header element, so nothing reads
the id from JS. The randomness therefore bought nothing and made every
consuming site's build output differ byte-for-byte between two
consecutive runs, defeating build reproducibility checks and producing
noisy diffs in any pipeline that compares build artefacts.

Each variant now uses a stable default id (`ew-header-nav`,
`ew-header-centered-nav`, `ew-header-flyout-nav`, `ew-header-hos-nav`)
and accepts an optional `navId` prop to override it — needed only when
rendering more than one of the same header variant on a single page.
The per-variant prefixes mean different variants cannot collide even
when rendered together.

Verified against the in-repo showcase app: two consecutive builds
produced 12 of 12 HTML files byte-identical after the change, versus
12 of 12 differing before it.
