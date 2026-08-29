# Migration Guide — @easy-web/swa

Adoption paths for the shared Azure Static Web Apps integration. Each section provides an **Automated** path (recommended), a **Manual** checklist (for auditing what the script does), and a **Rollback** procedure.

The sentinel-merge architecture and the "why not just template `staticwebapp.config.json`" rationale live in [ADR 0013 — Shared Not-Found Primitives](https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md). This guide does not repeat that rationale — read the ADR first if you need the "why".

---

## Adopting v0.1.0

**Scope**: first release of the `easyWebNotFound()` Astro integration. It writes a sentinel-marked slice into `dist/staticwebapp.config.json` on every build so shared 404 handling works consistently on Azure SWA across all instances. The integration is safe to adopt on any Astro 6 or 7 project; single-locale and multi-locale instances both supported.

**Companion package**: pair this adoption with [`@easy-web/content-blocks@^1.1.0`](../easy-web-content-blocks/MIGRATION.md), which ships the `NotFound` component the 404 page renders. The two are designed to adopt together.

### The sentinel contract (read before hand-editing anything)

> **Do NOT hand-edit `responseOverrides."404"` or sentinel-tracked route entries in `staticwebapp.config.json` — they are managed by the integration and will be overwritten on every build.**

The integration writes a `$easyWebManaged` sentinel into `dist/staticwebapp.config.json` that lists exactly which top-level keys and which `routes[]` indices it owns. Everything else in the file — `auth`, `globalHeaders`, `navigationFallback`, and every non-managed route — is preserved verbatim across builds. Hand-editing a sentinel-tracked slot is a losing race with the next `pnpm build`: your edit will be replaced by the integration's output.

If you need to override the 404 slot, add your entry to `public/staticwebapp.config.json` **before** the integration runs. The `additive` merge path detects a pre-existing `responseOverrides."404"` and yields — the user override wins and the integration will not manage that slot (a warning is logged).

### Automated

Run the migration script from the `websites` meta-repo — it installs the package, registers the integration in `astro.config.mjs`, and cleans stale `staticwebapp.config.json` slots:

```powershell
pwsh -File E:\code\it-ci\websites\scripts\migrations\notfound-adopt.ps1 -InstancePath E:\code\it-ci\<your-instance>
```

The script performs every step in the manual checklist below.

### Manual

If you prefer to adopt by hand (or need to audit what the script does), perform these steps in order:

1. **Install the package** in the instance:
   ```bash
   pnpm add @easy-web/swa@^0.1.0
   ```

2. **Register the integration** in `astro.config.mjs`:
   ```js
   import { defineConfig } from 'astro/config';
   import { easyWebNotFound } from '@easy-web/swa';

   export default defineConfig({
     // ... your existing config (site, i18n, etc.) ...
     integrations: [
       // ... existing integrations ...
       easyWebNotFound(), // easy-web-swa: manages the sentinel-marked 404 slice
     ],
   });
   ```

   The integration reads `config.i18n.defaultLocale` and `config.i18n.locales` automatically. If your instance has no Astro `i18n` config, or if you need to override the derived values (e.g. partial locale rollout), pass explicit options:

   ```js
   easyWebNotFound({ defaultLocale: 'de', locales: ['de', 'en'] })
   ```

3. **Rebuild** so the integration writes its slice into `dist/staticwebapp.config.json`:
   ```bash
   pnpm build
   ```

   On completion, `dist/staticwebapp.config.json` will contain:
   - `responseOverrides."404" = { rewrite: '/404.html', statusCode: 404 }`
   - one `routes[]` entry per non-default locale rewriting `/{locale}/*` → `/{locale}/404/index.html`
   - a `$easyWebManaged` sentinel listing the managed keys and route indices

4. **Remove stale hand-crafted entries** from `public/staticwebapp.config.json`:
   - Delete any hand-crafted `responseOverrides."404"` block — the integration now owns that slot.
   - Delete any `routes[]` entries that rewrite `/{locale}/*` to a 404 page — the integration owns those too (the `additive` merge path will warn on next build if a duplicate remains).
   - Keep everything else (`auth`, `globalHeaders`, `navigationFallback`, and non-404 routes) untouched — the integration preserves them verbatim.

5. **Rebuild once more** to confirm the integration produces a clean output with no duplicate-route warnings in the build log.

### Rollback

If the integration breaks something and you need to revert:

```bash
# In the instance repo, on the branch where you adopted:

# 1. Remove the easyWebNotFound() call from astro.config.mjs (and the import).
#    Then commit that edit.

# 2. Uninstall the package:
pnpm remove @easy-web/swa

# 3. Revert the staticwebapp.config.json changes:
git revert <commit-sha-of-the-staticwebapp-config-cleanup-commit>

# 4. If you deleted an old hand-crafted responseOverrides."404" during adoption,
#    restore it from that git-reverted state — or re-add it manually.

# 5. Rebuild:
pnpm build
```

The integration writes only to `dist/staticwebapp.config.json` (build output, not tracked); the source-side changes are the `astro.config.mjs` edit and any `public/staticwebapp.config.json` cleanup. Both are git-tracked, so `git revert` reproduces the pre-adoption state exactly.

---

## See also

- [ADR 0013 — Shared Not-Found Primitives](https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md) — architecture rationale, sentinel-merge algorithm, and preservation contract.
- [`@easy-web/content-blocks` MIGRATION.md](../easy-web-content-blocks/MIGRATION.md) — companion package that ships the `NotFound` component and `notFoundSchema`.
- [`CHANGELOG.md`](./CHANGELOG.md) — chronological release notes.
- [`README.md`](./README.md) — integration API and options reference.
