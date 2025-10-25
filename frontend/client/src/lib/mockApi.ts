import { QueryFunction } from "@tanstack/react-query";
import {
  demoUser,
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
  serviceProviders,
  lcSupplierAllocations,
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

function generateId(list: { id: any }[]) {
  return list.length ? Math.max(...list.map((i) => Number(i.id))) + 1 : 1;
}

type ServiceProviderPriceEntry = {
  id: number;
  amount: number;
  currency: string;
  recordedAt: string;
  unit?: string | null;
  notes?: string | null;
};

type ServiceProviderRecord = {
  id: number;
  type: string;
  name: string;
  priceHistory: ServiceProviderPriceEntry[];
  [key: string]: any;
};

const serviceProviderStore = serviceProviders as ServiceProviderRecord[];

type StageEntryRecord = {
  id: number;
  stageId: string;
  numberValue: string;
  updatedAt: string;
};

const vesselStageEntriesStore: Record<number, StageEntryRecord[]> = {};

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeToStringArray(value: unknown) {
  if (!value && value !== 0) {
    return [] as string[];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : item != null ? String(item) : "",
      )
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [String(value)];
}

function normalizeStageIdentifier(value: unknown) {
  if (typeof value !== "string") {
    value = value == null ? "" : String(value);
  }

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePriceHistory(
  input: unknown,
  existing: ServiceProviderPriceEntry[] = [],
) {
  if (
    input === undefined ||
    input === null ||
    (typeof input === "string" && input.trim().length === 0)
  ) {
    return undefined;
  }

  const parsed = parseMaybeJson(input);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const history: ServiceProviderPriceEntry[] = [];
  let nextId = existing.length
    ? Math.max(...existing.map((entry) => Number(entry.id) || 0))
    : 0;

  values.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const raw = item as Record<string, any>;
    const amountRaw =
      typeof raw.amount === "number"
        ? raw.amount
        : Number(raw.amount ?? raw.rate ?? raw.value ?? NaN);

    if (!Number.isFinite(amountRaw)) {
      return;
    }

    const currencyRaw = raw.currency ?? raw.currencyCode ?? raw.curr ?? raw.ccy;
    const currency =
      typeof currencyRaw === "string" && currencyRaw.trim().length
        ? currencyRaw.trim().toUpperCase()
        : "USD";

    let recordedAt =
      raw.recordedAt ?? raw.timestamp ?? raw.date ?? raw.effectiveDate ?? raw.validFrom;
    if (recordedAt instanceof Date) {
      recordedAt = recordedAt.toISOString();
    } else if (typeof recordedAt === "number") {
      recordedAt = new Date(recordedAt).toISOString();
    } else if (typeof recordedAt === "string") {
      const parsedDate = new Date(recordedAt);
      recordedAt = Number.isNaN(parsedDate.getTime())
        ? recordedAt
        : parsedDate.toISOString();
    } else {
      recordedAt = new Date().toISOString();
    }

    const unit =
      typeof raw.unit === "string" && raw.unit.trim().length
        ? raw.unit.trim()
        : raw.unit ?? null;
    const notes =
      typeof raw.notes === "string" && raw.notes.trim().length
        ? raw.notes.trim()
        : typeof raw.remarks === "string" && raw.remarks.trim().length
          ? raw.remarks.trim()
          : raw.remarks ?? null;

    const idValue = raw.id ?? raw.priceId ?? raw.entryId;
    const id =
      idValue !== undefined && idValue !== null && !Number.isNaN(Number(idValue))
        ? Number(idValue)
        : ++nextId;

    history.push({
      id,
      amount: Number(amountRaw),
      currency,
      recordedAt,
      unit: unit ?? null,
      notes: notes ?? null,
    });
  });

  return history;
}

