# Migration Guide — @easy-web/content-blocks

Upgrade paths for consuming instances. Every section provides an **Automated** path (recommended), a **Manual** checklist (for auditing what the script does), and a **Rollback** procedure.

The shared 404 architecture is documented in [ADR 0013 — Shared Not-Found Primitives](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/decisions/0013-shared-not-found-primitives.md). This guide does not repeat that rationale — read the ADR first if you need the "why".

---

## Migrating to v1.1.0 (from v1.0.x)

**Scope**: additive, non-breaking. v1.1.0 exposes the shared `NotFound` component and the `notFoundSchema` Zod schema so every instance can render a brand-conform 404 page driven by a CMS-editable `notFound.json` singleton. See ADR 0013 for the full contract.

**Companion package**: pair this upgrade with [`@easy-web/swa@^1.1.0`](../easy-web-swa/MIGRATION.md), which wires the corresponding `staticwebapp.config.json` slice for Azure Static Web Apps hosting.

### Automated

Run the migration script from the `websites` meta-repo — it inspects the target instance, adopts the shared pattern in-place, and prints the diff before committing anything:

```powershell
pwsh -File E:\code\it-ci\websites\scripts\migrations\notfound-adopt.ps1 -InstancePath E:\code\it-ci\<your-instance>
```

The script performs every step in the manual checklist below.

### Manual

If you prefer to adopt by hand (or need to audit what the script does), perform these steps in order:

1. **Bump the dependency** in the instance's `package.json`:
   ```bash
   pnpm add @easy-web/content-blocks@^1.1.0
   ```

