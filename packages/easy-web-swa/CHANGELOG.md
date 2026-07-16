# @achimismaili/easy-web-swa

## 0.1.0

### Minor Changes

- 17632de: Initial release: easyWebNotFound() AstroIntegration.

  Introduces the `@achimismaili/easy-web-swa` package as a `0.1.0` skeleton reserving the module identity and export shape. Exports a default `easyWebNotFound()` factory returning an `AstroIntegration` — currently a no-op that logs its intent. The `staticwebapp.config.json` sentinel-slice merge logic lands in a follow-up release; consumer instances can already wire the integration into `astro.config.mjs` today without needing to update their imports on the next release.
