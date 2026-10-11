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
is not cryptographic verification. No loader or recipe implementation ships here.

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

This package is private while the consolidation is in progress and is made publishable only by the family release task.
