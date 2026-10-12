# @itci/easy-web-auth

## 1.6.0

### Minor Changes

- 91878a0: Add the building blocks for generating a complete site with `easy-web create`. All changes are additive, existing exports are unchanged.

  `@easy-web/core` now ships a capability recipe system. A recipe describes what a feature needs and what it provides, and a deterministic resolver turns a set of requested capabilities into an ordered graph. The graph can be exported as stable JSON or as a Mermaid diagram, so the same input always yields the same output. The new entry points are `@easy-web/core/recipes`, `@easy-web/core/recipes/schema` and `@easy-web/core/recipes/registry`.

  Core also gains:
  - Create-time localization and formatting contracts in `@easy-web/core/i18n`, covering locale parsing, format contexts and explicit date, number and currency formatters.
  - Generic content traits and presentation bindings, so a content type can be composed from reusable traits and bound to a visual block.
  - Demo content and legal page generators in `@easy-web/core/demo`.
  - A `site.shell` recipe that generates the Astro and package configuration, base layout, header, footer, navigation, fixed pages, localized paths, 404 page, SEO setup, Static Web Apps config, theme and brand files, and robots and sitemap output. Generated sites target Astro 7 and include the pnpm 11 build-script allowance they need.

  `@easy-web/auth` adds an `auth.single-island` recipe (`@easy-web/auth/recipe`). It generates a Microsoft sign-in mount that lives in exactly one React island, and checks that rule before output is written.

  `@easy-web/cms-adapters` adds a `cms.decap-media` recipe. It generates typed content definitions, the Decap configuration and admin page, and paired source and public media folders with bounded preview copies.

### Patch Changes

- Updated dependencies [91878a0]
  - @easy-web/core@1.6.0

## 1.5.0

## 1.4.1

## 1.4.0

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

## 1.2.3

## 1.2.2

## 1.2.1

## 1.2.0

## 1.1.0

## 1.0.0

## 0.1.1

### Fixes

- Exclude `__tests__` from the published `dist` (test files should not ship to consumers)
- Replace production-tenant IDs in test assertions with structural checks

### Maintenance

- Wire up the barrel `src/index.ts` exporting `AuthProvider`, `useAuth`, `LoginButton`, `UserAvatar`, `ProtectedContent`, the Graph helpers, the SharePoint hooks, and the SharePoint UI components
- Add `exports` map to `package.json` for deep imports (`./components/*`, `./hooks/*`, `./graph/*`)
- Add `publishConfig` pointing at the `websites` Azure Artifacts feed

## 0.1.0

### Features

- `<AuthProvider>` — MSAL.js wrapper using `useRef` singleton to guarantee one `PublicClientApplication` per React root
- `useAuth` hook — returns `{ login, logout, isAuthenticated, user, inProgress }`
- `<LoginButton>` — sign-in / sign-out button with `InteractionStatus` awareness
- `<UserAvatar>` — user-initials avatar
- `<ProtectedContent>` — gate component using MSAL `AuthenticatedTemplate` / `UnauthenticatedTemplate`
- `buildMsalConfig` helper — builds a `PublicClientApplication` configuration from a per-site `AuthConfig`
- Microsoft Graph integration — `createGraphClient` wrapping `@microsoft/microsoft-graph-client`
- SharePoint helpers — `getSite`, `getListItems`, `getDocumentLibraryFiles`, `getFileContent`, `getImageThumbnails`
- SharePoint React hooks — `useGraphClient`, `useSharePointList`, `useSharePointFiles`
- SharePoint UI components — `<SharePointGallery>`, `<SharePointFileList>`, `<SharePointListView>`
- `DEFAULT_SCOPES` / `LOGIN_SCOPES` constants

### Peer dependencies

- `react >= 18.0.0`
- `react-dom >= 18.0.0`

### Documented constraints

- All auth-consuming React components on a given page MUST live inside a single React island wrapping `<AuthProvider>`. React Context does not cross Astro island boundaries.
