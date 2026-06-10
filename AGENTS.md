# AGENTS.md — easy-web

> **For AI agents working in this repo.**
> Baseline `@itci/easy-web-*` package monorepo. Publishes the shared library every site instance consumes.

## Project identity

- **Purpose**: Shared package family for the ismaili.de web ecosystem — theme tokens, i18n primitives, content blocks, CMS adapters, MSAL auth components, and the scaffold CLI for new instances.
- **Type**: pnpm + Turborepo monorepo. Node 22.12.0 via Volta, pnpm 9.15.4.
- **Publishes to**: `websites` Azure Artifacts feed (project-scoped, `IT-CI/WebSites`). Packages namespaced `@itci/easy-web-*`.
- **Consumed by**: every instance repo (`dev.ismaili.de`, `harleyrentflorida.de`, future sites).

## Ecosystem context

This repo is **one of several siblings** in the ismaili.de web ecosystem. All repos live under `E:\code\it-ci\` in this workspace:

| Repo | Role |
| :--- | :--- |
| `websites/` | Meta-repo with architecture docs, ADRs, pipeline templates — **canonical source of truth** for ecosystem decisions. See its `AGENTS.md` for the full ecosystem map. |
| `easy-web/` | **This repo.** Baseline package monorepo. Changes here propagate to every instance via npm dependency bump. |
| `dev.ismaili.de/` | Pilot instance — first real consumer. New `easy-web` features land here first for validation before customer rollout. |
| `harleyrentflorida.de/` | Customer instance — Harley-Davidson rental site, deployed to a decoupled customer Azure tenant. |
| `WebSites-archive/` | Read-only legacy archive. Do not modify. |

**Why this repo matters**: per the ecosystem's Core Value Proposition (see [`websites/AGENTS.md`](../websites/AGENTS.md)), a fix or feature added here benefits **every instance simultaneously**. A copy-pasted fix in one instance helps no one else. This makes `easy-web` the highest-leverage repo in the ecosystem.

## Critical implementation constraints (read before touching auth components)

> **All auth-dependent React components on a given page must live inside a single React island (`<AuthProvider client:only="react" config={...}>` or a per-instance `<AuthShell>` wrapper). React Context does not cross Astro island boundaries.**

This constraint lives inside this repo's own `packages/auth/src/components/AuthProvider.tsx` source as a docstring, and is codified ecosystem-wide in [ADR 0010 — React Auth Components Within a Single Astro Island](../websites/docs/decisions/0010-react-auth-single-island.md). Two sibling `client:*` directives = two independent React roots = two `MsalProvider` instances = two `PublicClientApplication` instances = corrupted `sessionStorage` token cache.

When changing anything in `packages/auth/`:
- **Preserve the `useRef` singleton** in `AuthProvider.tsx` — it guarantees one `PublicClientApplication` per React root.
- **Do not export a default `<AuthProvider>` that auto-mounts** — instances must explicitly choose the island boundary.
- **Document any new auth-consuming component** (`useAuth`, `useMsal`, etc.) with the same constraint warning the existing components carry.
- **The barrel `src/index.ts` exports all public APIs** — `AuthProvider`, `LoginButton`, `ProtectedContent`, `UserAvatar`, `useAuth`, `useGraphClient`, `useSharePointList`, `useSharePointFiles`, the Graph utilities, and the SharePoint UI components (`SharePointGallery`, `SharePointFileList`, `SharePointListView`). Do not silently change consumer import paths in already-published versions without a semver-major bump.

## Workspace layout

| Path | Purpose | Status |
| :--- | :--- | :--- |
| `packages/theme-core/` | `@itci/easy-web-theme-core` — CSS design tokens, light/dark theme, no-flash script | Real (consumed at ^0.3.x by instances) |
| `packages/i18n/` | `@itci/easy-web-i18n` — `localizedHref`, `getLocaleFromPath`, `SupportedLocale`, alternate-link helpers | Real (consumed at ^0.3.x by instances) |
| `packages/easy-web-content-blocks/` | `@itci/easy-web-content-blocks` — Hero, Section, CardGrid, Card, and other reusable page blocks | Real (consumed at ^0.2.x by instances) |
| `packages/auth/` | `@itci/easy-web-auth` — MSAL.js + Microsoft Graph wrapper, `<AuthProvider>`, `useAuth`, `<LoginButton>`, `<ProtectedContent>`, `<UserAvatar>` | Real at v0.1.0 — fully wired (AuthProvider, useAuth, LoginButton, ProtectedContent, UserAvatar, Graph client, SharePoint hooks and UI components). Published to Azure Artifacts. |
| `packages/easy-web-cms-adapters/` | `@itci/easy-web-cms-adapters` — CMS adapter contract per ADR 0006 | Stub |
| `packages/easy-web-azure-functions-utils/` | `@itci/easy-web-azure-functions-utils` — server-side helpers for Azure Functions | Stub |
| `packages/create-easy-web/` | `@itci/create-easy-web` — scaffold CLI per ADR 0003, bootstraps a new instance from this baseline | Stub |
| `examples/` | Reference instances consuming the packages locally for development | Empty (placeholder) |
| `scripts/` | Workspace-level tooling (release, validation) | — |
| `docs/` | Repo-local notes; canonical docs live in `websites/docs/` | — |

The exact version status of each package may have drifted since this file was written. Verify via `cat packages/<name>/package.json` before assuming.

## Pilot-first workflow

Every change to a real package follows the same path:

1. Implement / fix in this repo (the package).
2. Validate by consuming the change in [`dev.ismaili.de`](../dev.ismaili.de/) (the pilot — battle-tests new packages first).
3. Publish via the existing release flow (`turbo run publish-packages`, gated on `chore(release):` commits or `v*` tags per `azure-pipelines.yml`).
4. Once validated, customer instances ([`harleyrentflorida.de`](../harleyrentflorida.de/)) pick up the new version via Renovate-driven dependency bump PRs (future) or manual bump (current).

**Do not skip the pilot.** The pilot exists to catch integration issues before customer sites are touched. Always test against `dev.ismaili.de` before publishing.

## Publishing packages

> **Agents: never run `pnpm publish` directly.** Publishing requires a PAT (`ADO_NPM_TOKEN`) that is only available in CI. Use the pipeline instead.

### How the pipeline works

`azure-pipelines.yml` has two stages:
1. **Build** — runs on every push to `main`: lint, typecheck, test, build, uploads `packages-dist` artifact.
2. **Publish** — runs only when triggered (see below): authenticates via `npmAuthenticate@0` (no manual PAT needed) and publishes all packages via `pnpm -r publish`.

### Two ways to trigger a publish

**Option A — Version tag** (preferred for releases):
```pwsh
# 1. Bump the version in the relevant package.json
#    (edit packages/<name>/package.json "version" field)
# 2. Commit the bump
git add packages/<name>/package.json
git commit -m "chore(release): bump @itci/<package-name> to <version>"
# 3. Tag the repo root (not the package subfolder)
git tag v<version> -m "release: @itci/<package-name> v<version>"
git push origin main --tags
```
The pipeline triggers on any tag matching `v*` and publishes **all** packages that have a new version.

**Option B — Commit message trigger**:
```pwsh
# A commit whose message contains "chore(release):" triggers the Publish stage
git commit -m "chore(release): @itci/<package-name> v<version>"
git push origin main
```

### Version bump checklist (for agents)
1. Edit `packages/<name>/package.json` — increment `"version"` (follow semver: patch for fixes, minor for features, major for breaking).
2. Update `CHANGELOG.md` if it exists in the package.
3. Commit with `chore(release): bump @itci/<name> to <version>`.
4. Push tag (Option A) or rely on commit message (Option B).
5. **Do not** run `pnpm publish`, `npm publish`, or set `ADO_NPM_TOKEN` — the pipeline handles all of that.

### Feed coordinates
- Registry: `https://pkgs.dev.azure.com/IT-CI/WebSites/_packaging/websites/npm/registry/`
- Feed name: `websites` (visible at Azure DevOps → Artifacts → select feed "websites")
- All packages are namespaced `@itci/easy-web-*`

