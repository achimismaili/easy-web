---
"@easy-web/core": minor
---

Add opt-in public build information to easyWebSeo with a prerendered /version page and an explicit host-capability opt-in for /version.json, both backed by one immutable, deterministic manifest. Resolve the exact installed core artifact version and verify explicitly enabled auth, cms-adapters and swa artifacts share the fixed-family version. Reject unknown fields and unsafe labels; expose no environment, infrastructure, dependency inventory or default timestamps. Keep generated routes out of sitemaps, publish explicit noindex directives without hiding them behind robots exclusions, and preserve feature-off behavior. The minor release propagates through the existing fixed-family release group.
