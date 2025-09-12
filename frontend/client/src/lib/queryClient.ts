import { QueryClient } from "@tanstack/react-query";
import { apiRequest as realApiRequest, getQueryFn as realGetQueryFn } from "./api";
import { apiRequest as mockApiRequest, getQueryFn as mockGetQueryFn } from "./mockApi";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
const defaultStaleTime =
  Number(import.meta.env.VITE_QUERY_STALE_TIME) || 5 * 60 * 1000;

export const apiRequest = useMock ? mockApiRequest : realApiRequest;
export const getQueryFn = useMock ? mockGetQueryFn : realGetQueryFn;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: defaultStaleTime,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
