# AGENTS.md — easy-web

> **For AI agents working in this repo.**
> Baseline `@achimismaili/easy-web-*` package monorepo. Publishes the shared library every site instance consumes.

## Project identity

- **Purpose**: Shared package family for the ismaili.de web ecosystem — theme tokens, i18n primitives, content blocks, CMS adapters, MSAL auth components, and the scaffold CLI for new instances.
- **Type**: pnpm + Turborepo monorepo. Node 22.12.0 via Volta, pnpm 9.15.4.
- **Publishes to**: npm public registry. Packages namespaced `@achimismaili/easy-web-*`.
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
- **Preserve the `useRef` singleton** in `AuthProvider.tsx` — it guarantees one `PublicClientApplication` per React root. Note: this guards against accidental double-mount *within one root*, not against two roots on the same page. The island-boundary rule (ADR 0010) still applies.
- **Do not export a default `<AuthProvider>` that auto-mounts** — instances must explicitly choose the island boundary.
- **Document any new auth- or Graph-consuming component** (`useAuth`, `useMsal`, `useGraphClient`, etc.) with the same constraint warning the existing components carry.
- **The barrel `src/index.ts` exports all public APIs** — `AuthProvider`, `LoginButton`, `ProtectedContent`, `UserAvatar`, `useAuth`, `useGraphClient`, `useSharePointList`, `useSharePointFiles`, the Graph utilities, and the SharePoint UI components (`SharePointGallery`, `SharePointFileList`, `SharePointListView`). Do not silently change consumer import paths in already-published versions without a semver-major bump.
- **The dual-island bug ADR 0010 describes was hit and fixed in the pilot on 2026-06-10** (`dev.ismaili.de` commit `5af3390`, "auth-demo uses single island"). The package's `useRef` singleton was not enough — the integrator had mounted `<AuthShell>` in `Base.astro` *and* a second `<AuthProvider>`-bearing island on the same page. If you ship a higher-level convenience wrapper here that absorbs Pattern 2's per-instance shell, make sure it does not encourage page-level mounts on layouts that already provide one.

## Workspace layout

| Path | Purpose | Status |
| :--- | :--- | :--- |
| `packages/theme-core/` | `@achimismaili/easy-web-theme-core` — CSS design tokens, light/dark theme, no-flash script | Real (consumed at ^0.3.x by instances) |
| `packages/i18n/` | `@achimismaili/easy-web-i18n` — `localizedHref`, `getLocaleFromPath`, `SupportedLocale`, alternate-link helpers | Real (consumed at ^0.3.x by instances) |
| `packages/easy-web-content-blocks/` | `@achimismaili/easy-web-content-blocks` — Hero, Section, CardGrid, Card, and other reusable page blocks | Real (consumed at ^0.2.x by instances) |
| `packages/auth/` | `@achimismaili/easy-web-auth` — MSAL.js auth + Microsoft Graph + SharePoint integration. Auth: `<AuthProvider>`, `useAuth`, `<LoginButton>`, `<ProtectedContent>`, `<UserAvatar>`. SharePoint: `useGraphClient`, `useSharePointList`, `useSharePointFiles`, `<SharePointGallery>`, `<SharePointFileList>`, `<SharePointListView>`, plus low-level Graph helpers (`createGraphClient`, `getSite`, `getListItems`, `getDocumentLibraryFiles`, `getFileContent`, `getImageThumbnails`). | Real at v0.1.1 — fully wired (AuthProvider, useAuth, LoginButton, ProtectedContent, UserAvatar, Graph client, SharePoint hooks and UI components). Published to npm (tag `v0.1.1`); consumed by `dev.ismaili.de` at `^0.1.1`. |
| `packages/easy-web-cms-adapters/` | `@achimismaili/easy-web-cms-adapters` — CMS adapter contract per ADR 0006 | Stub |
| `packages/easy-web-azure-functions-utils/` | `@achimismaili/easy-web-azure-functions-utils` — server-side helpers for Azure Functions | Stub |
| `packages/create-easy-web/` | `@achimismaili/create-easy-web` — scaffold CLI per ADR 0003, bootstraps a new instance from this baseline | Stub |
| `examples/` | Reference instances consuming the packages locally for development | Empty (placeholder) |
| `scripts/` | Workspace-level tooling (release, validation) | — |
| `docs/` | Repo-local notes; canonical docs live in `websites/docs/` | — |

The exact version status of each package may have drifted since this file was written. Verify via `cat packages/<name>/package.json` before assuming.

## Pilot-first workflow

Every change to a real package follows the same path:

1. Implement / fix in this repo (the package).
2. Validate by consuming the change in [`dev.ismaili.de`](../dev.ismaili.de/) (the pilot — battle-tests new packages first).
3. Publish via the existing release flow (Changesets + GitHub Actions, gated on merged changesets).
4. Once validated, customer instances ([`harleyrentflorida.de`](../harleyrentflorida.de/)) pick up the new version via Renovate-driven dependency bump PRs (future) or manual bump (current).

**Do not skip the pilot.** The pilot exists to catch integration issues before customer sites are touched. Always test against `dev.ismaili.de` before publishing.

## Publishing packages

> **Agents: never run `pnpm publish` directly.** Publishing is automated via GitHub Actions and Changesets. Use the changeset workflow instead.

### How the release workflow works

GitHub Actions workflows handle the full release pipeline:
1. **CI** (`.github/workflows/ci.yml`) — runs on every push to `main`: lint, typecheck, test, build.
2. **Release** (`.github/workflows/release.yml`) — Changesets action opens/updates the "Version Packages" PR on `main`, and publishes to npm when that PR is merged. Uses **npm Trusted Publishing via OIDC** — no `NPM_TOKEN` secret is set or read. See *npm Trusted Publisher configuration*, *Release-workflow configuration invariants*, and *Required GitHub repo permissions* below.

