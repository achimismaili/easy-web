import { Client } from "@microsoft/microsoft-graph-client";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";
import { InteractionType, type IPublicClientApplication, type PublicClientApplication, type AccountInfo } from "@azure/msal-browser";
import { DEFAULT_SCOPES } from "../scopes";

/**
 * Creates a Microsoft Graph client authenticated via MSAL.
 * Uses AuthCodeMSALBrowserAuthenticationProvider — the official MSAL+Graph bridge.
 * Only call this from within a React component inside AuthProvider.
 */
export function createGraphClient(
  msalInstance: IPublicClientApplication,
  account: AccountInfo,
  scopes: string[] = [...DEFAULT_SCOPES]
): Client {
  const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(
    msalInstance as PublicClientApplication,
    {
      account,
      scopes,
      interactionType: InteractionType.Redirect,
    }
  );

  return Client.initWithMiddleware({ authProvider });
}
