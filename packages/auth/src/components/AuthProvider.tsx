import { useMemo, useRef, type ReactNode } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { buildMsalConfig } from "../msalConfig";
import type { AuthConfig } from "../config";

interface AuthProviderProps {
  config: AuthConfig;
  children: ReactNode;
}

/**
 * Root authentication provider. Wrap ALL auth-dependent UI inside this component.
 *
 * CRITICAL ASTRO CONSTRAINT:
 * React context does NOT cross Astro island boundaries. All components that use
 * useAuth(), useMsal(), ProtectedContent, LoginButton, etc. must be children of
 * the SAME AuthProvider React tree — rendered in a single `client:only="react"` island.
 *
 * Usage in Astro:
 *   <AuthShell client:only="react" config={siteConfig.auth} />
 *   where AuthShell renders <AuthProvider config={config}>...</AuthProvider>
 */
export function AuthProvider({ config, children }: AuthProviderProps) {
  // Singleton ref — one PCA instance per client ID, shared across re-renders
  const instanceRef = useRef<PublicClientApplication | null>(null);

  const msalInstance = useMemo(() => {
    if (!instanceRef.current) {
      instanceRef.current = new PublicClientApplication(buildMsalConfig(config));
    }
    return instanceRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.clientId, config.tenantId]);

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