2. **Create the `notFound.json` singleton** at `src/content/siteConfig/notFound.json` (or your instance's equivalent `siteConfig` collection path). One entry per supported locale, keyed by locale code:
   ```json
   {
     "de": {
       "image": "/src/assets/images/notfound.png",
       "imageAlt": "Seite nicht gefunden",
       "heading": "Seite nicht gefunden",
       "message": "Die Seite, die Sie suchen, existiert nicht (mehr).",
       "ctaLabel": "Zur Startseite",
       "ctaHref": "/"
     },
     "en": {
       "image": "/src/assets/images/notfound.png",
       "imageAlt": "Page not found",
       "heading": "Page not found",
       "message": "The page you are looking for does not exist (any longer).",
       "ctaLabel": "Back to home",
       "ctaHref": "/en/"
     }
   }
   ```

3. **Register the schema** in `src/content.config.ts` so Astro validates the singleton and Decap CMS can edit it:
   ```ts
   import { defineCollection } from 'astro:content';
   import { notFoundSchema } from '@easy-web/content-blocks/schemas/notFound';

   // extend your existing siteConfig collection schema:
   const siteConfig = defineCollection({
     type: 'data',
     schema: notFoundSchema, // or merged with your other siteConfig fields
   });
   ```

4. **Create thin-shell 404 pages** at `src/pages/404.astro` and `src/pages/<locale>/404.astro` for every locale. Each page imports `NotFound` and passes the locale-specific slice from `notFound.json`:
   ```astro
   ---
   import Base from '../layouts/Base.astro';
   import NotFound from '@easy-web/content-blocks/components/NotFound';
   import { getEntry } from 'astro:content';

   const entry = await getEntry('siteConfig', 'notFound');
   const slice = entry?.data.de; // switch on locale for per-locale pages
   ---
   <Base lang="de" title="Seite nicht gefunden" pathname="/404">
     <NotFound {...slice} />
   </Base>
   ```

5. **Remove any hand-crafted 404 markup** from the old inline `404.astro` — it is now driven by `notFound.json` and re-styled by CMS editors, not by developers.

6. **Wire the `easyWebNotFound()` integration** in `astro.config.mjs` — see the [`easy-web-swa` MIGRATION.md](../easy-web-swa/MIGRATION.md) for the exact steps. That integration manages the corresponding `staticwebapp.config.json` slice; the two upgrades are designed to ship together.

7. **Delete any stale `responseOverrides."404"` entry** from `public/staticwebapp.config.json` (if you host on Azure Static Web Apps). The `easy-web-swa` integration now owns that slot and will overwrite it on every build via the sentinel-merge algorithm — a leftover hand-edited entry is at best redundant and at worst confusing.

### Rollback

If the adoption breaks something and you need to revert:

```bash
# In the instance repo, on the branch where you adopted:
git revert <commit-sha-of-the-adoption-commit>

# Pin back to the previous line:
pnpm add @easy-web/content-blocks@^1.0.0

# Rebuild:
pnpm build
```

The `notFound.json` singleton, the thin-shell `404.astro` pages, the schema registration, and the `easyWebNotFound()` integration are all git-tracked, so `git revert` reproduces the pre-adoption state exactly.

---

## Migrating from v0.6.x to v1.1.0 (breaking changes + additive changes)

**Scope**: crossing the 1.0.0 major boundary tightens one peer dependency; there are no source-level breaking changes to component APIs. If your instance already runs on Astro 6 or 7 the upgrade is effectively a straight bump.

### Breaking changes (0.6.x → 1.0.0)

**1. Astro peer dependency narrowed** — the package now declares `astro >=6.0.0 <8.0.0` (was open-ended `>=6.0.0`). Instances still on Astro 5 or planning to move to Astro 8 must plan accordingly.

Verification:

```bash
pnpm why astro
# expect: astro at 6.x or 7.x
```

If your instance is on Astro 5, upgrade Astro first (see the [Astro upgrade guide](https://docs.astro.build/en/upgrade-astro/)) — that is out of scope for this package.

### Additive changes (0.6.x → 1.0.0)

- **`UniversalMedia` component** — universal image dispatcher that renders from `ImageMetadata`, `/src/assets/*` glob paths, remote URLs, or `/public/*` paths through a single API. See the [README `<UniversalMedia>` section](./README.md#universalmedia) for props and dispatch rules.

### Additive changes (1.0.0 → 1.1.0)

- **`NotFound` component** — brand-conform 404 body driven by the `notFound.json` singleton. Adopted via the steps in the [v1.1.0 section above](#migrating-to-v110-from-v10x).
- **`notFoundSchema` Zod schema** — exported from `@easy-web/content-blocks/schemas/notFound` so instances can register it in their `siteConfig` collection.
- **`@easy-web/i18n` added as a regular dependency** — the `NotFound` component uses the i18n locale utilities. Because it is a normal dependency (not a peer), your package manager installs it automatically; nothing to do on the instance side. `@easy-web/theme-core` is a regular dependency for the same reason.

### Automated

```powershell
# Bump Astro if needed (out of scope for this script), then:
pwsh -File E:\code\it-ci\websites\scripts\migrations\notfound-adopt.ps1 -InstancePath E:\code\it-ci\<your-instance>
```

The script handles the 1.0.0 → 1.1.0 additive adoption. The 0.6 → 1.0 boundary is a straight `pnpm add` once Astro is on a supported range.

### Manual

```bash
# 1. Confirm Astro range
pnpm why astro

# 2. Bump directly from 0.6.x to 1.1.0
pnpm add @easy-web/content-blocks@^1.1.0

# 3. i18n and theme-core arrive as regular dependencies — no separate install needed.
#    Add them explicitly only if your own code imports them directly:
pnpm add @easy-web/i18n@^1.1.0

# 4. Run the v1.1.0 adoption steps from the section above
```

Then follow the [Manual checklist for v1.1.0](#manual) to adopt the shared 404 primitives.

### Rollback

```bash
git revert <commit-sha-of-the-upgrade-commit>
pnpm add @easy-web/content-blocks@^0.6.1
pnpm build
```

---

## See also

- [ADR 0013 — Shared Not-Found Primitives](https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/decisions/0013-shared-not-found-primitives.md) — architecture rationale for the shared 404 pattern.
- [`@easy-web/swa` MIGRATION.md](../easy-web-swa/MIGRATION.md) — companion package that manages the `staticwebapp.config.json` slice.
- [`CHANGELOG.md`](./CHANGELOG.md) — chronological release notes.
- [`README.md`](./README.md) — component reference and quick-start.
