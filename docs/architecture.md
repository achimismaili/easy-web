# easy-web Architecture

Visual reference for how the `@easy-web/*` family is wired, released and consumed.
Diagrams are Mermaid and render inline on GitHub.

For reusable guidance on shared-package versus site responsibilities and the
separation between CMS editing and Astro content reading, see the
[Architecture Overview](../apps/docs/src/content/docs/architecture/index.mdx#shared-packages-and-site-responsibilities)
in the documentation site. This file complements that guidance with repository
diagrams.

## Package graph

One base package, four add-ons, a create-only CLI, one reserved name, and five
deprecated compatibility packages (ADR 0018). A site installs `core` and gets a
working site; everything else is opt-in.

```mermaid
graph TD
  subgraph base["base"]
    core["core<br/><i>tokens, i18n, SEO, markdown,<br/>components, contracts</i>"]
  end

  subgraph addons["add-ons"]
    cms["cms-adapters<br/><i>Decap, typed definitions</i>"]
    swa["swa<br/><i>SWA 404 config</i>"]
    auth["auth<br/><i>MSAL, Graph</i>"]
    brand["brand<br/><i>favicon CLI</i>"]
  end

  subgraph tooling["tooling, versioned on its own"]
    cli["cli<br/><i>create-only generator,<br/>Node 24 or later</i>"]
  end

  subgraph shims["deprecated re-export shims, removed in 2.0"]
    theme["theme-core"]
    i18n["i18n"]
    blocks["content-blocks"]
    seo["seo"]
    md["markdown"]
  end

  subgraph stubs["reserved name, no src/"]
    create["create"]
  end

  cms --> core
  auth --> core
  cli --> core
  cli --> cms
  cli --> auth
  theme -.-> core
  i18n -.-> core
  blocks -.-> core
  seo -.-> core
  md -.-> core

  classDef prim fill:#7b2d8b,color:#fff,stroke:#4a1a54
  classDef ship fill:#2d4a8b,color:#fff,stroke:#1a2d54
  classDef tool fill:#2d6a6a,color:#fff,stroke:#1a4040
  classDef shim fill:#8b5a2d,color:#fff,stroke:#54341a,stroke-dasharray:4 3
  classDef stub fill:#555,color:#fff,stroke:#333,stroke-dasharray:4 3
  class core prim
  class cms,swa,auth,brand ship
  class cli tool
  class theme,i18n,blocks,seo,md shim
  class create stub
```

`cms-adapters` depends on `core` for the content contracts its definitions are
checked against, and `auth` depends on it for the recipe protocol. `swa` and
`brand` stand alone. The CLI composes the create recipes of `core`, `auth` and
`cms-adapters`; it runs only on the machine that generates a site and never
ships inside one. Each shim is a regular dependency on `core` that re-exports one
subpath with `@deprecated` markers, so existing imports keep working through 1.x.
2.0 removes the shims once every site has migrated.

Host-provided integrations are declared as peers; packages also install regular
third-party dependencies, such as MSAL in auth and Sharp in brand:

| Package | Peer dependencies |
| :--- | :--- |
| `core`, `swa`, `seo`, `markdown` | `astro` |
| `cms-adapters` | `astro`, `sharp` |
| `content-blocks` | `astro`, `zod` |
| `i18n` | `astro`, `@inlang/paraglide-js` |
| `auth` | `astro`, `react`, `react-dom` |
| `theme-core`, `brand` | none |

**Why `core` is a dependency rather than a peer.** Peer-range changes can
propagate breaking bumps through Changesets' fixed group. Core's shared helpers
do not require a host singleton. Auth also depends on core normally, while keeping
React and React DOM as host-provided peers. Peer declarations alone cannot prevent
two MSAL providers: auth-dependent components must share one React island and one
provider. See the [contributing guide](../CONTRIBUTING.md#dependencies-and-host-provided-peers)
for the manifest-backed dependency strategy.

## Propagation: one fix reaches every site

The reason the monorepo exists: a change lands once and becomes available to
every instance through npm. Adoption is explicit, not an automatic rollout.

```mermaid
flowchart LR
  dev["contributor<br/>+ changeset"] --> main["easy-web main"]
  main --> vpr["version PR<br/><i>chore: version packages</i>"]
  vpr -->|merge| release["Release run<br/><i>verify publication</i>"]
  release --> npm[("public npm<br/>fixed family + independent CLI")]
  npm --> update["reviewed site update<br/><i>manifest + lockfile</i>"]
  update --> pilot["pilot<br/><i>validate and deploy</i>"]
  pilot -->|once validated| cust["customer adoption<br/><i>separate checks and deployment</i>"]

  classDef hub fill:#7b2d8b,color:#fff,stroke:#4a1a54
  classDef reg fill:#8b5a2d,color:#fff,stroke:#54341a
  classDef site fill:#2d4a8b,color:#fff,stroke:#1a2d54
  class main,vpr,release hub
  class npm,update reg
  class pilot,cust site
```

All 11 packages in the fixed group share one version (`fixed` grouping), so
"which versions work together?" has a single answer. The CLI is versioned on its
own and is not a generated-site dependency. Pilot-first is a policy, not
a mechanism: the pilot validates a new version before customer adoption.

## Release flow

`changesets/action` opens a version PR when changesets are pending and can publish
when they are not. The workflow admits both paths:

```mermaid
flowchart TD
  push["push to main"] --> check{"pending<br/>changesets?"}
  check -->|yes| open["open / update<br/>version PR"]
  open --> merge["merge version PR<br/><i>consumes changesets,<br/>bumps package.json</i>"]
  merge --> push
  check -->|no| differs{"either bellwether version<br/>differs from npm?"}
  differs -->|yes| pub["publish unpublished versions<br/><i>OIDC trusted publishing</i>"]
  differs -->|no| noop["skip Changesets action"]

  classDef act fill:#2d4a8b,color:#fff,stroke:#1a2d54
  classDef dec fill:#8b5a2d,color:#fff,stroke:#54341a
  classDef done fill:#3f6f3f,color:#fff,stroke:#254025
  class open,merge,pub act
  class check,differs dec
  class noop done
```

The bellwethers are `@easy-web/i18n` for the fixed family and `@easy-web/cli`
for the independent line. Merging a version PR consumes the changesets, so the
registry comparison keeps the publish path reachable. Neither that comparison
nor the merge proves a complete npm release. See the
[canonical release guidance](../CONTRIBUTING.md#version-pr-publication-and-adoption-are-separate)
for workflow conditions, publication evidence and consumer ownership.

## SEO: one declaration, two surfaces

Canonical URLs, in-page `hreflang` and the sitemap must agree byte-for-byte, or
search engines treat `/x` and `/x/` as competing duplicates and drop mismatched
hreflang clusters. Every emitted URL is therefore derived from one model.

```mermaid
flowchart TD
  decl["src/lib/localized-paths.ts<br/><i>declared once per instance</i><br/>de: /datenschutz/ ↔ en: /en/privacy/"]

  decl --> i18nf["createI18n()<br/><i>@easy-web/i18n</i>"]
  decl --> seof["easyWebSeo()<br/><i>@easy-web/seo</i>"]

  cfg["astro.config.mjs<br/>build.format · trailingSlash"] --> urlform["served URL form<br/><i>resolved once</i>"]
  urlform --> i18nf
  urlform --> seof

  i18nf --> head["page &lt;head&gt;<br/>canonical + hreflang"]
  seof --> map["sitemap-0.xml<br/>loc + xhtml:link"]
  seof --> robots["robots.txt<br/><i>shared crawl policy</i>"]

  head -.must match.-> map
  robots -.same policy.-> map

  classDef src fill:#7b2d8b,color:#fff,stroke:#4a1a54
  classDef pkg fill:#2d4a8b,color:#fff,stroke:#1a2d54
  classDef out fill:#3f6f3f,color:#fff,stroke:#254025
  class decl,cfg src
  class i18nf,seof,urlform pkg
  class head,map,robots out
```

Routes whose slug is identical across locales pair automatically and are not
declared. Only the ones that differ — `/datenschutz/` vs `/en/privacy/` — need
an entry, and a stale entry fails the build rather than degrading silently.

`robots.txt` and the sitemap read the same crawl policy, so a path cannot be
disallowed in one and advertised in the other.

## See also

* [`AGENTS.md`](../AGENTS.md) — repo orientation, workspace layout, publishing workflow
* [`README.md`](../README.md) — package inventory
* Per-package READMEs under [`packages/`](../packages) — the API reference for each `@easy-web/*` package
