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

## License

By contributing, you agree that your contributions are licensed under the MIT License (see `LICENSE`).
