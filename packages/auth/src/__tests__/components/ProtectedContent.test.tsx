import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectedContent } from "../../components/ProtectedContent";

const { mockUseMsal, mockUseIsAuthenticated } = vi.hoisted(() => ({
  mockUseMsal: vi.fn(),
  mockUseIsAuthenticated: vi.fn(),
}));

vi.mock("@azure/msal-react", () => ({
  useMsal: mockUseMsal,
  useIsAuthenticated: mockUseIsAuthenticated,
  useAccount: vi.fn(),
  AuthenticatedTemplate: ({ children }: { children: React.ReactNode }) => {
    const isAuth = mockUseIsAuthenticated();
    return isAuth ? <>{children}</> : null;
  },
  UnauthenticatedTemplate: ({ children }: { children: React.ReactNode }) => {
    const isAuth = mockUseIsAuthenticated();
    return !isAuth ? <>{children}</> : null;
  },
}));

vi.mock("@azure/msal-browser", () => ({
  InteractionStatus: { None: "none", Login: "login" },
}));

describe("ProtectedContent", () => {
  it("shows children when authenticated", () => {
    mockUseIsAuthenticated.mockReturnValue(true);
    mockUseMsal.mockReturnValue({
      instance: { loginRedirect: vi.fn() },
      accounts: [{ name: "User" }],
      inProgress: "none",
    });

    render(
      <ProtectedContent>
        <p>Secret content</p>
      </ProtectedContent>,
    );

    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });

  it("hides children when NOT authenticated", () => {
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseMsal.mockReturnValue({
      instance: { loginRedirect: vi.fn() },
      accounts: [],
      inProgress: "none",
    });

    render(
      <ProtectedContent>
        <p>Secret content</p>
      </ProtectedContent>,
    );

    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("shows custom fallback when unauthenticated", () => {
    mockUseIsAuthenticated.mockReturnValue(false);
    mockUseMsal.mockReturnValue({
      instance: { loginRedirect: vi.fn() },
      accounts: [],
      inProgress: "none",
    });

    render(
      <ProtectedContent fallback={<p>Please log in</p>}>
        <p>Secret</p>
      </ProtectedContent>,
    );

    expect(screen.getByText("Please log in")).toBeInTheDocument();
  });
});
