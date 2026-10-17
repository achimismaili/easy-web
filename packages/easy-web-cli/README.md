# @easy-web/cli

Phase-1 create-only CLI. Generation is offline by default; installation is explicit.

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
parsed with the package-owned schemas. CMS editor generation uses the top-level
content composition, as shown below. Arbitrary multi-recipe JS config merging is
not supported in Phase 1. Package dependencies, devDependencies and
scripts merge additively in resolver order; the later value wins a key collision.

## Content-aware generation

An optional top-level `composition` selects content independently of CMS. The CLI
resolves a deterministic capability graph and runs package-owned recipes; it does
not clone a site, copy a pilot, or read a customer repository.

```json
{
  "target": "./new-site",
  "recipes": {
    "shell": { "siteName": "Example Site", "defaultLocale": "en", "noIndex": true }
  },
  "composition": {
    "contentLocales": ["en"],
    "contentTypes": [{
      "id": "entries",
      "primary": true,
      "labels": { "en": "Entries" },
      "routes": { "en": "/entries/" },
      "traits": ["title", "slug", "summary", "image", "body"],
      "bindings": ["list", "detail", "navigation"]
    }]
  }
}
```

This first slice supports one locale matching `shell.defaultLocale`, one or more
content types, required `title`/`slug`/`body`, optional `summary`/`image`, and
`list`/`detail` plus optional `navigation` bindings. At most one type can be
`primary`; that marker describes its graph role, not a homepage renderer.
Routes use non-reserved lowercase path segments and must not overlap.
Unsupported traits, homepage bindings, multiple locales, and combining this
composition with application auth fail as invalid input, not partial output.
Existing shell-only and shell-plus-auth inputs retain their earlier behavior.

Core owns schema, sample-content and page generation. The generated definitions
record the composition and export Astro collections built from the shared trait
schemas. Typed adapters map `summary` to the Card contract's `description`, resolve
`href` from the configured route and slug, and prove capability conformance with
`assertImplements`. Detail pages use the rendered-body contract; image-enabled
sites declare Sharp and supply a local example asset handled by Astro.
The graph reports content roles and presentation bindings separately from files.

After creation, run `pnpm install`, replace the placeholder `site` URL in
`astro.config.mjs`, then run `pnpm typecheck` and `pnpm build`. The generated shell
includes a strict Astro `tsconfig.json`, `@astrojs/check`, shared tokens and
`SeoHead`. The SEO integration owns `robots.txt`; `noIndex: true` emits no sitemap,
disallows crawling and adds noindex metadata to generated pages. This is not
authentication and does not enforce a deployment environment's access policy.
Definitions and pages are generated source: editing the recorded trait list alone
does not regenerate schemas or routes. The CLI still has no modify/update command.

### Add CMS to the same content composition

Add `cms-admin` to the bindings of each editable content type and add these recipe
options alongside `recipes.shell`:

```json
{
  "cms": {
    "backend": {
      "repo": "YOUR_ORG/YOUR_PROJECT/YOUR_REPOSITORY",
      "tenantId": "YOUR_TENANT_ID",
      "appId": "YOUR_PUBLIC_APP_ID",
      "branch": "main"
    },
    "mediaRoots": ["src/assets/images"],
    "uiLocale": "en"
  }
}
```

Do not repeat `composition` inside `recipes.cms`. Core still owns the collection
schemas, routes, example content and the only `astro.config.mjs`. The CMS add-on
reads the recorded composition at build time to generate Decap forms in the
standalone `/admin/` page, using the existing `AdminPage` component. Only content
types with `cms-admin` appear in the editor; no binding means no editor exposure.
CMS without a bound type, or a CMS binding without the add-on, is rejected.

The first media root owns editor uploads and the generated example image; all
configured roots get explicit source-asset previews. Roots must be distinct and
non-overlapping. Astro's markdown processor handles Decap's `/src/assets/...`
body-image URLs, while public pages retain optimized assets. The shared SEO
integration and `shell.noIndex` policy remain intact; the editor is always
noindex and excluded from the sitemap. These crawler settings are not authentication.

This writes public backend identifiers, never credentials. Configure the Azure
DevOps repository, public Entra application and permissions separately; generation
does not provision, authenticate, deploy or validate a live CMS login. Saves use
the configured branch (default `main`) without enabling an editorial workflow.

The published standalone `cmsMediaRecipe` API remains available with its older
nested composition and full trait support. That recipe owns a complete config and
schema and is not composable with the CLI shell; use the top-level composition
path above for generated content sites.

## Target and validation boundary

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
