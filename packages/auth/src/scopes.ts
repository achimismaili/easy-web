/**
 * Default Graph API delegated scopes for SharePoint access.
 * All three are registered on the Entra app registrations with admin consent.
 */
export const DEFAULT_SCOPES = [
  "User.Read",
  "Sites.Read.All",
  "Files.Read.All",
] as const;

/**
 * Scopes used during the login redirect flow.
 * Minimal set to identify the user; token for data is acquired separately.
 */
export const LOGIN_SCOPES = ["openid", "profile", "User.Read"] as const;

export type DefaultScope = (typeof DEFAULT_SCOPES)[number];
export type LoginScope = (typeof LOGIN_SCOPES)[number];
