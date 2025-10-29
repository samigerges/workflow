import { format } from "date-fns";
import type {
  Contract,
  DateRange,
  DisplayTotals,
  QuantityMetrics,
  Request,
  SupplierData,
  VesselWithContract,
} from "@/lib/schemas";

const DEFAULT_FILENAME_PREFIX = "reports-export";
const CSV_MIME_TYPE = "text/csv;charset=utf-8";
const SERVER_EXPORT_THRESHOLD = 1500;
const SUPPLIER_FILTER_SEPARATOR = "::";

type ReportsExportFormat = "csv" | "json";

type ExportStrategy = "auto" | "client" | "server";

export interface ReportsExportFilters {
  selectedSupplierValue: string | null;
  selectedSupplierLabel: string | null;
  selectedCountry: string | null;
  dateRange: DateRange;
}

export interface ReportsExportPayload {
  totals: DisplayTotals;
  suppliers: SupplierData[];
  vessels: VesselWithContract[];
  contracts: Contract[];
  requests: Request[];
  quantityMetrics: QuantityMetrics;
  selectedSupplierData: SupplierData | null;
  filters: ReportsExportFilters;
}

export interface ReportsExportOptions {
  format?: ReportsExportFormat;
  filename?: string;
  strategy?: ExportStrategy;
  serverThreshold?: number;
  endpoint?: string;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export class ReportsExportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ReportsExportError";
  }
}

const isIsoDateString = (value: string | null | undefined): value is string => {
  if (!value) return false;
  return !Number.isNaN(Date.parse(value));
};

const getDateLabel = (dateRange: DateRange): string => {
  const parts: string[] = [];

  if (isIsoDateString(dateRange.from)) {
    parts.push(`from-${format(new Date(dateRange.from), "yyyy-MM-dd")}`);
  }

  if (isIsoDateString(dateRange.to)) {
    parts.push(`to-${format(new Date(dateRange.to), "yyyy-MM-dd")}`);
  }

  return parts.length > 0 ? parts.join("-") : format(new Date(), "yyyy-MM-dd");
};

