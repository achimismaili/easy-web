import { useAuth } from "../hooks/useAuth";
import { InteractionStatus } from "@azure/msal-browser";

interface LoginButtonProps {
  /** Optional CSS class(es) to apply to the button */
  className?: string;
  /** Text when user is not authenticated (default: "Sign in") */
  signInText?: string;
  /** Text when user is authenticated (default: "Sign out") */
  signOutText?: string;
}

/**
 * Button that initiates MSAL redirect login or logout.
 * Renders "Sign in" when unauthenticated, "Sign out" when authenticated.
 * Disabled during MSAL interaction in progress.
 */
export function LoginButton({
  className,
  signInText = "Sign in",
  signOutText = "Sign out",
}: LoginButtonProps) {
  const { login, logout, isAuthenticated, inProgress } = useAuth();
  const isLoading = inProgress !== InteractionStatus.None;

  return (
    <button
      type="button"
      className={className}
      onClick={isAuthenticated ? logout : login}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? "..." : isAuthenticated ? signOutText : signInText}
    </button>
  );
}
