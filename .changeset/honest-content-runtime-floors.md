---
"@easy-web/core": patch
"@easy-web/cms-adapters": patch
"@easy-web/cli": patch
---

Correct generated dependency minima to match emitted runtime APIs: content sites
require core 1.6.0 for trait schemas, and content-plus-CMS sites require core and
CMS adapters 1.9.0 for the composition helper and coupled core APIs. Keep the
shell-only range unchanged and require 1.6.0 for the standalone CMS media recipe's
fieldsForTraits import, and declare the markdown processor needed by its Astro 7
configuration. Adopt the corrected
recipe owners in the CLI and cover generated sites with packed-CLI, published
minimum-runtime consumer checks without weakening release-age policy.
