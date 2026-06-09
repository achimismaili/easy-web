import {
  type Configuration,
  BrowserCacheLocation,
  LogLevel,
} from "@azure/msal-browser";
import type { AuthConfig } from "./config";

/**
 * Builds an MSAL PublicClientApplication Configuration from an AuthConfig.
 * Never called during SSR — only runs in the browser (inside client:only components).
 */
export function buildMsalConfig(config: AuthConfig): Configuration {
  const redirectUri =
    config.redirectUri ??
    (typeof window !== "undefined" ? window.location.origin : "/");

  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri,
      postLogoutRedirectUri: redirectUri,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        loggerCallback: (level, message, containsPii) => {
          const nodeEnv = (globalThis as {
            process?: { env?: { NODE_ENV?: string } };
          }).process?.env?.NODE_ENV;
          if (!containsPii && nodeEnv === "development") {
            console.warn(`[MSAL] ${message}`);
          }
        },
        piiLoggingEnabled: false,
      },
    },
  };
}
