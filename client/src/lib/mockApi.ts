import { QueryFunction } from "@tanstack/react-query";
import {
  demoUser,
  needs,
  requests,
  contracts,
  lettersOfCredit,
  vessels,
  documents,
  entityDocuments,
  documentVotes,
  requestVotes,
  contractVotes,
  vesselLettersOfCredit,
  vesselLoadingPorts,
  shipments,
  finalSettlements,
} from "../mocks";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formDataToObject(data: FormData) {
  return Object.fromEntries(Array.from(data.entries()));
}

function generateId(list: { id: number }[]) {
  return list.length ? Math.max(...list.map((i) => i.id)) + 1 : 1;
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: any,
  data?: unknown,
): Promise<Response> {
  let method: string;
  let url: string;
  let body: any = data;

  if (typeof urlOrData === "object" && urlOrData !== null && "method" in urlOrData) {
    method = (urlOrData.method || "GET").toUpperCase();
    url = methodOrUrl;
    if ("body" in urlOrData) {
      const b = urlOrData.body;
      if (typeof b === "string") {
        try {
          body = JSON.parse(b);
        } catch {
          body = b;
        }
      } else {
        body = b;
      }
    }
  } else {
    method = methodOrUrl.toUpperCase();
    url = urlOrData;
  }

  // Authentication
  if (method === "GET" && url === "/api/auth/user") return jsonResponse(demoUser);
  if (method === "POST" && (url === "/api/login" || url === "/api/register"))
    return jsonResponse(demoUser);
  if (method === "POST" && url === "/api/logout") return jsonResponse({ ok: true });

  // Dashboard stats
  if (method === "GET" && url === "/api/dashboard/stats")
    return jsonResponse({
      needs: needs.length,
      requests: requests.length,
      contracts: contracts.length,
      vessels: vessels.length,
      lettersOfCredit: lettersOfCredit.length,
    });

  // Needs
  if (url === "/api/needs") {
    if (method === "GET") return jsonResponse(needs);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const newNeed = { id: generateId(needs), ...payload } as any;
      needs.push(newNeed);
      return jsonResponse(newNeed, 201);
    }
  }
  let match = url.match(/^\/api\/needs\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = needs.findIndex((n) => n.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        needs[idx] = { ...needs[idx], ...payload } as any;
        return jsonResponse(needs[idx]);
      }
      if (method === "DELETE") {
        needs.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }

  // Requests
  if (url === "/api/requests") {
    if (method === "GET") return jsonResponse(requests);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const newReq = { id: generateId(requests), ...payload } as any;
      requests.push(newReq);
      return jsonResponse(newReq, 201);
    }
  }
  match = url.match(/^\/api\/requests\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = requests.findIndex((r) => r.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        requests[idx] = { ...requests[idx], ...payload } as any;
        return jsonResponse(requests[idx]);
      }
      if (method === "DELETE") {
        requests.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  match = url.match(/^\/api\/requests\/(\d+)\/votes$/);
  if (match) {
    const id = Number(match[1]);
    if (method === "GET") return jsonResponse(requestVotes[id] || []);
    if (method === "POST") {
      const vote = { id: generateId(requestVotes[id] || []), ...(body || {}) } as any;
      requestVotes[id] = [...(requestVotes[id] || []), vote];
      return jsonResponse(vote, 201);
    }
  }

  // Contracts
  if (url === "/api/contracts") {
    if (method === "GET") return jsonResponse(contracts);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const newContract = { id: generateId(contracts), ...payload } as any;
      contracts.push(newContract);
      return jsonResponse(newContract, 201);
    }
  }
  match = url.match(/^\/api\/contracts\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = contracts.findIndex((c) => c.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        contracts[idx] = { ...contracts[idx], ...payload } as any;
        return jsonResponse(contracts[idx]);
      }
      if (method === "DELETE") {
        contracts.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  match = url.match(/^\/api\/contracts\/(\d+)\/votes$/);
  if (match) {
    const id = Number(match[1]);
    if (method === "GET") return jsonResponse(contractVotes[id] || []);
    if (method === "POST") {
      const vote = { id: generateId(contractVotes[id] || []), ...(body || {}) } as any;
      contractVotes[id] = [...(contractVotes[id] || []), vote];
      return jsonResponse(vote, 201);
    }
  }

  // Letters of Credit
  if (url === "/api/letters-of-credit") {
    if (method === "GET") return jsonResponse(lettersOfCredit);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const lc = { id: generateId(lettersOfCredit), ...payload } as any;
      lettersOfCredit.push(lc);
      return jsonResponse(lc, 201);
    }
  }
  match = url.match(/^\/api\/letters-of-credit\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = lettersOfCredit.findIndex((l) => l.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        lettersOfCredit[idx] = { ...lettersOfCredit[idx], ...payload } as any;
        return jsonResponse(lettersOfCredit[idx]);
      }
      if (method === "DELETE") {
        lettersOfCredit.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  match = url.match(/^\/api\/letters-of-credit\/(\d+)\/vessels$/);
  if (match && method === "GET") {
    const lcId = Number(match[1]);
    const vesselsForLc = vessels.filter((v) =>
      (vesselLettersOfCredit[v.id] || []).some((lc) => lc.id === lcId),
    );
    return jsonResponse(vesselsForLc);
  }

  // Vessels
  if (url === "/api/vessels") {
    if (method === "GET") return jsonResponse(vessels);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const vessel = { id: generateId(vessels), ...payload } as any;
      vessels.push(vessel);
      return jsonResponse(vessel, 201);
    }
  }
  match = url.match(/^\/api\/vessels\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = vessels.findIndex((v) => v.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        vessels[idx] = { ...vessels[idx], ...payload } as any;
        return jsonResponse(vessels[idx]);
      }
      if (method === "DELETE") {
        vessels.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  match = url.match(/^\/api\/vessels\/(\d+)\/letters-of-credit$/);
  if (match) {
    const vesselId = Number(match[1]);
    if (method === "GET") return jsonResponse(vesselLettersOfCredit[vesselId] || []);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const lc = { id: generateId(vesselLettersOfCredit[vesselId] || []), ...payload } as any;
      vesselLettersOfCredit[vesselId] = [...(vesselLettersOfCredit[vesselId] || []), lc];
      return jsonResponse(lc, 201);
    }
  }
  match = url.match(/^\/api\/vessels\/(\d+)\/loading-ports$/);
  if (match) {
    const vesselId = Number(match[1]);
    if (method === "GET") return jsonResponse(vesselLoadingPorts[vesselId] || []);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const port = { id: generateId(vesselLoadingPorts[vesselId] || []), ...payload } as any;
      vesselLoadingPorts[vesselId] = [...(vesselLoadingPorts[vesselId] || []), port];
      return jsonResponse(port, 201);
    }
  }
  match = url.match(/^\/api\/vessels\/(\d+)\/documents$/);
  if (match) {
    const vesselId = Number(match[1]);
    const key = `vessel-${vesselId}`;
    if (method === "GET") return jsonResponse(entityDocuments[key] || []);
    if (method === "POST") {
      let fileName = "file";
      if (body instanceof FormData) {
        const file = body.get("document") || body.get("file");
        fileName = (file as File)?.name || fileName;
      } else if (body?.fileName) {
        fileName = body.fileName;
      }
      const doc = { id: generateId(entityDocuments[key] || []), fileName, votes: [] } as any;
      documents.push(doc);
      entityDocuments[key] = [...(entityDocuments[key] || []), doc];
      return jsonResponse(doc, 201);
    }
  }
  match = url.match(/^\/api\/vessels\/(\d+)\/documents\/(\d+)$/);
  if (match && method === "DELETE") {
    const vesselId = Number(match[1]);
    const docId = Number(match[2]);
    const key = `vessel-${vesselId}`;
    entityDocuments[key] = (entityDocuments[key] || []).filter((d) => d.id !== docId);
    const idx = documents.findIndex((d) => d.id === docId);
    if (idx !== -1) documents.splice(idx, 1);
    return jsonResponse({ ok: true });
  }

  // Documents list
  if (method === "GET" && url === "/api/documents") return jsonResponse(documents);

  // Document votes
  match = url.match(/^\/api\/document-votes\/([a-z-]+)\/(\d+)$/);
  if (match && method === "GET") {
    const key = `${match[1]}-${match[2]}`;
    return jsonResponse(entityDocuments[key] || []);
  }
  match = url.match(/^\/api\/document-votes\/(\d+)\/vote$/);
  if (match && method === "POST") {
    const documentId = Number(match[1]);
    const vote = { id: generateId(documentVotes[documentId] || []), ...(body || {}) } as any;
    documentVotes[documentId] = [...(documentVotes[documentId] || []), vote];
    return jsonResponse(vote, 201);
  }
  if (method === "GET" && url === "/api/document-votes") {
    return jsonResponse(documents);
  }

  // Upload document
  if (method === "POST" && url === "/api/upload-document") {
    let fileName = "uploaded-file";
    let entityType = "general";
    let entityId = 0;
    if (body instanceof FormData) {
      const file = body.get("file") as File | null;
      fileName = file?.name || fileName;
      entityType = (body.get("entityType") as string) || entityType;
      entityId = parseInt((body.get("entityId") as string) || "0");
    } else if (body) {
      fileName = body.fileName || fileName;
      entityType = body.entityType || entityType;
      entityId = body.entityId || 0;
    }
    const doc = { id: generateId(documents), fileName, entityType, entityId, votes: [] } as any;
    documents.push(doc);
    const key = `${entityType}-${entityId}`;
    entityDocuments[key] = [...(entityDocuments[key] || []), doc];
    return jsonResponse({ fileName, id: doc.id }, 201);
  }

  // Generic status change
  match = url.match(/^\/api\/([a-z-]+)\/(\d+)\/status$/);
  if (match && method === "PATCH") {
    const entity = match[1];
    const id = Number(match[2]);
    const collections: Record<string, any[]> = {
      "needs": needs,
      "requests": requests,
      "contracts": contracts,
      "vessels": vessels,
      "letters-of-credit": lettersOfCredit,
    };
    const list = collections[entity];
    const item = list?.find((i) => i.id === id);
    if (item) {
      item.status = (body as any)?.status;
      return jsonResponse(item);
    }
  }

  // Shipments
  if (url === "/api/shipments") {
    if (method === "GET") return jsonResponse(shipments);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const shipment = { id: generateId(shipments), ...payload } as any;
      shipments.push(shipment);
      return jsonResponse(shipment, 201);
    }
  }
  match = url.match(/^\/api\/shipments\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = shipments.findIndex((s) => s.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        shipments[idx] = { ...shipments[idx], ...payload } as any;
        return jsonResponse(shipments[idx]);
      }
      if (method === "DELETE") {
        shipments.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }

  // Final settlements
  if (url === "/api/final-settlements") {
    if (method === "GET") return jsonResponse(finalSettlements);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const fs = { id: generateId(finalSettlements), ...payload } as any;
      finalSettlements.push(fs);
      return jsonResponse(fs, 201);
    }
  }
  match = url.match(/^\/api\/final-settlements\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = finalSettlements.findIndex((s) => s.id === id);
    if (idx !== -1 && method === "PUT") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      finalSettlements[idx] = { ...finalSettlements[idx], ...payload } as any;
      return jsonResponse(finalSettlements[idx]);
    }
  }

  return jsonResponse({ ok: true });
}

export const getQueryFn = <T>(
  _options: { on401: "returnNull" | "throw" },
): QueryFunction<T> => async ({ queryKey }) => {
  const parts = (queryKey as any[]).filter(
    (v) => typeof v === "string" || typeof v === "number",
  ) as (string | number)[];
  const url = parts.join("/");
  const params = (queryKey as any[]).find(
    (v) => typeof v === "object" && !Array.isArray(v),
  );
  const res = await apiRequest("GET", url, params);
  return (await res.json()) as T;
};
