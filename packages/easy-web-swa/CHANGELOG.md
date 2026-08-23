# @achimismaili/easy-web-swa

## 0.2.0

### Minor Changes

- **BREAKING — sentinel moved off the config root into a sidecar file.** `0.1.0` wrote its bookkeeping into a `$easyWebManaged` key at the root of `staticwebapp.config.json`. The official SWA schema declares `additionalProperties: false` at the root and whitelists only 11 keys, so the SWA CLI (and, conservatively, the Azure runtime) rejects the file with `NoAdditionalPropertiesError` and **discards the entire config** — silently dropping `auth`, `globalHeaders`, `navigationFallback` and every route. `0.2.0` emits a `staticwebapp.config.json` containing **only schema-legal root keys** and writes `{ keys, version, docs }` to a sibling `staticwebapp.config.json.easy-web-managed.json` instead.

  _Migration:_ no source change is required. Rebuild with `0.2.0` and the legacy root sentinel is stripped automatically; a pre-existing `responseOverrides.404` that the old sentinel had claimed is left **unclaimed** (user-owned) rather than silently re-adopted. Deploy pipelines that copy `dist/` wholesale already pick up the new sidecar — no pipeline change needed.

- **BREAKING — dropped the per-locale greedy rewrite routes in favour of a `responseOverrides.404`-centric model.** `0.1.0` appended a `/{locale}/* → rewrite /{locale}/404/index.html` route per non-default locale. Azure evaluates routes first-match-wins, so such a rule shadows every real page in that locale whenever it lands ahead of the instance's own routes — it 404'd an entire English site in production adoption. `0.2.0` emits **no routes at all**; the single global `responseOverrides.404` is now the only primitive the integration manages, and `routeIndices` was removed from the sentinel because there is no route ownership left to track.

  _Known limitation (accepted):_ Azure SWA supports exactly **one** global 404 override, so unmatched localized paths serve the **default-locale** 404 body. Per-locale 404 *content* is explicitly out of scope — see the README and [ADR 0013](https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md).

### Patch Changes

- **Fixed: consecutive builds clobbered a user-owned `responseOverrides.404`.** The replace path rewrote the 404 override unconditionally, so an override preserved on build _N_ was overwritten on build _N+1_. `replaceManaged()` now honours the sidecar's declared `keys` and refreshes `responseOverrides.404` **only** when the previous sidecar actually claimed it; an absent sidecar or an empty `keys` list makes an existing 404 user-owned. `createFresh()` likewise claims ownership only of keys it really emits.
- **Hardened config reads.** Both the config and the sidecar are parsed through a validating reader that reports the **failing path** in the error message; the unchecked `as SwaConfig` / `as string` casts are gone (the only remaining `as` in `src/index.ts` is an `as const` on a local literal). Malformed JSON, a missing or invalid sidecar, and stale `routes[n]` ownership claims are all covered by regression tests.
- **Dropped the unused `@achimismaili/easy-web-i18n` peer dependency.** The integration never imported it (verified by grep of `src/`); it is removed from both `peerDependencies` and `devDependencies`. `astro` remains the only peer dependency.
- **Rewrote the README.** Removed the stale "0.1.0 is a package skeleton / safe no-op" claim and documented the real behaviour: the sidecar sentinel, the `responseOverrides.404`-centric emission model, the preservation contract, and the single-global-404 limitation.

## 0.1.0

### Minor Changes

- 17632de: Initial release: easyWebNotFound() AstroIntegration.

  Introduces the `@achimismaili/easy-web-swa` package as a `0.1.0` skeleton reserving the module identity and export shape. Exports a default `easyWebNotFound()` factory returning an `AstroIntegration` — currently a no-op that logs its intent. The `staticwebapp.config.json` sentinel-slice merge logic lands in a follow-up release; consumer instances can already wire the integration into `astro.config.mjs` today without needing to update their imports on the next release.