const normaliseSupplierKey = (supplier: string | null): string | null => {
  if (!supplier) return null;
  const trimmed = supplier.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

const escapeCsvValue = (value: unknown): string => {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return escapeCsvValue(format(value, "yyyy-MM-dd HH:mm:ss"));
  }

  const stringValue = String(value);
  const needsEscaping = /[",\n\r]/u.test(stringValue);

  if (!needsEscaping) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
};

const buildSummarySection = (payload: ReportsExportPayload): string[] => {
  const { totals, quantityMetrics, filters, selectedSupplierData } = payload;
  const lines: string[] = [];

  lines.push("Summary");
  lines.push("Metric,Value");
  lines.push(`Total suppliers,${totals.totalSuppliers}`);
  lines.push(`Total vessels,${totals.totalVessels}`);
  lines.push(`Total contracts,${totals.totalContracts}`);
  lines.push(`Contracted quantity (tons),${quantityMetrics.totalContracted}`);
  lines.push(`Arrived quantity (tons),${quantityMetrics.arrivedQuantity}`);
  lines.push(`Remaining quantity (tons),${quantityMetrics.remainingQuantity}`);

  if (selectedSupplierData) {
    lines.push("Selected supplier breakdown");
    lines.push("Supplier,Vessels,Contracts,Quantity (tons)");
    lines.push(
      [
        escapeCsvValue(selectedSupplierData.supplier),
        selectedSupplierData.vessels,
        selectedSupplierData.contracts,
        selectedSupplierData.quantity,
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Applied filters");
  lines.push("Filter,Value");
  lines.push(`Supplier,${escapeCsvValue(filters.selectedSupplierLabel ?? filters.selectedSupplierValue ?? "All")}`);
  lines.push(`Country,${escapeCsvValue(filters.selectedCountry ?? "All")}`);
  lines.push(
    `Date range,${escapeCsvValue(
      [filters.dateRange.from || "Any", filters.dateRange.to || "Any"].join(" -> "),
    )}`,
  );

  return lines;
};

const buildSupplierSection = (payload: ReportsExportPayload): string[] => {
  const lines: string[] = [];
  lines.push("");
  lines.push("Suppliers");
  lines.push("Supplier,Vessels,Contracts,Total quantity (tons)");

  payload.suppliers.forEach((supplier) => {
    lines.push(
      [
        escapeCsvValue(supplier.supplier),
        supplier.vessels,
        supplier.contracts,
        supplier.quantity,
      ].join(","),
    );
  });

  return lines;
};

const buildVesselSection = (payload: ReportsExportPayload): string[] => {
  const lines: string[] = [];
  lines.push("");
  lines.push("Vessel details");
  lines.push(
    [
      "Vessel name",
      "Supplier",
      "Contract",
      "Cargo type",
      "Country of origin",
      "Quantity (tons)",
      "Discharged quantity (tons)",
      "Discharge port",
      "ETA",
      "Status",
    ].join(","),
  );

  payload.vessels.forEach((vessel) => {
    lines.push(
      [
        escapeCsvValue(vessel.vesselName ?? vessel.name ?? ""),
        escapeCsvValue(vessel.supplierName),
        escapeCsvValue(vessel.contractPublicId ?? vessel.contractReportId ?? "Unassigned"),
        escapeCsvValue(vessel.cargoType ?? ""),
        escapeCsvValue(vessel.countryOfOrigin ?? ""),
        vessel.quantity ?? "",
        vessel.dischargedQuantity ?? "",
        escapeCsvValue(vessel.portOfDischarge ?? ""),
        escapeCsvValue(vessel.eta ?? vessel.etd ?? ""),
        escapeCsvValue(vessel.status ?? ""),
      ].join(","),
    );
  });

  return lines;
};

const buildContractsSection = (payload: ReportsExportPayload): string[] => {
  const lines: string[] = [];
  lines.push("");
  lines.push("Contracts");
  lines.push("Contract, Supplier, Quantity (tons), Cargo type, Country of origin, Status, Created at");

  payload.contracts.forEach((contract) => {
    lines.push(
      [
        escapeCsvValue(contract.publicId ?? String(contract.id ?? "")),
        escapeCsvValue(contract.supplierName ?? ""),
        contract.quantity ?? "",
        escapeCsvValue(contract.cargoType ?? ""),
        escapeCsvValue(contract.countryOfOrigin ?? ""),
        escapeCsvValue(contract.status ?? ""),
        escapeCsvValue(contract.createdAt ?? ""),
      ].join(","),
    );
  });

  return lines;
};

const buildCsv = (payload: ReportsExportPayload): string => {
  const sections: string[] = [];
  sections.push(...buildSummarySection(payload));
  sections.push(...buildSupplierSection(payload));
  sections.push(...buildVesselSection(payload));
  sections.push(...buildContractsSection(payload));
  sections.push("");
  sections.push("Requests");
  sections.push("Request, Supplier, Quantity (tons), Cargo type, Country of origin, Status, Created at");

  payload.requests.forEach((request) => {
    sections.push(
      [
        escapeCsvValue(request.publicId ?? String(request.id ?? "")),
        escapeCsvValue(request.supplierName ?? ""),
        request.quantity ?? "",
        escapeCsvValue(request.cargoType ?? ""),
        escapeCsvValue(request.countryOfOrigin ?? ""),
        escapeCsvValue(request.status ?? ""),
        escapeCsvValue(request.createdAt ?? ""),
      ].join(","),
    );
  });

  return sections.join("\n");
};

const shouldFallbackToServer = (
  payload: ReportsExportPayload,
  options?: ReportsExportOptions,
): boolean => {
  const strategy = options?.strategy ?? "auto";
  if (strategy === "client") {
    return false;
  }

  if (strategy === "server") {
    return true;
  }

  const threshold = options?.serverThreshold ?? SERVER_EXPORT_THRESHOLD;
  return payload.vessels.length > threshold || payload.contracts.length > threshold;
};

const buildServerRequestBody = (payload: ReportsExportPayload) => {
  const { filters } = payload;
  return {
    selectedSupplier: filters.selectedSupplierValue,
    selectedSupplierLabel: filters.selectedSupplierLabel,
    selectedCountry: filters.selectedCountry,
    dateRange: filters.dateRange,
  };
};

const determineFilename = (payload: ReportsExportPayload, options?: ReportsExportOptions) => {
  if (options?.filename) {
    return options.filename;
  }

  const dateLabel = getDateLabel(payload.filters.dateRange);
  const suffix = payload.filters.selectedCountry
    ? `${payload.filters.selectedCountry.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`
    : null;
  const base = suffix ? `${DEFAULT_FILENAME_PREFIX}-${suffix}` : DEFAULT_FILENAME_PREFIX;
  return `${base}-${dateLabel}.csv`;
};

export const triggerFileDownload = ({ blob, filename }: ExportResult): void => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 0);
};

const fetchServerExport = async (
  payload: ReportsExportPayload,
  options?: ReportsExportOptions,
): Promise<ExportResult> => {
  const endpoint = options?.endpoint ?? "/api/reports/export";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(buildServerRequestBody(payload)),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ReportsExportError(
      `Server export failed with status ${response.status}: ${message}`,
    );
  }

  const blob = await response.blob();
  const mimeType = response.headers.get("Content-Type") ?? CSV_MIME_TYPE;
  const filename = response.headers.get("Content-Disposition")?.split("filename=")?.[1]?.replace(/"/g, "");

  return {
    blob,
    mimeType,
    filename: filename ?? determineFilename(payload, options),
  };
};

const createClientExport = (
  payload: ReportsExportPayload,
  options?: ReportsExportOptions,
): ExportResult => {
  const format = options?.format ?? "csv";

  if (format === "json") {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = (options?.filename ?? determineFilename(payload, options)).replace(/\.csv$/i, ".json");
    return { blob, filename, mimeType: "application/json" };
  }

  const csv = buildCsv(payload);
  const blob = new Blob([csv], { type: CSV_MIME_TYPE });
  const filename = determineFilename(payload, options);
  return { blob, filename, mimeType: CSV_MIME_TYPE };
};

export const exportReports = async (
  payload: ReportsExportPayload,
  options?: ReportsExportOptions,
): Promise<ExportResult> => {
  if (shouldFallbackToServer(payload, options)) {
    return fetchServerExport(payload, options);
  }

  return createClientExport(payload, options);
};

export const parseSupplierFilterValue = (value: string | null) => {
  if (!value) return null;
  const [contractIdRaw, supplierRaw] = value.split(SUPPLIER_FILTER_SEPARATOR);
  const contractId = contractIdRaw?.trim();
  const supplierKey = normaliseSupplierKey(supplierRaw ?? null);
  if (!contractId || !supplierKey) {
    return null;
  }

  return { contractId, supplierKey } as const;
};

export const shouldUseServerExport = (
  payload: ReportsExportPayload,
  options?: ReportsExportOptions,
): boolean => shouldFallbackToServer(payload, options);

export const buildReportsCsv = buildCsv;
