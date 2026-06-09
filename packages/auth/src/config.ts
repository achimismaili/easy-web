/**
 * Per-instance authentication configuration.
 * Provided by the consuming site (e.g., from siteConfig.auth).
 * The @itci/easy-web-auth package NEVER reads siteConfig directly.
 */
export interface AuthConfig {
  /** Entra app registration client ID for this site instance */
  clientId: string;
  /** IT-CI tenant ID */
  tenantId: string;
  /** Redirect URI after login. Defaults to window.location.origin at runtime. */
  redirectUri?: string;
  /** Override default scopes for token acquisition. */
  scopes?: string[];
}
