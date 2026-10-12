---
"@easy-web/core": minor
"@easy-web/auth": minor
"@easy-web/cms-adapters": minor
---

Add the building blocks for generating a complete site with `easy-web create`. All changes are additive, existing exports are unchanged.

`@easy-web/core` now ships a capability recipe system. A recipe describes what a feature needs and what it provides, and a deterministic resolver turns a set of requested capabilities into an ordered graph. The graph can be exported as stable JSON or as a Mermaid diagram, so the same input always yields the same output. The new entry points are `@easy-web/core/recipes`, `@easy-web/core/recipes/schema` and `@easy-web/core/recipes/registry`.

Core also gains:

- Create-time localization and formatting contracts in `@easy-web/core/i18n`, covering locale parsing, format contexts and explicit date, number and currency formatters.
- Generic content traits and presentation bindings, so a content type can be composed from reusable traits and bound to a visual block.
- Demo content and legal page generators in `@easy-web/core/demo`.
- A `site.shell` recipe that generates the Astro and package configuration, base layout, header, footer, navigation, fixed pages, localized paths, 404 page, SEO setup, Static Web Apps config, theme and brand files, and robots and sitemap output. Generated sites target Astro 7 and include the pnpm 11 build-script allowance they need.

`@easy-web/auth` adds an `auth.single-island` recipe (`@easy-web/auth/recipe`). It generates a Microsoft sign-in mount that lives in exactly one React island, and checks that rule before output is written.

`@easy-web/cms-adapters` adds a `cms.decap-media` recipe. It generates typed content definitions, the Decap configuration and admin page, and paired source and public media folders with bounded preview copies.
