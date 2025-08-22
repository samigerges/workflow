import { QueryClient } from "@tanstack/react-query";
import { apiRequest as realApiRequest, getQueryFn as realGetQueryFn } from "./api";
import { apiRequest as mockApiRequest, getQueryFn as mockGetQueryFn } from "./mockApi";

const useMock = true;

export const apiRequest = useMock ? mockApiRequest : realApiRequest;
export const getQueryFn = useMock ? mockGetQueryFn : realGetQueryFn;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
