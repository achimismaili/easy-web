# @itci/easy-web-auth

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

- All auth-consuming React components on a given page MUST live inside a single React island wrapping `<AuthProvider>`. React Context does not cross Astro island boundaries. See [ADR 0010](https://dev.azure.com/IT-CI/WebSites/_git/WebSites?path=/docs/decisions/0010-react-auth-single-island.md).