### npm Trusted Publisher configuration

**Every `@achimismaili/easy-web-*` package already has a Trusted Publisher registered on npm** pointing at this repo's release workflow. This is a one-time, already-done setup. Do not re-register, and do not fall back to `NPM_TOKEN` / `NODE_AUTH_TOKEN` — those are intentionally not set.

TP registration parameters (identical for every package):

| Field | Value |
| :-- | :-- |
| Publisher | GitHub Actions |
| Owner / repository | `achimismaili/easy-web` |
| Workflow filename | `release.yml` |
| Environment | *(none — the release job does not declare an `environment:`)* |

### Release-workflow configuration invariants (three traps that produce identical E404s)

The OIDC-authenticated publish path is fragile. On 2026-07-02 we spent hours re-diagnosing three compounding causes of the same symptom: `E404 Not Found - PUT https://registry.npmjs.org/@achimismaili%2f<package>` at the `pnpm changeset publish` step, while Sigstore correctly signed a provenance envelope for the correct workflow identity. If a future agent sees that error, **check these first, in order, before assuming the Trusted Publisher is wrong**:

1. **`actions/setup-node` must NOT have `registry-url:`.** When set, setup-node writes `.npmrc` with `_authToken=${NODE_AUTH_TOKEN}`. Since `NODE_AUTH_TOKEN` is intentionally unset for OIDC, the placeholder expands to empty string — but npm CLI treats "any auth in `.npmrc`" as "auth is configured" and skips the OIDC exchange entirely. The publish PUT then goes out unauthenticated → 404. There is a warning comment in `release.yml` at the setup-node step; do not delete it, and do not add `registry-url:` back.
2. **System npm CLI must be ≥ 11.5.1.** The OIDC token-exchange endpoint (`/-/npm/v1/oidc/token/exchange/package/{url-encoded-pkg-name}`) was introduced in npm CLI 11.5.1 in July 2025. Node 22 LTS still ships with npm 10.x, which doesn't know about the endpoint. `pnpm publish` delegates to system `npm publish` under the hood, so this affects pnpm 10 too. The workflow includes an explicit `npm install -g npm@latest` step before `pnpm install` for this reason. Do not remove it.
3. **Provenance opt-in belongs in `publishConfig.provenance: true` per package.json, NOT as `NPM_CONFIG_PROVENANCE: true` env var on the changesets step.** The env-var form invokes an older code path that signs the Sigstore envelope out-of-band (visible in the transparency log) but does not force the OIDC-authenticated publish path. When we set it as an env var, provenance succeeded while auth silently failed. Set `publishConfig.provenance: true` in each package that opts in; leave the env var out.

Empirical anchors:
- `@achimismaili/easy-web-content-blocks@0.6.1` is the first easy-web package published via this workflow with a Sigstore attestation attached (`dist.attestations` populated on the registry). Every prior version across all seven packages was manually published with a classic token — those tarballs have `attestations = null`. If you ever see `attested: false` on a newly-published version, the release ran outside this workflow.

If a publish attempt still fails after checking (1)/(2)/(3), then investigate npm-side transient errors, TP-registration drift, or version regressions in `changesets/action@v1`. Only after those are ruled out should re-registration of the Trusted Publisher be considered.

### Required GitHub repo permissions

- **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"** must be enabled so `changesets/action@v1` can open the "Version Packages" PR after force-pushing the `changeset-release/main` branch. If this is disabled, the branch is still produced correctly on every push to `main`, but the PR must be opened manually: `gh pr create --repo achimismaili/easy-web --base main --head changeset-release/main --title "chore: version packages"`. The workflow's own `permissions:` block declares `contents: write`, `pull-requests: write`, and `id-token: write`, which is necessary but not sufficient on its own — the repo-level setting is a second gate.

### Publishing via Changesets

**Workflow**:
1. Make your changes to packages.
2. Run `pnpm changeset` to create a changeset file describing the change (version bump + changelog entry).
3. Commit the changeset file.
4. Push to `main`.
5. Changesets action creates a "Version Packages" PR that bumps versions and updates CHANGELOGs.
6. Merge the PR.
7. GitHub Actions publishes all changed packages to npm automatically.

### Version bump checklist (for agents)
1. Make your code changes in `packages/<name>/src/`.
2. Run `pnpm changeset` and follow the prompts (select packages, choose semver bump type, write changelog entry).
3. Commit the generated `.changeset/*.md` file.
4. Push to `main`.
5. **Do not** manually edit `package.json` versions — Changesets handles that.
6. **Do not** run `pnpm publish`, set `NPM_TOKEN`, or set `NODE_AUTH_TOKEN` — GitHub Actions publishes via the already-configured npm Trusted Publishers (see *npm Trusted Publisher configuration* above).
7. **Do not** re-add `registry-url:` to `actions/setup-node` or `NPM_CONFIG_PROVENANCE:` to the changesets step env — see *Release-workflow configuration invariants* above.

### Publishing coordinates
- Registry: npm public registry (`https://registry.npmjs.org/`)
- All packages are namespaced `@achimismaili/easy-web-*`
- pnpm pinned via `packageManager: "pnpm@10.34.4"` in every workspace `package.json`, and `version: 10.34.4` in both workflows. Bumping pnpm requires updating all locations in sync (the action rejects mismatch with `ERR_PNPM_BAD_PM_VERSION`).

## What to change here

✅ **In scope**:
- New shared components that more than one instance would benefit from.
- Bug fixes to existing `@achimismaili/easy-web-*` packages.
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
pnpm --filter @achimismaili/easy-web-auth test    # target a single package
pnpm changeset                     # create a changeset for release
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
