# @easy-web/core

The base package for the `@easy-web/*` family. It owns the shared content contracts and, as the consolidation continues, the reusable components, theme, internationalization, SEO, and markdown primitives used by easy-web sites.

## Subpaths

- `@easy-web/core/contracts` - content and capability contracts
- `@easy-web/core/recipes` - first-party recipe protocol, hook types and pure admission schemas
- `@easy-web/core/recipes/schema` - serializable metadata Zod schema and JSON Schema
- `@easy-web/core/recipes/registry` - CLI-pinned package/version/integrity/export manifest schema
- `@easy-web/core/theme` - theme helpers and tokens
- `@easy-web/core/i18n` - localization helpers
- `@easy-web/core/seo` - SEO integration and components
- `@easy-web/core/markdown` - markdown processing helpers
- `@easy-web/core/components/*` - Astro components
- `@easy-web/core/schemas/*` - content schemas
- `@easy-web/core/styles/tokens.css` and `@easy-web/core/styles/fonts.css` - shared styles

## Add-ons
 
Four concerns remain separate because they depend on a specific platform or runtime: `@easy-web/swa` for Azure Static Web Apps, the `cms-adapters` package for Decap CMS, `@easy-web/auth` for React and MSAL authentication, and `@easy-web/brand` for brand tooling.

## Public build information (opt-in)

```ts
import easyWebSeo from '@easy-web/core/seo';

easyWebSeo({
    buildInfo: {
        site: 'Public site name',
        packages: ['cms-adapters', 'swa'],
        releaseId: 'public-release-label',
        json: true,
    },
});
```

`buildInfo` accepts `site`, optional `packages`, optional `releaseId`, and optional
`json`. The HTML route is the safe default. Set `json: true` only when the deployment
host can preserve a path-specific `X-Robots-Tag` response header for `/version.json`.
Labels must already be trimmed, printable text of 1–120 UTF-16 code units, with
no controls or invisible formatting characters. Supply only deliberately public
labels: validation cannot determine whether a label contains a secret.
`releaseId` is an optional opaque public label, not an automatically collected
commit, pipeline identifier or timestamp.

Allowed package IDs are `core`, `auth`, `cms-adapters`, and `swa`. Core is always
included; selections are deduplicated and sorted. The integration reads core's
own package artifact and resolves enabled add-on manifests from the site's Node
package search paths at configuration time, without executing their code. Missing,
invalid or differently versioned add-ons fail the build. Package ranges from the
site manifest are never reported. UI components are not independently versioned.

`/version` is always prerendered as standalone English HTML using core
components/tokens without hydration. `/version.json` is also prerendered only
when `json: true`. Their shared manifest has this
closed shape (the version below is illustrative):

```json
{"schema":"easy-web/build-info","schemaVersion":1,"site":"Public site name","easyWeb":{"version":"1.2.3","packages":["core"]}}
```

JSON is compact with a final newline; when supplied, `releaseId` appears after
`site`. No framework/runtime/third-party inventory, host details, environment,
build time or arbitrary metadata is collected. HTML escapes the public labels.
Both routes are excluded from the sitemap. Public `robots.txt` deliberately does
not disallow them: a crawler must be able to fetch a route before it can observe
its `noindex` directive. Site-wide `noIndex` remains one global rule. HTML always includes
`<meta name="robots" content="noindex,nofollow">`. The optional JSON response sets
`application/json; charset=utf-8`, `Cache-Control: no-store`,
`X-Content-Type-Options: nosniff` and
`X-Robots-Tag: noindex, nofollow` where Astro/the deployment preserves response
headers. Ordinary static file hosts do not retain endpoint response headers
automatically, which is why JSON generation is off by default. This integration
does not modify deployment-platform configuration.

These routes are intentionally public. Robots rules and noindex are **not access
control**. Omitting `buildInfo` injects neither route and retains prior crawl output.

## Recipe protocol version 1

Recipes declare `provides`, `requires`, `conflicts`, compatibility ranges, output
contributions and deterministic ordering (`priority`, then `key`, then recipe id;
dependencies precede consumers). Capability ids describe traits, like `HasImage`
and `Linkable`, not customer-specific content types.

`RecipeMetadata<Options>` carries a Zod `optionsSchema`, validator hooks and a
direct `generate(context)` hook returning file data. The serializable descriptor
uses a JSON Schema options object, validator descriptors and `generate: "direct"`;
functions cannot be represented in JSON Schema. Its exported JSON Schema validates
shape only. Pure `createRecipeAdmissionSchema(policy)` additionally checks selected
set invariants and compatibility using an injected semver `satisfies` policy.
The policy must reject malformed ranges. Admission never executes hooks or emits
a resolved graph; dependency selection and ordering belong to the CLI resolver.

Recipes are NEVER loaded from the generation target's `node_modules`. Only
CLI-pinned or bundled verified artifacts from the closed first-party package set
are allowed. A registry pin identifies package name, exact version, SHA-512 SRI
and package-relative export path. The future loader must verify artifact bytes
before importing executable code; admission checks its receipt against the
CLI-owned registry, not a registry supplied by the target. A receipt schema alone
is not cryptographic verification. The verified-artifact loader is not implemented;
the CLI currently imports its first-party workspace/package dependencies directly.
Core ships the shell recipe and content-site recipe factory.

## Generic content composition

Content types select additive traits from `title`, `slug`, `summary`, `body`,
`image`, `photos`, `order`, `taxonomy`, `publication`, `schedule`, `location`,
`cta`, `money`, and `featured`. They opt into the closed bindings `homepage`,
`list`, `detail`, `navigation`, and `cms-admin`; each binding has exported trait
requirements enforced by `contentCompositionSchema`. Labels and complete public
routes are declared per configured content locale. A content type exposes a
`primary` marker, while aggregate validation permits at most one primary type.

Only a money-enabled selection accepts `currency`, validated by the shared ISO
4217 input schema. `homepage` requires `featured`, so a type cannot occupy that
featured presentation slot merely by defining an image.

`createContentSiteRecipes(composition)` from `@easy-web/core/recipes` connects a
validated composition to shell navigation and a `content.pages` recipe. Its
`generatedContentCompositionSchema` deliberately accepts a smaller implemented
subset than the generic contract: one locale, `title`/`slug`/`body`, optional
`summary`/`image`, list/detail bindings and optional navigation or `cms-admin`. Other valid
contract selections fail with an explicit not-yet-supported diagnostic.

The recipe generates Astro collections from shared trait schemas, deterministic
example content, contract-checked entry adapters and list/detail pages using Card,
Media and Prose. A body becomes `HasBody` only after Astro renders it. Content
roles and bindings are logical graph contributions, not output filenames.
`primary` is a graph role; it does not select a homepage automatically.
`@easy-web/cms-adapters` supplies `createCmsContentSiteRecipes` for the CMS-enabled
path, consuming the same composition without replacing core's schemas or routes.
Core's optional `ContentSiteOptions` lets first-party recipes choose an asset
folder and contribute imports/integrations/markdown processing to the shell's
single configuration renderer. These are package-owned source expressions, not
user-configurable JavaScript or a post-generation config merge.
Application-auth composition remains unsupported.

Generated content sites require core `^1.6.0`, the first release with the trait
schemas used in their collections and adapters, even without images. This does
not raise the shell-only floor of `^1.5.0`. CMS composition adds its own higher
runtime requirement.

This package is published as part of the fixed `@easy-web/*` family through the Changesets and npm Trusted Publishing workflow.
