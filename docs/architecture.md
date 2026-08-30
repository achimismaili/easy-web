# easy-web Architecture

Visual reference for how the `@easy-web/*` family is wired, released and consumed.
Diagrams are Mermaid and render inline on GitHub.

> Canonical ecosystem docs (ADRs, repo topology, adoption matrix) live in the
> [`websites` meta-repo](https://dev.azure.com/it-ci/websites/_git/websites).
> This file covers only what is internal to `easy-web`.

## Package graph

Nine shipping packages, two reserved stubs. There are only **three** runtime
edges between them — everything else is independent.

```mermaid
graph TD
  subgraph composers["compose other packages"]
    blocks["content-blocks<br/><i>Astro components</i>"]
    seo["seo<br/><i>sitemap, canonical, robots</i>"]
  end

  subgraph shared["shared primitives"]
    theme["theme-core<br/><i>CSS tokens, theming</i>"]
    i18n["i18n<br/><i>locale routing, hreflang</i>"]
  end

  subgraph standalone["independent of the others"]
    swa["swa<br/><i>SWA 404 config</i>"]
    cms["cms-adapters<br/><i>Decap mounting</i>"]
    md["markdown<br/><i>remark plugin</i>"]
    auth["auth<br/><i>MSAL, Graph</i>"]
    brand["brand<br/><i>favicon CLI</i>"]
  end

  subgraph stubs["reserved names, no src/"]
    create["create"]
    afu["azure-functions-utils"]
  end

  blocks --> theme
  blocks --> i18n
  seo --> i18n

  classDef ship fill:#2d4a8b,color:#fff,stroke:#1a2d54
  classDef prim fill:#7b2d8b,color:#fff,stroke:#4a1a54
  classDef stub fill:#555,color:#fff,stroke:#333,stroke-dasharray:4 3
  class blocks,seo,swa,cms,md,auth,brand ship
  class theme,i18n prim
  class create,afu stub
```

Everything else each package needs is supplied by the consuming instance as a
peer dependency:

| Package | Peer dependencies |
| :--- | :--- |
| `content-blocks` | `astro`, `zod` |
| `i18n` | `astro`, `@inlang/paraglide-js` |
| `seo`, `swa`, `cms-adapters`, `markdown` | `astro` |
| `auth` | `react`, `react-dom` |
| `theme-core`, `brand` | none |

**Why `i18n` and `theme-core` are dependencies rather than peers.** Under
Changesets `fixed` grouping, an intra-workspace *peer* dependency forces every
release to be a major. They are pure functions and CSS custom properties, so a
duplicate copy costs bundle size rather than correctness. `auth` keeps its React
peer declaration because two MSAL instances corrupt the shared token cache —
there, duplication *is* a bug. See
[ADR 0016](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/decisions/0016-intra-workspace-dependencies-over-peer-dependencies.md).

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
* [ADR index](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/decisions) — ecosystem decision records
