import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseUnauthorizedRedirectOptions {
  /** Optional override for the destination after redirect */
  redirectTo?: string;
  /** Message that is shown inside the toast notification */
  message?: string;
  /** Title that is shown inside the toast notification */
  title?: string;
  /** Delay before triggering the redirect (ms) */
  delayMs?: number;
}

interface UseUnauthorizedRedirectArgs {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useUnauthorizedRedirect(
  { isAuthenticated, isLoading }: UseUnauthorizedRedirectArgs,
  {
    redirectTo = "/login",
    message = "You are logged out. Logging in again...",
    title = "Unauthorized",
    delayMs = 500,
  }: UseUnauthorizedRedirectOptions = {},
) {
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const redirectToLogin = useCallback(() => {
    toast({
      title,
      description: message,
      variant: "destructive",
    });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      window.location.href = redirectTo;
    }, delayMs);
  }, [delayMs, message, redirectTo, title, toast]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirectToLogin();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, isLoading, redirectToLogin]);

  return { redirectToLogin };
}
