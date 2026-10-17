---
"@easy-web/core": minor
"@easy-web/cli": minor
"@easy-web/auth": patch
"@easy-web/cms-adapters": minor
---

Connect CMS-independent content composition to deterministic site generation. Generate typed collections, example content, contract adapters, list/detail routes, navigation and SEO for a single content locale, rejecting unsupported traits and bindings explicitly. Keep logical graph contributions separate from generated file paths.

Generated shells include their own Astro typecheck configuration and shared SEO head, with robots output owned solely by the SEO integration. Extend first-party recipe compatibility to the CLI 0.2 line; application-auth mounting remains deferred.

Add opt-in CMS editor generation from the same top-level composition, exposing only cms-admin-bound collections. Keep core as the sole schema and Astro-config owner while composing the existing AdminPage, markdown source-image handling and explicit media preview mappings. Reject missing bindings, duplicated composition and overlapping media roots before generation. Preserve the standalone CMS recipe API.
