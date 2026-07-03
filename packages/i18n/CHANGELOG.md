# @achimismaili/easy-web-i18n

## 0.4.0

### Minor Changes

- 9298ec9: Tighten Astro peer-dependency range to `>=6.0.0 <8.0.0` (was `>=4.0.0 <7.0.0`).
  - **Drops declarative-only support for Astro 4 and 5.** These majors are effectively unmaintained (4.x last patch Aug 2025, 5.x last patch May 2026) and the package's own devDependency has been `astro: ^6.0.0` for a while, so 4.x/5.x compatibility was untested. Package source contains zero direct Astro imports, so real-world impact is limited to peer-warning noise.
  - **Adds support for Astro 7.** Enables consumers to upgrade to Astro 7 without a peer-dependency conflict.
  - Brings this package in line with the rest of the easy-web ecosystem (`easy-web-content-blocks`, `easy-web-cms-adapters` already at `>=6.0.0`).