function normalizeSinglePriceEntry(
  payload: any,
  existingEntries: ServiceProviderPriceEntry[] = [],
  existingEntry?: ServiceProviderPriceEntry,
) {
  if (!payload && !existingEntry) {
    return null;
  }

  const candidate = existingEntry
    ? { ...existingEntry, ...payload, id: existingEntry.id }
    : payload;
  const normalized = normalizePriceHistory(candidate, existingEntries);
  if (!normalized || normalized.length === 0) {
    return null;
  }

  const [entry] = normalized;
  if (existingEntry) {
    entry.id = existingEntry.id;
  }

  return entry;
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeSupplierAllocationPayload(payload: Record<string, any>, existing: Record<string, any> = {}) {
  const supplierNameRaw =
    payload.supplierName ?? payload.name ?? existing.supplierName ?? existing.name ?? "";
  const supplierName = typeof supplierNameRaw === "string" ? supplierNameRaw.trim() : String(supplierNameRaw ?? "");

  const quantity =
    coerceNumber(payload.quantity ?? payload.allocationQuantity ?? payload.allocatedQuantity) ??
    (existing.quantity ?? existing.allocationQuantity ?? null);
  const percentage =
    coerceNumber(payload.percentage ?? payload.allocationPercentage ?? payload.percent) ??
    (existing.percentage ?? existing.allocationPercentage ?? null);
  const amount =
    coerceNumber(payload.amount ?? payload.allocationAmount) ??
    (existing.amount ?? existing.allocationAmount ?? null);

  const supplierId = payload.supplierId ?? existing.supplierId ?? null;

  return {
    supplierId,
    supplierName,
    quantity,
    allocationQuantity: quantity,
    percentage,
    allocationPercentage: percentage,
    amount,
    allocationAmount: amount,
  };
}

function parseQueryParams(rawUrl: string, fallback?: unknown) {
  const result: Record<string, any> = {};

  try {
    const url = new URL(rawUrl, "http://mock.local");
    url.searchParams.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const current = result[key];
        if (Array.isArray(current)) {
          current.push(value);
        } else {
          result[key] = [current, value];
        }
      } else {
        result[key] = value;
      }
    });
  } catch {
    // Ignore URL parsing issues for relative paths without query strings
  }

  if (fallback && typeof fallback === "object" && !(fallback instanceof FormData)) {
    Object.assign(result, fallback as Record<string, any>);
  }

  return result;
}

function computePriceSummary(priceHistory: ServiceProviderPriceEntry[]) {
  const averageByCurrency: Record<string, number> = {};
  const lastByCurrency: Record<string, ServiceProviderPriceEntry | null> = {};
  const grouped = new Map<string, ServiceProviderPriceEntry[]>();

  priceHistory.forEach((entry) => {
    if (!entry || !entry.currency) {
      return;
    }

    const currency = entry.currency.toUpperCase();
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount)) {
      return;
    }

    const normalizedEntry = { ...entry, currency, amount };
    if (!grouped.has(currency)) {
      grouped.set(currency, []);
    }
    grouped.get(currency)!.push(normalizedEntry);
  });

  grouped.forEach((entries, currency) => {
    const sum = entries.reduce((acc, item) => acc + Number(item.amount), 0);
    const avg = entries.length ? sum / entries.length : 0;
    averageByCurrency[currency] = Number(avg.toFixed(2));

    let lastEntry = entries[0];
    let lastTimestamp = Date.parse(lastEntry.recordedAt ?? "");

    entries.forEach((entry) => {
      const timestamp = Date.parse(entry.recordedAt ?? "");
      if (Number.isNaN(timestamp)) {
        if (Number.isNaN(lastTimestamp)) {
          lastEntry = entry;
        }
        return;
      }

      if (Number.isNaN(lastTimestamp) || timestamp > lastTimestamp) {
        lastEntry = entry;
        lastTimestamp = timestamp;
      }
    });

    lastByCurrency[currency] = { ...lastEntry };
  });

  return { averageByCurrency, lastByCurrency };
}

function clonePriceEntry(entry: ServiceProviderPriceEntry) {
  return { ...entry };
}

function buildServiceProviderResponse(provider: ServiceProviderRecord) {
  const priceHistory = Array.isArray(provider.priceHistory)
    ? provider.priceHistory.map(clonePriceEntry)
    : [];

  return {
    ...provider,
    priceHistory,
    priceSummary: computePriceSummary(priceHistory),
  };
}

