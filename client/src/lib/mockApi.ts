import { QueryFunction } from "@tanstack/react-query";
import { needs, requests, contracts } from "../mocks";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  if (method === "GET" && url === "/api/needs") return jsonResponse(needs);
  if (method === "GET" && url === "/api/requests") return jsonResponse(requests);
  if (method === "GET" && url === "/api/contracts") return jsonResponse(contracts);
  return jsonResponse({ ok: true });
}

export const getQueryFn = <T>(
  _options: { on401: "returnNull" | "throw" },
): QueryFunction<T> =>
  async ({ queryKey }) => {
    const res = await apiRequest("GET", queryKey[0] as string);
    return (await res.json()) as T;
  };
