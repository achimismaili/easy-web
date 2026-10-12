# @easy-web/cli

Private Phase-1 create-only CLI. Generation is offline by default; installation is explicit.

```sh
easy-web create --config ./create.json --json
# Equivalent explicit offline form:
easy-web create --config ./create.json --no-install
# Opt in to dependency resolution through pnpm's ambient registry configuration:
easy-web create --config ./create.json --install
```

```json
{
  "target": "./new-site",
  "recipes": {
    "shell": { "siteName": "Example Site", "defaultLocale": "en", "noIndex": false },
    "auth": {}
  }
}
```

Shell is always selected; omit `auth` or `cms` to exclude them. Recipe options are
parsed with the package-owned schemas. CMS options use `composition`, `backend`,
`mediaRoots` and optional `uiLocale`; selecting CMS currently fails before generation
because both shell and CMS contribute `astro.config.mjs`. Multi-recipe JS config
merging is not supported in Phase 1. Package dependencies, devDependencies and
scripts merge additively in resolver order; the later value wins a key collision.

Targets must have an existing parent and be nonexistent or empty, including hidden
and ignored content. Linked paths/junctions and unsafe output paths are rejected.
An existing clean Git root/worktree with an empty committed HEAD tree and index
uses a new task branch/worktree; its returned `target` differs from the input, and
the caller HEAD/index/files are preserved. Fresh targets use isolated staging,
exclusive publication and one initial commit. Git identity must already be
available; the CLI never changes Git configuration.

Validation checks exact recipe output sets, JSON/JS syntax, package schemas,
recipe validators, dependency sources and an additions-only allow-listed index.
Dependency values must be registry-compatible version ranges; URL, Git, local-file
and workspace sources are rejected before target writes.

With no flag or `--no-install`, the CLI does not invoke a package manager or make a
network request. It commits a deterministic Phase-1 `pnpm-lock.yaml` placeholder
containing lockfile version/settings and importer specifiers, but no resolved package
snapshots. This is deliberately not represented as a fully resolved lockfile: run
`pnpm install` separately before typechecking or building. Missing offline artifacts
cannot occur with this self-contained placeholder approach, so the reserved exit-4
scenario is unreachable in Phase 1; a future bundled-metadata resolver must fail with
exit 4 before writes when its verified artifact is absent.

With `--install`, the same source validation and committed generation happen first,
then the CLI runs `pnpm install` in the returned target. It passes no registry flag or
hardcoded URL, so pnpm honors the user's ambient `.npmrc`/proxy configuration. The
install may complete/update the placeholder lockfile after the creation commit.
Generated-site type/build/E2E checks remain outside this command. Auth files
are generated as declared; wiring the auth mount and React integration is not
performed by this composer. Graph JSON and Mermaid are returned in diagnostics,
not extra generated files. Retain the returned task worktree until human review.

Decision, Git rollback boundary and deferred roadmap: ADR 0019 in the websites meta-repo
(`docs/decisions/0019-create-only-easy-web-cli.md`). Operator summary with a real
resolved graph diagram: `docs/architecture/create-cli-phase-1.md` there. To undo a
successful run, remove the returned task worktree and delete its branch; the CLI never
resets or rewrites history.

Exit codes: 0 success, 3 invalid config/target/composition, 4 generation/Git/staging
failure. `--json` emits versioned diagnostics on stderr and a result on stdout.
