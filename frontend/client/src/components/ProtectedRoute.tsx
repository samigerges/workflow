import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";

const loadingStyles = "min-h-screen flex items-center justify-center";

type UnauthorizedRedirectOptions = NonNullable<
  Parameters<typeof useUnauthorizedRedirect>[1]
>;

interface ProtectedRouteProps extends Partial<UnauthorizedRedirectOptions> {
  children: ReactNode;
  loadingFallback?: ReactNode;
}

interface ProtectedRouteContextValue {
  redirectToLogin: () => void;
}

const ProtectedRouteContext = createContext<ProtectedRouteContextValue | null>(null);

export function useProtectedRouteContext(): ProtectedRouteContextValue {
  const context = useContext(ProtectedRouteContext);
  if (!context) {
    throw new Error("useProtectedRouteContext must be used within a ProtectedRoute");
  }
  return context;
}

export function ProtectedRoute({
  children,
  loadingFallback,
  redirectTo,
  message,
  title,
  delayMs,
}: PropsWithChildren<ProtectedRouteProps>) {
  const { isAuthenticated, isLoading } = useAuth();
  const redirectOptions = useMemo(
    () => ({ redirectTo, message, title, delayMs }),
    [redirectTo, message, title, delayMs],
  );
  const { redirectToLogin } = useUnauthorizedRedirect(
    { isAuthenticated, isLoading },
    redirectOptions,
  );

  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

    return (
      <div className={loadingStyles}>
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProtectedRouteContext.Provider value={{ redirectToLogin }}>
      {children}
    </ProtectedRouteContext.Provider>
  );
}

export function withProtectedRoute<P>(
  Component: ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">,
): ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `WithProtectedRoute(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}

export default ProtectedRoute;
