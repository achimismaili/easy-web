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

The [technology map](https://achim.ismaili.de/easy-web/docs/architecture/technology-map/) lists the lane that validates every package.

## UI and docs

- UI changes follow [`DESIGN.md`](DESIGN.md). Use the `--ew-*` tokens and the core components, and extend `DESIGN.md` before you extend `packages/core/styles/tokens.css`.
- The docs site keeps Starlight's own shell. To show a live core component, put it in the `CorePreview` frame (`apps/docs/src/components/CorePreview.astro`) instead of copying markup.
- The showcase passes an `item` to the card components. The individual `title`, `description`, `href`, `image` and `imageAlt` props are deprecated.

## License

By contributing, you agree that your contributions are licensed under the MIT License (see `LICENSE`).
