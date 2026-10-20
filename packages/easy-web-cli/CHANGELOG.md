# @easy-web/cli

## 0.2.1

### Patch Changes

- c730c4a: Correct generated dependency minima to match emitted runtime APIs: content sites
  require core 1.6.0 for trait schemas, and content-plus-CMS sites require core and
  CMS adapters 1.9.0 for the composition helper and coupled core APIs. Keep the
  shell-only range unchanged and require 1.6.0 for the standalone CMS media recipe's
  fieldsForTraits import, and declare the markdown processor needed by its Astro 7
  configuration. Adopt the corrected
  recipe owners in the CLI and cover generated sites with packed-CLI, published
  minimum-runtime consumer checks without weakening release-age policy.
- Updated dependencies [c730c4a]
  - @easy-web/core@1.9.1
  - @easy-web/cms-adapters@1.9.1
  - @easy-web/auth@1.9.1

## 0.2.0

### Minor Changes

- 3f659ac: Connect CMS-independent content composition to deterministic site generation. Generate typed collections, example content, contract adapters, list/detail routes, navigation and SEO for a single content locale, rejecting unsupported traits and bindings explicitly. Keep logical graph contributions separate from generated file paths.

  Generated shells include their own Astro typecheck configuration and shared SEO head, with robots output owned solely by the SEO integration. Extend first-party recipe compatibility to the CLI 0.2 line; application-auth mounting remains deferred.

  Add opt-in CMS editor generation from the same top-level composition, exposing only cms-admin-bound collections. Keep core as the sole schema and Astro-config owner while composing the existing AdminPage, markdown source-image handling and explicit media preview mappings. Reject missing bindings, duplicated composition and overlapping media roots before generation. Preserve the standalone CMS recipe API.

### Patch Changes

- Updated dependencies [3f659ac]
  - @easy-web/core@1.9.0
  - @easy-web/auth@1.9.0
  - @easy-web/cms-adapters@1.9.0

## 0.1.3

### Patch Changes

- Updated dependencies [fd16e96]
  - @easy-web/core@1.8.0
  - @easy-web/auth@1.8.0
  - @easy-web/cms-adapters@1.8.0

## 0.1.2

### Patch Changes

- Updated dependencies [9d6a2f2]
- Updated dependencies [9d6a2f2]
  - @easy-web/core@1.7.1
  - @easy-web/cms-adapters@1.7.1
  - @easy-web/auth@1.7.1

## 0.1.1

### Patch Changes

- Updated dependencies [b3929b2]
- Updated dependencies [7ffb156]
  - @easy-web/cms-adapters@1.7.0
  - @easy-web/core@1.7.0
  - @easy-web/auth@1.7.0

## 0.1.0

### Minor Changes

- 38a58ef: Implement config-driven site creation with additive package fragments, isolated Git staging, exact output validation and one commit. Reject unsupported shared Astro configuration before generation.

### Patch Changes

- Updated dependencies [91878a0]
  - @easy-web/core@1.6.0
  - @easy-web/auth@1.6.0
  - @easy-web/cms-adapters@1.6.0
