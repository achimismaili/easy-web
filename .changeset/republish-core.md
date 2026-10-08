---
'@easy-web/core': patch
---

Republish @easy-web/core. Its first publish attempt (as part of the 1.4.0 release) failed with ENEEDAUTH because no npm Trusted Publisher existed yet for this brand-new package. The owner has since bootstrap-published a placeholder version and configured the Trusted Publisher (GitHub Actions, achimismaili/easy-web, release.yml); this changeset forces a fresh publish attempt so @easy-web/core reaches npm alongside the rest of the family.
