import { useAuth } from "../hooks/useAuth";

interface UserAvatarProps {
  /** Avatar circle size in pixels (default: 32) */
  size?: number;
  /** Optional CSS class(es) */
  className?: string;
}

/**
 * Displays user initials in a circle when authenticated.
 * Renders nothing when unauthenticated.
 */
export function UserAvatar({ size = 32, className }: UserAvatarProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user?.name) {
    return null;
  }

  // Extract initials: first char of first + last word
  const words = user.name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : words[0].slice(0, 2).toUpperCase();

  return (
    <span
      className={className}
      title={user.name}
      aria-label={`${user.name} (signed in)`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "var(--ew-primary, #6366f1)",
        color: "#fff",
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        userSelect: "none",
      }}
    >
      {initials}
    </span>
  );
}
