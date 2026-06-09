import { useCallback } from "react";
import {
  useMsal,
  useIsAuthenticated,
  useAccount,
} from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { LOGIN_SCOPES } from "../scopes";

export interface AuthUser {
  name: string | null;
  email: string | null;
  id: string | null;
}

export interface UseAuthReturn {
  /** Initiate redirect-based login */
  login: () => Promise<void>;
  /** Initiate redirect-based logout */
  logout: () => Promise<void>;
  /** True when user has an active session */
  isAuthenticated: boolean;
  /** Current user info (null when unauthenticated) */
  user: AuthUser | null;
  /** MSAL interaction in-progress status — gate token calls on InteractionStatus.None */
  inProgress: InteractionStatus;
}

/**
 * Primary hook for authentication state and actions.
 * Must be used inside an AuthProvider (MsalProvider) tree.
 */
export function useAuth(): UseAuthReturn {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] ?? {});

  const login = useCallback(async () => {
    await instance.loginRedirect({ scopes: [...LOGIN_SCOPES] });
  }, [instance]);

  const logout = useCallback(async () => {
    await instance.logoutRedirect({
      account: instance.getActiveAccount() ?? accounts[0],
    });
  }, [instance, accounts]);

  const user: AuthUser | null = account
    ? {
        name: account.name ?? null,
        email: account.username ?? null,
        id: account.localAccountId ?? null,
      }
    : null;

  return { login, logout, isAuthenticated, user, inProgress };
}