## What to change here

✅ **In scope**:
- New shared components that more than one instance would benefit from.
- Bug fixes to existing `@itci/easy-web-*` packages.
- Theme-token additions, new locales, new content blocks, new auth components.
- New packages, when a clear cross-instance need exists.
- Tests, types, lint configuration, build pipeline.

## What NOT to change here

❌ **Out of scope**:
- Site-specific content, branding, or copy — that belongs in the instance repo.
- One-off components used by exactly one instance — keep those local to the instance unless they generalize.
- Pipeline templates shared across all sites — those live in `websites/pipelines/` per ADR 0004.
- Architecture decisions, ADRs, ecosystem-wide policy — those live in `websites/docs/decisions/`.

## Standard commands

```pwsh
pnpm install                       # bootstrap workspace
pnpm lint                          # turbo run lint across all packages
pnpm typecheck                     # turbo run typecheck across all packages
pnpm test                          # turbo run test --passWithNoTests across all packages
pnpm build                         # turbo run build across all packages
pnpm --filter @itci/easy-web-auth test    # target a single package
pnpm publish-packages              # release flow (gated in CI)
```

## Related docs

- `README.md` — human-readable project overview (currently understates the real package status; verify against `packages/*/package.json`).
- [`websites/AGENTS.md`](../websites/AGENTS.md) — full ecosystem map and decision tree for AI agents.
- [`websites/docs/repos/easy-web.md`](../websites/docs/repos/easy-web.md) — canonical role description (may lag behind reality; verify against this repo's actual contents).
- [`websites/docs/decisions/`](../websites/docs/decisions/) — full ADR set. ADRs especially relevant to this repo:
  - [0002 — Astro as Baseline Framework](../websites/docs/decisions/0002-astro-as-baseline-framework.md)
  - [0003 — Core Packages and Thin Scaffold CLI](../websites/docs/decisions/0003-core-packages-plus-thin-scaffold.md)
  - [0006 — CMS-Agnostic Adapter Pattern](../websites/docs/decisions/0006-cms-agnostic-adapter-pattern.md)
  - [0010 — React Auth Components Within a Single Astro Island](../websites/docs/decisions/0010-react-auth-single-island.md)
