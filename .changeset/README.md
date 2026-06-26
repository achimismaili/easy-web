# Changesets

This directory is used by [Changesets](https://github.com/changesets/changesets) to manage package releases.

## Release Workflow

1. Make your code changes
2. Run `pnpm changeset` to describe your changes and select affected packages
3. Commit the changeset file along with your code changes
4. When merged to `main`, the Changesets bot creates a "Version Packages" PR
5. Merging the version PR publishes all changed packages to npm

## Commands

- `pnpm changeset` — create a new changeset (describe what changed)
- `pnpm changeset status` — see pending changesets
- `pnpm changeset version` — apply changesets (done by CI)
- `pnpm changeset publish` — publish to npm (done by CI)
