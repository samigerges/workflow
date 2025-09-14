import { QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const CSRF_HEADER = "X-CSRF-TOKEN";
const CSRF_COOKIE = "X-CSRF-TOKEN";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${CSRF_COOKIE}=`))
      ?.split("=")[1] ?? null
  );
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const target = `${API_BASE_URL}${url}`;
  const init: RequestInit = {
    method,
    credentials: "include",
  };
  if (data instanceof FormData) {
    init.body = data;
  } else if (data !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(data);
  }
  const token = getCsrfToken();
  if (!init.headers) init.headers = {};
  if (token) (init.headers as Record<string, string>)[CSRF_HEADER] = token;
  const res = await fetch(target, init);

  // Let callers inspect response.ok and handle errors themselves
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const target = `${API_BASE_URL}${queryKey[0] as string}`;
    const headers: HeadersInit = {};
    const token = getCsrfToken();
    if (token) headers[CSRF_HEADER] = token;
    const res = await fetch(target, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
