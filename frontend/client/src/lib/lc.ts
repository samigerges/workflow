export interface NormalizedLcSupplierAllocation {
  id: string | number | null;
  supplierId: string | number | null;
  supplierName: string;
  quantity: number | null;
  amount: number | null;
  supplierReference: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NormalizedLC {
  id: string | number | null;
  number: string;
  amount: number | null;
  quantity: number | null;
  pricePerUnit: number | null;
  currency: string | null;
  issuingBank: string | null;
  cargoType: string | null;
  applicant: string | null;
  beneficiary: string | null;
  supplierName: string | null;
  flow: string;
  flowKey: "gasc_to_upf" | "upf_to_supplier";
  status: string;
  statusKey: string;
  issueDate: string | null;
  shipmentPeriodStart: string | null;
  shipmentPeriodEnd: string | null;
  shipmentPeriod: string | null;
  expiryDate: string | null;
  contractId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  fileUrl: string | null;
  fileName: string | null;
  supplierAllocations: NormalizedLcSupplierAllocation[];
  allocatedQuantity: number | null;
  allocatedAmount: number | null;
}

const safeString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const safeDateString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const fallbackNumberFromId = (id: unknown): string | null => {
  if (id === null || id === undefined) return null;
  const str = String(id);
  if (str.length === 0) return null;
  const suffix = str.slice(-6).toUpperCase();
  return `LC-${suffix}`;
};

export function normalizeLc(raw: any): NormalizedLC {
  const allowedFlows = new Set(["GASC_TO_UPF", "UPF_TO_SUPPLIER"]);
  const defaultFlow = "GASC_TO_UPF";

  const number =
    safeString(raw?.number) ??
    safeString(raw?.lcNumber) ??
    safeString(raw?.Number) ??
    fallbackNumberFromId(raw?.id) ??
    "LC";

  const amount = parseNumber(
    raw?.amount ?? raw?.totalAmount ?? raw?.lcAmount ?? null,
  );

  const quantity = parseNumber(raw?.quantity ?? raw?.lcQuantity ?? null);
  const pricePerUnit = parseNumber(raw?.pricePerUnit ?? raw?.unitPrice ?? null);

  const currency = (safeString(raw?.currency) ?? safeString(raw?.currencyCode))?.toUpperCase() ?? null;
  const issuingBank = safeString(raw?.issuingBank) ?? safeString(raw?.issuing_bank);
  const cargoType = safeString(raw?.cargoType) ?? safeString(raw?.cargo_type);
  const applicant = safeString(raw?.applicant) ?? safeString(raw?.applicantName);
  const beneficiary = safeString(raw?.beneficiary) ?? safeString(raw?.beneficiaryName);
  const supplierName = safeString(raw?.supplierName) ?? safeString(raw?.supplier_name);
  const status = safeString(raw?.status) ?? "Draft";
  const statusKey = status.toLowerCase();

  const rawFlow =
    safeString(raw?.flow) ??
    safeString(raw?.lcFlow) ??
    safeString(raw?.Flow);
  const normalizedFlow = (() => {
    if (!rawFlow) return defaultFlow;
    const candidate = rawFlow.replace(/[\s-]+/g, "_").toUpperCase();
    return allowedFlows.has(candidate) ? candidate : defaultFlow;
  })();
  const flowKey = normalizedFlow.toLowerCase() as NormalizedLC["flowKey"];

  const issueDate = safeDateString(raw?.issueDate) ?? safeDateString(raw?.issuedDate);
  const shipmentPeriodStart =
    safeDateString(raw?.shipmentPeriodStart) ??
    safeDateString(raw?.shipmentPeriodFrom) ??
    safeDateString(raw?.shipmentPeriod?.start) ??
    safeDateString(raw?.shipmentPeriod?.from) ??
    safeDateString(raw?.shipmentStartDate) ??
    safeDateString(raw?.shipment_start_date) ??
    safeDateString(raw?.shipment_period_start);
  const shipmentPeriodEnd =
    safeDateString(raw?.shipmentPeriodEnd) ??
    safeDateString(raw?.shipmentPeriodTo) ??
    safeDateString(raw?.shipmentPeriod?.end) ??
    safeDateString(raw?.shipmentPeriod?.to) ??
    safeDateString(raw?.shipmentEndDate) ??
    safeDateString(raw?.shipment_end_date) ??
    safeDateString(raw?.shipment_period_end);
  const shipmentPeriod = safeDateString(raw?.shipmentPeriod) ?? safeDateString(raw?.shipmentPeriodDate);
  const normalizedShipmentPeriodStart = shipmentPeriodStart ?? shipmentPeriod ?? null;
  const normalizedShipmentPeriodEnd = shipmentPeriodEnd ?? shipmentPeriod ?? null;
  const expiryDate = safeDateString(raw?.expiryDate) ?? safeDateString(raw?.expirationDate);
  const createdAt = safeDateString(raw?.createdAt);
  const updatedAt = safeDateString(raw?.updatedAt);

  const contractId = raw?.contractId !== undefined && raw?.contractId !== null
    ? String(raw.contractId)
    : null;

  const fileUrl = safeString(raw?.fileUrl) ?? safeString(raw?.uploadedFile);
  const fileName = safeString(raw?.fileName) ?? safeString(raw?.uploadedFileName);

  const supplierAllocationsRaw = Array.isArray(raw?.supplierAllocations)
    ? raw.supplierAllocations
    : Array.isArray(raw?.SupplierAllocations)
      ? raw.SupplierAllocations
      : [];

  const supplierAllocations: NormalizedLcSupplierAllocation[] = supplierAllocationsRaw
    .map((allocation: any) => {
      const supplierName =
        safeString(allocation?.supplierName) ??
        safeString(allocation?.SupplierName) ??
        safeString(allocation?.name) ??
        "";

      const quantity = parseNumber(
        allocation?.quantity ??
          allocation?.Quantity ??
          allocation?.allocationQuantity ??
          allocation?.allocatedQuantity,
      );

      const amount = parseNumber(allocation?.amount ?? allocation?.Amount ?? allocation?.allocationAmount);

      const supplierReference =
        safeString(allocation?.supplierReference) ?? safeString(allocation?.SupplierReference);

      const notes = safeString(allocation?.notes) ?? safeString(allocation?.Notes);

      const createdAt = safeDateString(allocation?.createdAt) ?? safeDateString(allocation?.CreatedAt);
      const updatedAt = safeDateString(allocation?.updatedAt) ?? safeDateString(allocation?.UpdatedAt);

      return {
        id: allocation?.id ?? allocation?.Id ?? null,
        supplierId: allocation?.supplierId ?? allocation?.SupplierId ?? null,
        supplierName: supplierName ?? "",
        quantity: quantity ?? null,
        amount: amount ?? null,
        supplierReference: supplierReference ?? null,
        notes: notes ?? null,
        createdAt,
        updatedAt,
      } satisfies NormalizedLcSupplierAllocation;
    })
    .filter((allocation: NormalizedLcSupplierAllocation) => allocation.supplierName.length > 0);

  const allocatedQuantity = supplierAllocations.reduce((total, allocation) => {
    return total + (allocation.quantity ?? 0);
  }, 0);

  const allocatedAmount = supplierAllocations.reduce((total, allocation) => {
    return total + (allocation.amount ?? 0);
  }, 0);

  return {
    id: raw?.id ?? null,
    number,
    amount,
    quantity,
    pricePerUnit,
    currency,
    issuingBank,
    cargoType,
    applicant,
    beneficiary,
    supplierName,
    flow: normalizedFlow,
    flowKey,
    status,
    statusKey,
    issueDate,
    shipmentPeriodStart: normalizedShipmentPeriodStart,
    shipmentPeriodEnd: normalizedShipmentPeriodEnd,
    shipmentPeriod,
    expiryDate,
    contractId,
    createdAt,
    updatedAt,
    fileUrl,
    fileName,
    supplierAllocations,
    allocatedQuantity: supplierAllocations.length > 0 ? allocatedQuantity : null,
    allocatedAmount: supplierAllocations.length > 0 ? allocatedAmount : null,
  };
}

export function formatLcCurrency(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";

  const fallbackCurrency = currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: fallbackCurrency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${fallbackCurrency}`.trim();
  }
}

export function formatLcDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export function isLcExpired(value: string | null | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export function daysUntilLcExpiry(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
