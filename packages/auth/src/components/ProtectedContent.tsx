import type { ReactNode } from "react";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

interface ProtectedContentProps {
  /** Content to show when authenticated */
  children: ReactNode;
  /**
   * Content to show when NOT authenticated.
   * Defaults to a "Sign in to access this content" message with a login button.
   */
  fallback?: ReactNode;
  /**
   * Content to show while MSAL is initializing (redirect returning, etc.)
   * Defaults to null (nothing shown while loading)
   */
  loadingFallback?: ReactNode;
}

/**
 * Gate component for client-side auth protection.
 *
 * Shows children only when the user is authenticated.
 * When unauthenticated, shows the fallback (default: a login prompt).
 * When MSAL is in progress (e.g., redirect returning), shows loadingFallback.
 *
 * Works on SWA Free tier — protection is at the data layer (Graph API requires a token).
 * The page HTML is served to everyone; only authenticated users see the actual content.
 *
 * Must be rendered inside an AuthProvider (MsalProvider) tree.
 */
export function ProtectedContent({
  children,
  fallback,
  loadingFallback = null,
}: ProtectedContentProps) {
  const { inProgress } = useMsal();

  // Show loading state while MSAL is handling a redirect or startup
  if (inProgress !== InteractionStatus.None) {
    return <>{loadingFallback}</>;
  }

  return (
    <>
      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        {fallback ?? <DefaultLoginFallback />}
      </UnauthenticatedTemplate>
    </>
  );
}

function DefaultLoginFallback() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect({ scopes: ["openid", "profile", "User.Read"] });
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        textAlign: "center",
        border: "1px solid var(--ew-border, #e5e7eb)",
        borderRadius: "0.5rem",
      }}
    >
      <p style={{ marginBottom: "1rem", color: "var(--ew-text, #374151)" }}>
        Sign in to access this content.
      </p>
      <button
        type="button"
        onClick={handleLogin}
        style={{
          padding: "0.5rem 1.25rem",
          backgroundColor: "var(--ew-primary, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        Sign in
      </button>
    </div>
  );
}
