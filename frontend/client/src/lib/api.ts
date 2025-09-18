import { QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function joinBaseUrl(path: string) {
  if (!API_BASE_URL) {
    return path;
  }

  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    const trimmedBase = API_BASE_URL.replace(/\/+$/, "");
    if (!path) {
      return trimmedBase;
    }

    const trimmedPath = path.replace(/^\/+/, "");
    if (!trimmedPath) {
      return trimmedBase;
    }

    return `${trimmedBase}/${trimmedPath}`;
  }
}

type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | QueryParamValue[];

function appendSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: QueryParamValue,
) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendSearchParam(searchParams, key, item));
    return;
  }

  const normalizedValue =
    value instanceof Date ? value.toISOString() : String(value);
  searchParams.append(key, normalizedValue);
}

function buildUrlFromQueryKey(queryKey: readonly unknown[]) {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    throw new Error("Query key must be a non-empty array");
  }

  const [first, ...rest] = queryKey;
  const basePath = String(first ?? "");
  const pathSegments: string[] = [];
  const searchParams = new URLSearchParams();

  rest.forEach((part) => {
    if (part === null || part === undefined) {
      return;
    }

    if (typeof part === "object" && !Array.isArray(part)) {
      Object.entries(part as Record<string, QueryParamValue>).forEach(
        ([key, value]) => {
          appendSearchParam(searchParams, key, value);
        },
      );
      return;
    }

    pathSegments.push(encodeURIComponent(String(part)));
  });

  let url = basePath;
  if (pathSegments.length) {
    const separator = url.endsWith("/") ? "" : "/";
    url = `${url}${separator}${pathSegments.join("/")}`;
  }

  const queryString = searchParams.toString();
  if (queryString) {
    const joinChar = url.includes("?") ? "&" : "?";
    url = `${url}${joinChar}${queryString}`;
  }

  return joinBaseUrl(url);
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
  const target = joinBaseUrl(String(url));
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
  const res = await fetch(target, init);

  // Throw on non-OK responses so mutations don't resolve on failure
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const target = buildUrlFromQueryKey(queryKey);
    const res = await fetch(target, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
