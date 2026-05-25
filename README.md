# easy-web

Baseline `@ismaili/easy-web-*` package family. This repository will host the reusable component library, layouts, i18n primitives, and theme tokens shared across all `ismaili.de` web instances.

This is a **scaffold-only** state. No framework, packages, or code yet — those land via a future plan.

For full architecture, role boundaries, and how this repo relates to instance repos like `dev.ismaili.de`, see [`WebSites/docs/repos/easy-web.md`](https://dev.azure.com/IT-CI/WebSites/_git/WebSites?path=/docs/repos/easy-web.md).

## Structure

| Path | Purpose |
| :--- | :--- |
| `packages/` | Future `@ismaili/easy-web-*` workspace packages |
| `examples/` | Reference instances consuming the packages |
| `scripts/` | Workspace-level tooling |
| `docs/` | Repo-local notes; canonical docs live in `WebSites/docs/` |

## Related

- **Index repo**: [`WebSites`](https://dev.azure.com/IT-CI/WebSites/_git/WebSites) — architecture, ADRs, topology
- **First instance**: [`dev.ismaili.de`](https://dev.azure.com/IT-CI/WebSites/_git/dev.ismaili.de) — pilot deployment of this baseline