function normalizeServiceProviderPayload(
  payload: any,
  existing?: ServiceProviderRecord,
) {
  if (!payload) {
    return payload;
  }

  const result: Record<string, any> = { ...payload };

  const normalizedHistory = normalizePriceHistory(
    result.priceHistory ?? result.prices,
    existing?.priceHistory ?? [],
  );
  if (normalizedHistory) {
    result.priceHistory = normalizedHistory;
  } else if (!result.priceHistory && existing?.priceHistory) {
    result.priceHistory = existing.priceHistory;
  }

  delete result.prices;
  delete result.priceSummary;
  delete result.id;

  const arrayFields = [
    "coverageRegions",
    "servicesOffered",
    "focusCommodities",
    "supportedCurrencies",
    "tags",
  ];
  arrayFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(result, field)) {
      result[field] = normalizeToStringArray(result[field]);
    }
  });

  const numericFields = ["rating", "leadTimeDays"];
  numericFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(result, field)) {
      const value = Number(result[field]);
      if (Number.isFinite(value)) {
        result[field] = value;
      } else {
        delete result[field];
      }
    }
  });

  if (typeof result.type === "string") {
    result.type = result.type.toLowerCase();
  } else if (existing?.type) {
    result.type = existing.type;
  }

  return result;
}

function normalizeContractDocument(payload: any, existing?: any) {
  if (!payload) return payload;

  const result: Record<string, any> = { ...payload };
  const rawFile = (payload as any)?.contractFile;

  let fileName: string | null =
    typeof payload?.fileName === "string" && payload.fileName
      ? payload.fileName
      : existing?.fileName ?? existing?.uploadedFile ?? null;

  if (rawFile && typeof rawFile === "object" && "name" in rawFile && typeof rawFile.name === "string") {
    fileName = rawFile.name;
  } else if (typeof rawFile === "string" && rawFile) {
    fileName = rawFile;
  }

  const fileUrl: string | null =
    typeof payload?.fileUrl === "string" && payload.fileUrl
      ? payload.fileUrl
      : existing?.fileUrl ?? (fileName ? `/uploads/${fileName}` : null);

  if (Object.prototype.hasOwnProperty.call(result, "contractFile")) {
    delete result.contractFile;
  }

  return {
    ...result,
    fileName: fileName ?? null,
    fileUrl: fileUrl ?? null,
    uploadedFile: fileName ?? null,
  };
}

