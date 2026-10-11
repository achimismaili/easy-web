# @easy-web/cli

Private Phase-1 create-only CLI. No install, network, cloud or existing-project mutations.

```sh
easy-web create --config ./create.json --json
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
recipe validators and an additions-only allow-listed index. It does not install
dependencies or run generated-site type/build/E2E checks in this task. Auth files
are generated as declared; wiring the auth mount and React integration is not
performed by this composer. Graph JSON and Mermaid are returned in diagnostics,
not extra generated files. Retain the returned task worktree until human review.

Exit codes: 0 success, 3 invalid config/target/composition, 4 generation/Git/staging
failure. `--json` emits versioned diagnostics on stderr and a result on stdout.
