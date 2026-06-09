import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginButton } from "../../components/LoginButton";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@azure/msal-browser", () => ({
  InteractionStatus: {
    None: "none",
    Login: "login",
    Logout: "logout",
    AcquireToken: "acquireToken",
    HandleRedirect: "handleRedirect",
    SsoSilent: "ssoSilent",
    Startup: "startup",
  },
}));

function setupMocks(isAuthenticated: boolean) {
  mockUseAuth.mockReturnValue({
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated,
    user: isAuthenticated
      ? { name: "Test User", email: "test@example.com", id: "123" }
      : null,
    inProgress: "none",
  });
}

describe("LoginButton", () => {
  it('renders "Sign in" when unauthenticated', () => {
    setupMocks(false);
    render(<LoginButton />);
    expect(screen.getByRole("button")).toHaveTextContent("Sign in");
  });

  it('renders "Sign out" when authenticated', () => {
    setupMocks(true);
    render(<LoginButton />);
    expect(screen.getByRole("button")).toHaveTextContent("Sign out");
  });

  it("accepts custom sign-in and sign-out text", () => {
    setupMocks(false);
    render(<LoginButton signInText="Log in" signOutText="Log out" />);
    expect(screen.getByRole("button")).toHaveTextContent("Log in");
  });

  it("renders a button element", () => {
    setupMocks(false);
    render(<LoginButton />);
    const btn = screen.getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
  });
});
