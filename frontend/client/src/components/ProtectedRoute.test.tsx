import { describe, expect, it, beforeEach, vi, type MockedFunction } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useUnauthorizedRedirect", () => ({
  useUnauthorizedRedirect: vi.fn(),
}));

import ProtectedRoute, {
  withProtectedRoute,
  useProtectedRouteContext,
} from "./ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseUnauthorizedRedirect =
  useUnauthorizedRedirect as MockedFunction<typeof useUnauthorizedRedirect>;

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading spinner while authentication status is loading", () => {
    const redirectSpy = vi.fn();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
    mockUseUnauthorizedRedirect.mockReturnValue({ redirectToLogin: redirectSpy });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("redirects to login when unauthenticated", () => {
    const redirectSpy = vi.fn();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    mockUseUnauthorizedRedirect.mockImplementation(({ isAuthenticated }) => {
      if (!isAuthenticated) {
        redirectSpy();
      }
      return { redirectToLogin: redirectSpy };
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it("renders the wrapped component when authenticated", () => {
    const redirectSpy = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isLoading: false,
      isAuthenticated: true,
    });
    mockUseUnauthorizedRedirect.mockReturnValue({ redirectToLogin: redirectSpy });

    const ProtectedMessage = () => {
      const { redirectToLogin } = useProtectedRouteContext();
      return (
        <button type="button" onClick={redirectToLogin}>
          Dashboard
        </button>
      );
    };

    const GuardedComponent = withProtectedRoute(ProtectedMessage);

    render(<GuardedComponent />);

    const button = screen.getByRole("button", { name: /dashboard/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });
});
