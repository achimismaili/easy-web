// @achimismaili/easy-web-auth — public API barrel

// Core
export { AuthProvider } from "./components/AuthProvider";
export { buildMsalConfig } from "./msalConfig";
export type { AuthConfig } from "./config";
export { DEFAULT_SCOPES, LOGIN_SCOPES } from "./scopes";
export type { DefaultScope, LoginScope } from "./scopes";

// Auth hooks
export { useAuth } from "./hooks/useAuth";
export type { AuthUser, UseAuthReturn } from "./hooks/useAuth";

// Graph hooks
export { useGraphClient } from "./hooks/useGraphClient";
export type { UseGraphClientReturn } from "./hooks/useGraphClient";
export { useSharePointList } from "./hooks/useSharePointList";
export type { UseSharePointListReturn } from "./hooks/useSharePointList";
export { useSharePointFiles } from "./hooks/useSharePointFiles";
export type { UseSharePointFilesReturn } from "./hooks/useSharePointFiles";

// UI Components
export { LoginButton } from "./components/LoginButton";
export { UserAvatar } from "./components/UserAvatar";
export { ProtectedContent } from "./components/ProtectedContent";
export { SharePointGallery } from "./components/SharePointGallery";
export { SharePointFileList } from "./components/SharePointFileList";
export { SharePointListView } from "./components/SharePointListView";

// Graph utilities
export { createGraphClient } from "./graph/client";
export {
  getSite,
  getListItems,
  getDocumentLibraryFiles,
  getFileContent,
  getImageThumbnails,
} from "./graph/sharepoint";
export type {
  SpSite,
  SpListItem,
  SpDriveItem,
  SpThumbnail,
} from "./graph/sharepoint";
