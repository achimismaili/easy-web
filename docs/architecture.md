# easy-web Architecture

Visual reference for how the `@easy-web/*` family is wired, released and consumed.
Diagrams are Mermaid and render inline on GitHub.

> Ecosystem-level records (decision records, repo topology, adoption matrix) are
> maintained in a private index repository. This file covers only what is
> internal to `easy-web`.

## Package graph

One base package, four add-ons, one reserved name, and five deprecated
compatibility packages (ADR 0018). A site installs `core` and gets a working
site; everything else is opt-in.

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
  theme -.-> core
  i18n -.-> core
  blocks -.-> core
  seo -.-> core
  md -.-> core

  classDef prim fill:#7b2d8b,color:#fff,stroke:#4a1a54
  classDef ship fill:#2d4a8b,color:#fff,stroke:#1a2d54
  classDef shim fill:#8b5a2d,color:#fff,stroke:#54341a,stroke-dasharray:4 3
  classDef stub fill:#555,color:#fff,stroke:#333,stroke-dasharray:4 3
  class core prim
  class cms,swa,auth,brand ship
  class theme,i18n,blocks,seo,md shim
  class create stub
```

`cms-adapters` depends on `core` for the content contracts its definitions are
checked against. `swa`, `auth` and `brand` stand alone. Each shim is a regular
dependency on `core` that re-exports one subpath with `@deprecated` markers, so
existing imports keep working through 1.x. 2.0 removes the shims once every site
has migrated.

Everything else each package needs is supplied by the consuming instance as a
peer dependency:

| Package | Peer dependencies |
| :--- | :--- |
| `core`, `swa`, `cms-adapters`, `seo`, `markdown` | `astro` |
| `content-blocks` | `astro`, `zod` |
| `i18n` | `astro`, `@inlang/paraglide-js` |
| `auth` | `react`, `react-dom` |
| `theme-core`, `brand` | none |

**Why `core` is a dependency rather than a peer.** Under Changesets `fixed`
grouping, an intra-workspace *peer* dependency forces every release to be a
major (ADR 0016). Core's helpers are pure functions, CSS custom properties and
Astro components, so a duplicate copy costs bundle size rather than
correctness. `auth` keeps its React peer declaration because two MSAL instances
corrupt the shared token cache. There, duplication *is* a bug.

## Propagation: one fix reaches every site

The reason the monorepo exists. A change lands once and every instance inherits
it through npm.

```mermaid
flowchart LR
  dev["contributor<br/>+ changeset"] --> main["easy-web main"]
  main --> vpr["version PR<br/><i>chore: version packages</i>"]
  vpr -->|merge| npm[("public npm<br/>@easy-web/* @ one version")]
  npm --> reno["Renovate<br/><i>monthly</i>"]
  reno --> pilot["dev.ismaili.de<br/><i>pilot — validates first</i>"]
  pilot -->|once validated| cust["harleyrentflorida.de<br/><i>customer</i>"]
  reno -.-> cust
  cust --> future["future instances"]

  classDef hub fill:#7b2d8b,color:#fff,stroke:#4a1a54
  classDef reg fill:#8b5a2d,color:#fff,stroke:#54341a
  classDef site fill:#2d4a8b,color:#fff,stroke:#1a2d54
  class main,vpr hub
  class npm,reno reg
  class pilot,cust,future site
```

All 11 packages share one version (`fixed` grouping), so "which versions work
together?" has a single answer. Pilot-first is a policy, not a mechanism:
`dev.ismaili.de` takes a new version before any customer site does.

## Release flow

`changesets/action` does one of two things depending on whether changesets are
pending. Both branches must stay reachable — gating on only the first is what
previously made publishing impossible.

```mermaid
flowchart TD
  push["push to main"] --> check{"pending<br/>changesets?"}
  check -->|yes| open["open / update<br/>version PR"]
  open --> merge["merge version PR<br/><i>consumes changesets,<br/>bumps package.json</i>"]
  merge --> push
  check -->|no| ahead{"local version<br/>ahead of npm?"}
  ahead -->|yes| pub["publish all packages<br/><i>OIDC trusted publishing</i>"]
  ahead -->|no| noop["nothing to do"]

  classDef act fill:#2d4a8b,color:#fff,stroke:#1a2d54
  classDef dec fill:#8b5a2d,color:#fff,stroke:#54341a
  classDef done fill:#3f6f3f,color:#fff,stroke:#254025
  class open,merge,pub act
  class check,ahead dec
  class noop done
```

The second condition is what makes the publish branch reachable: merging the
version PR removes the changesets, so a "pending changesets" gate alone would
skip publishing forever.

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