function normalizeLetterOfCreditDocument(payload: any, existing?: any) {
  if (!payload) return payload;

  const result: Record<string, any> = { ...payload };
  const rawFile = (payload as any)?.lcFile;

  let fileName: string | null =
    typeof payload?.fileName === "string" && payload.fileName
      ? payload.fileName
      : existing?.fileName ?? existing?.uploadedFile ?? null;

  if (rawFile && typeof rawFile === "object" && "name" in rawFile && typeof rawFile.name === "string") {
    fileName = rawFile.name;
  } else if (typeof rawFile === "string" && rawFile) {
    fileName = rawFile;
  }

  const fileUrl: string | null =
    typeof payload?.fileUrl === "string" && payload.fileUrl
      ? payload.fileUrl
      : existing?.fileUrl ?? (fileName ? `/uploads/${fileName}` : null);

  if (Object.prototype.hasOwnProperty.call(result, "lcFile")) {
    delete result.lcFile;
  }

  return {
    ...result,
    fileName: fileName ?? null,
    fileUrl: fileUrl ?? null,
    uploadedFile: fileName ?? null,
  };
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

  url = typeof url === "string" ? url : "";
  const rawUrl = url;
  const [pathOnly] = rawUrl.split("?");
  const queryParams = parseQueryParams(rawUrl, method === "GET" ? body : undefined);
  url = pathOnly;
  if (method === "GET") {
    body = undefined;
  }

  const query = queryParams;
  let match: RegExpMatchArray | null;

  // Authentication
  if (method === "GET" && url === "/api/auth/user") return jsonResponse(demoUser);
  if (method === "POST" && (url === "/api/login" || url === "/api/register"))
    return jsonResponse(demoUser);
  if (method === "POST" && url === "/api/logout") return jsonResponse({ ok: true });

  // Dashboard stats
  if (method === "GET" && url === "/api/dashboard/stats")
    return jsonResponse({
      requests: requests.length,
      contracts: contracts.length,
      vessels: vessels.length,
      lettersOfCredit: lettersOfCredit.length,
    });

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
      const normalizedPayload = normalizeContractDocument(payload);
      const newContract = { id: generateId(contracts), ...normalizedPayload } as any;
      contracts.push(newContract);
      return jsonResponse(newContract, 201);
    }
  }
  if (url === "/api/contracts/upload" && method === "POST") {
    const payload = body instanceof FormData ? formDataToObject(body) : body || {};
    const normalizedPayload = normalizeContractDocument(payload);
    const newContract = { id: generateId(contracts), ...normalizedPayload } as any;
    contracts.push(newContract);
    return jsonResponse(newContract, 201);
  }
  match = url.match(/^\/api\/contracts\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = contracts.findIndex((c) => c.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        const normalizedPayload = normalizeContractDocument(payload, contracts[idx]);
        contracts[idx] = { ...contracts[idx], ...normalizedPayload } as any;
        return jsonResponse(contracts[idx]);
      }
      if (method === "DELETE") {
        contracts.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  match = url.match(/^\/api\/contracts\/(\d+)\/upload$/);
  if (match) {
    const id = Number(match[1]);
    const idx = contracts.findIndex((c) => c.id === id);
    if (idx !== -1 && method === "PUT") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const normalizedPayload = normalizeContractDocument(payload, contracts[idx]);
      contracts[idx] = { ...contracts[idx], ...normalizedPayload } as any;
      return jsonResponse(contracts[idx]);
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
  if (url.startsWith("/api/letters-of-credit/supplier-allocation-options") && method === "GET") {
    const parsedUrl = new URL(url, "http://localhost");
    const lcIdParam = parsedUrl.searchParams.get("lcId");

    const lcIdKey = lcIdParam ?? null;

    const excludedSupplierIds = new Set<string>();
    Object.entries(lcSupplierAllocations).forEach(([allocationLcId, allocationList]) => {
      if (lcIdKey !== null && allocationLcId === lcIdKey) {
        return;
      }

      (allocationList || []).forEach((allocation: any) => {
        if (allocation && allocation.supplierId) {
          excludedSupplierIds.add(String(allocation.supplierId));
        }
      });
    });

    const excludedContractIds = new Set<string>();
    lettersOfCredit.forEach((lc) => {
      if (lcIdKey !== null && String(lc.id) === lcIdKey) {
        return;
      }

      if (lc && lc.contractId) {
        excludedContractIds.add(String(lc.contractId));
      }
    });

    const result = contracts
      .filter((contract) => {
        const supplierName = (contract as Record<string, any>)?.supplierName;
        return typeof supplierName === "string" && supplierName.trim().length > 0;
      })
      .filter((contract) => {
        const id = String((contract as Record<string, any>).id);
        return !excludedSupplierIds.has(id) && !excludedContractIds.has(id);
      })
      .map((contract) => {
        const record = contract as Record<string, any>;
        const sequenceValue = Number(record.sequenceNumber);
        const fallbackSequence = Number(record.id) || 0;

        const publicId = typeof record.publicId === "string" ? record.publicId : null;
        const supplierName = typeof record.supplierName === "string" ? record.supplierName : "";

        return {
          contractId: String(record.id),
          contractPublicId: publicId,
          sequenceNumber: Number.isFinite(sequenceValue) ? sequenceValue : fallbackSequence,
          supplierName,
        };
      });

    return jsonResponse(result);
  }

  if (url === "/api/letters-of-credit") {
    if (method === "GET") return jsonResponse(lettersOfCredit);
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const normalizedPayload = normalizeLetterOfCreditDocument(payload);
      const lc = { id: generateId(lettersOfCredit), ...normalizedPayload } as any;
      lettersOfCredit.push(lc);
      return jsonResponse(lc, 201);
    }
  }
  if (url === "/api/letters-of-credit/upload" && method === "POST") {
    const payload = body instanceof FormData ? formDataToObject(body) : body || {};
    const normalizedPayload = normalizeLetterOfCreditDocument(payload);
    const lc = { id: generateId(lettersOfCredit), ...normalizedPayload } as any;
    lettersOfCredit.push(lc);
    return jsonResponse(lc, 201);
  }
  match = url.match(/^\/api\/letters-of-credit\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = lettersOfCredit.findIndex((l) => l.id === id);
    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        const normalizedPayload = normalizeLetterOfCreditDocument(payload, lettersOfCredit[idx]);
        lettersOfCredit[idx] = { ...lettersOfCredit[idx], ...normalizedPayload } as any;
        return jsonResponse(lettersOfCredit[idx]);
      }
      if (method === "DELETE") {
        lettersOfCredit.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }
  match = url.match(/^\/api\/letters-of-credit\/(\d+)\/upload$/);
  if (match) {
    const id = Number(match[1]);
    const idx = lettersOfCredit.findIndex((l) => l.id === id);
    if (idx !== -1 && method === "PUT") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const normalizedPayload = normalizeLetterOfCreditDocument(payload, lettersOfCredit[idx]);
      lettersOfCredit[idx] = { ...lettersOfCredit[idx], ...normalizedPayload } as any;
      return jsonResponse(lettersOfCredit[idx]);
    }
  }
  match = url.match(/^\/api\/letters-of-credit\/(\d+)\/supplier-allocations$/);
  if (match) {
    const lcId = Number(match[1]);
    const current = lcSupplierAllocations[lcId] || [];

    if (method === "GET") {
      return jsonResponse(current);
    }

    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const normalizedPayload = normalizeSupplierAllocationPayload(payload);
      const nextList = [...current];
      const id = generateId(nextList);
      const record = { id, ...normalizedPayload };
      lcSupplierAllocations[lcId] = [...nextList, record];
      return jsonResponse(record, 201);
    }
  }
  match = url.match(/^\/api\/letters-of-credit\/(\d+)\/supplier-allocations\/(\d+)$/);
  if (match) {
    const lcId = Number(match[1]);
    const allocationId = Number(match[2]);
    const current = lcSupplierAllocations[lcId] || [];
    const idx = current.findIndex((item) => Number(item.id) === allocationId);

    if (idx !== -1) {
      if (method === "PUT") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        const normalizedPayload = normalizeSupplierAllocationPayload(payload, current[idx]);
        const updated = { ...current[idx], ...normalizedPayload, id: allocationId };
        const nextList = [...current];
        nextList[idx] = updated;
        lcSupplierAllocations[lcId] = nextList;
        return jsonResponse(updated);
      }

      if (method === "DELETE") {
        lcSupplierAllocations[lcId] = current.filter((item) => Number(item.id) !== allocationId);
        return jsonResponse({ ok: true });
      }
    }

    if (method === "DELETE") {
      return jsonResponse({ ok: true });
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
  match = url.match(/^\/api\/vessels\/(\d+)\/stage-entries$/);
  if (match) {
    const vesselId = Number(match[1]);
    const key = vesselId;
    const entries = vesselStageEntriesStore[key] || [];
    if (method === "GET") {
      return jsonResponse(entries);
    }
    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const normalizedStageId = normalizeStageIdentifier(payload.stageId ?? payload.type ?? "");
      const numberValue = String(payload.value ?? payload.number ?? payload.numberValue ?? "").trim();
      if (!normalizedStageId) {
        return jsonResponse({ message: "Stage identifier is required." }, 400);
      }
      if (!numberValue) {
        return jsonResponse({ message: "Stage value is required." }, 400);
      }

      const now = new Date().toISOString();
      const currentEntries = [...entries];
      const existingIdx = currentEntries.findIndex((entry) => entry.stageId === normalizedStageId);

      if (existingIdx >= 0) {
        currentEntries[existingIdx] = {
          ...currentEntries[existingIdx],
          numberValue,
          updatedAt: now,
        };
        vesselStageEntriesStore[key] = currentEntries;
        return jsonResponse(currentEntries[existingIdx]);
      }

      const entry: StageEntryRecord = {
        id: generateId(currentEntries),
        stageId: normalizedStageId,
        numberValue,
        updatedAt: now,
      };
      vesselStageEntriesStore[key] = [...currentEntries, entry];
      return jsonResponse(entry, 201);
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
  if (method === "POST" && url === "/api/documents/upload") {
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

  // Service providers
  if (url === "/api/service-providers") {
    if (method === "GET") {
      let list = serviceProviderStore;
      const typeFilter = query.type ?? query.providerType ?? query.category;
      if (typeFilter) {
        const value = Array.isArray(typeFilter) ? typeFilter[0] : typeFilter;
        const normalized = String(value).toLowerCase();
        list = list.filter((provider) =>
          String(provider.type ?? "").toLowerCase() === normalized,
        );
      }

      const response = list.map((provider) => buildServiceProviderResponse(provider));
      return jsonResponse(response);
    }

    if (method === "POST") {
      const payload = body instanceof FormData ? formDataToObject(body) : body || {};
      const normalizedPayload = normalizeServiceProviderPayload(payload);
      const priceHistory = Array.isArray(normalizedPayload?.priceHistory)
        ? normalizedPayload.priceHistory
        : [];
      const type = normalizedPayload?.type ?? payload?.type ?? "shipping";
      const name =
        normalizedPayload?.name ??
        normalizedPayload?.companyName ??
        payload?.name ??
        "New Provider";

      const newProvider: ServiceProviderRecord = {
        id: generateId(serviceProviderStore),
        type,
        name,
        priceHistory,
        ...normalizedPayload,
      };

      if (!Array.isArray(newProvider.priceHistory)) {
        newProvider.priceHistory = [];
      }

      serviceProviderStore.push(newProvider);
      return jsonResponse(buildServiceProviderResponse(newProvider), 201);
    }
  }
  match = url.match(/^\/api\/service-providers\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const idx = serviceProviderStore.findIndex((provider) => provider.id === id);
    if (idx !== -1) {
      const provider = serviceProviderStore[idx];

      if (method === "GET") {
        return jsonResponse(buildServiceProviderResponse(provider));
      }

      if (method === "PUT" || method === "PATCH") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        const normalizedPayload = normalizeServiceProviderPayload(payload, provider) || {};
        serviceProviderStore[idx] = {
          ...provider,
          ...normalizedPayload,
          priceHistory: Array.isArray(normalizedPayload.priceHistory)
            ? normalizedPayload.priceHistory
            : provider.priceHistory || [],
        };

        return jsonResponse(buildServiceProviderResponse(serviceProviderStore[idx]));
      }

      if (method === "DELETE") {
        serviceProviderStore.splice(idx, 1);
        return jsonResponse({ ok: true });
      }
    }
  }

  match = url.match(/^\/api\/service-providers\/(\d+)\/prices$/);
  if (match) {
    const providerId = Number(match[1]);
    const provider = serviceProviderStore.find((item) => item.id === providerId);
    if (provider) {
      provider.priceHistory = Array.isArray(provider.priceHistory)
        ? provider.priceHistory
        : [];

      if (method === "GET") {
        return jsonResponse({
          priceHistory: provider.priceHistory.map(clonePriceEntry),
          priceSummary: computePriceSummary(provider.priceHistory),
        });
      }

      if (method === "POST") {
        const payload = body instanceof FormData ? formDataToObject(body) : body || {};
        const entry = normalizeSinglePriceEntry(payload, provider.priceHistory);
        if (entry) {
          if (!entry.id || provider.priceHistory.some((item) => item.id === entry.id)) {
            entry.id = generateId(provider.priceHistory);
          }
          provider.priceHistory = [...provider.priceHistory, entry];
        }

        return jsonResponse(
          buildServiceProviderResponse(provider),
          entry ? 201 : 200,
        );
      }
    }
  }

  match = url.match(/^\/api\/service-providers\/(\d+)\/prices\/(\d+)$/);
  if (match) {
    const providerId = Number(match[1]);
    const priceId = Number(match[2]);
    const provider = serviceProviderStore.find((item) => item.id === providerId);
    if (provider) {
      provider.priceHistory = Array.isArray(provider.priceHistory)
        ? provider.priceHistory
        : [];
      const priceIndex = provider.priceHistory.findIndex((item) => Number(item.id) === priceId);

      if (priceIndex !== -1) {
        if (method === "PUT" || method === "PATCH") {
          const payload = body instanceof FormData ? formDataToObject(body) : body || {};
          const updated = normalizeSinglePriceEntry(
            payload,
            provider.priceHistory,
            provider.priceHistory[priceIndex],
          );
          if (updated) {
            provider.priceHistory[priceIndex] = { ...provider.priceHistory[priceIndex], ...updated };
            provider.priceHistory[priceIndex].id = priceId;
          }

          return jsonResponse(buildServiceProviderResponse(provider));
        }

        if (method === "DELETE") {
          provider.priceHistory.splice(priceIndex, 1);
          return jsonResponse(buildServiceProviderResponse(provider));
        }
      }
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
