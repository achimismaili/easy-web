# Contributing

Thank you for contributing to easy-web.

## Workflow

1. Fork the repo and create a feature branch off `main`.
2. Make your changes.
3. Before opening a PR, run: `pnpm build && pnpm test && pnpm changeset`.
4. Open a PR against `main` with a clear description.

## Requirements

- **Conventional Commits** for all commit messages (e.g. `feat(auth): add device-code flow`).
- **Changesets** required for any user-visible change — `pnpm changeset` generates the required file.
- Code must pass build and tests.

## Toolchain

- **Node.js 24** is the recommended baseline. The root `package.json` pins it for [Volta](https://volta.sh), so `node` resolves to it inside the repository.
- **pnpm 10** is pinned through `packageManager` in the root `package.json`.
- **Astro 7** is what every workspace package and app builds against.

The Compatibility lane proves the supported floor, **Node.js 22 with Astro 6**, for core, CMS adapters and the five compatibility packages it packs. Other add-ons retain their declared peer ranges but are not covered by that consumer build. When you change a package in the Compatibility lane, do not rely on a Node.js 24-only API or an Astro 7-only import. `@easy-web/cli` requires Node.js 24 or later, only runs on the machine that creates a site, and must never become a dependency of a package that goes into a site.

Node.js is a build-time requirement. easy-web sites are static output, so nothing in a built site needs Node.js to be served.

## Validation lanes

CI runs two lanes, both defined in `.github/workflows/ci.yml`:

- **Workspace**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and the contract conformance check, on Node.js 24 with Astro 7.
- **Compatibility**: packs `core`, `cms-adapters` and the five compatibility packages, installs the tarballs into an isolated consumer and builds a static site on Node.js 22 with Astro 6 and on Node.js 24 with Astro 7. The harness is `scripts/packed-consumer-compat.mjs`, and the `packed-consumer` job pins the exact versions.

Run the workspace lane before you open a PR. If you change exports, peer ranges or published files, also reproduce the compatibility lane locally: `node scripts/packed-consumer-compat.mjs --astro <version> --node <minimum>`, using a pairing from the `packed-consumer` matrix.

`pnpm compat:cli-minimum` packs the CLI and its recipe owners, runs the installed
CLI with `create --no-install --json`, and installs the generated sites outside
the workspace. Shell, content (with/without images), and CMS (with/without images)
profiles and the standalone CMS media recipe pin only the generated first-party runtime lower bounds to published
registry versions, then run `typecheck` and `build` and inspect SEO, routes and
CMS previews. Generator-only tarball overrides never enter runtime consumers;
no source aliases or release-age exclusions are used. This networked check runs
in CI on Node 24, separately from the workspace source-based test matrix.

The [technology map](https://achim.ismaili.de/easy-web/docs/architecture/technology-map/) lists the lane that validates every package.

## UI and docs

- UI changes follow [`DESIGN.md`](DESIGN.md). Use the `--ew-*` tokens and the core components, and extend `DESIGN.md` before you extend `packages/core/styles/tokens.css`.
- The docs site keeps Starlight's own shell. To show a live core component, put it in the `CorePreview` frame (`apps/docs/src/components/CorePreview.astro`) instead of copying markup.
- The showcase passes an `item` to the card components. The individual `title`, `description`, `href`, `image` and `imageAlt` props are deprecated.

## Package versions, dependencies and releases

### Two version groups

[`.changeset/config.json`](.changeset/config.json) is authoritative: `fixed`
contains `@easy-web/!(cli)`, `linked` and `ignore` are empty, and internal
dependency updates use `patch`.

| Group | Current membership | Meaning |
| :--- | :--- | :--- |
| Fixed family | `@easy-web/core`, `@easy-web/auth`, `@easy-web/brand`, `@easy-web/cms-adapters`, `@easy-web/swa`, `@easy-web/theme-core`, `@easy-web/i18n`, `@easy-web/content-blocks`, `@easy-web/seo`, `@easy-web/markdown` | A family release gives every member the same version, including unchanged packages. A dependency-only or minimal changelog is expected for an unchanged member. |
| Independent tooling | `@easy-web/cli` | Has its own semver line; a CLI-only change does not release the fixed family. It is a creation-time tool, not a dependency to add to a generated site. |

Workspace apps and the root are private and are not npm releases.
Do not infer a package version from a repository tag or the private root's
version. Read the relevant package manifest for the repository version and npm
for the published version.

Select the affected packages and the appropriate semver bump with
`pnpm changeset`; commit the generated changeset with the implementation.
Changesets computes the family bump and any dependent-package updates. The CLI's
separate version line does not prevent dependency-driven updates to the CLI.
Do not hand-edit package versions or add a changeset for repository-only
documentation that changes no published package.

### Dependencies and host-provided peers

The manifests use `dependencies` with `workspace:*` for first-party code:
CMS adapters and auth depend on core, the compatibility packages depend on core,
and the CLI depends on core, auth and CMS adapters for package-owned recipes.
pnpm converts those workspace references to package versions when packing for
publication; a registry consumer does not resolve this monorepo's workspace.

Keep host-provided integrations in their declared `peerDependencies`, rather
than converting every dependency to a peer to enforce matching versions.
Peer-range changes can propagate breaking bumps through Changesets; a regular
dependency is appropriate for shared code that does not need a host singleton.
Auth currently installs MSAL as regular dependencies and declares Astro, React
and React DOM as peers. These declarations do **not** enforce one auth provider:
all auth-dependent components on a page must still share one React island and
one `AuthProvider`. See the [auth integration guide](apps/docs/src/content/docs/packages/auth.mdx).
The package manifests, not a blanket peer rule, define the actual requirements.

### Version PR, publication and adoption are separate

[`release.yml`](.github/workflows/release.yml) runs on pushes to `main`, installs
and builds the workspace, then admits the Changesets action if either changesets
are pending or a local bellwether version differs from npm. It checks both
`@easy-web/i18n` for the fixed family and `@easy-web/cli` for the independent line.
This is an inequality check, not a semver comparison or a per-package registry
audit.

With pending changesets, the action opens or updates `chore: version packages`.
Merging that PR records versions, dependency updates and changelogs in Git and
consumes the changesets. On the subsequent main run, the action can execute
`pnpm changeset publish` if the registry comparison admits it. Only packages with
unpublished versions need publication; a CLI-only release is not a family release.

A merged version PR is **not proof of publication**. Check the Release run and
the exact intended package versions on npm before declaring a release available,
especially after a failed or partial run. The two bellwethers gate the action;
they do not prove that every package was published. Publishing belongs to the
existing GitHub Actions flow, not a local `npm publish` or token-based fallback.
The workflow uses OIDC Trusted Publishing and package manifests opt into
provenance. An attestation identifies the build source; it does not prove
compatibility, complete publication or consumer adoption.

Recipe implementations ship with their owning packages, so a CLI change that
uses new recipe APIs needs those package versions available before registry users
can use it. Check the required runtime package versions as well as the CLI
version. The workflow has no separate recipe-artifact admission or release-order
verification step; do not describe the two bellwethers as that guarantee.

A site adopts a release through a reviewed manifest **and lockfile** update,
its own checks and its own deployment. Validate the pilot before customer
adoption; publishing alone updates no site. The create-only CLI does not
regenerate or upgrade existing source, configuration or pipeline snapshots.
Those remain site-maintained files. See the
[creation guide](apps/docs/src/content/docs/getting-started/create-new-site.mdx#review-the-generated-result)
and [architecture diagrams](docs/architecture.md#release-flow).

## License

By contributing, you agree that your contributions are licensed under the MIT License (see `LICENSE`).
