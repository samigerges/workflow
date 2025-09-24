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
  status: string;
  statusKey: string;
  issueDate: string | null;
  shipmentPeriod: string | null;
  expiryDate: string | null;
  contractId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  fileUrl: string | null;
  fileName: string | null;
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
  const status = safeString(raw?.status) ?? "Draft";
  const statusKey = status.toLowerCase();

  const issueDate = safeDateString(raw?.issueDate) ?? safeDateString(raw?.issuedDate);
  const shipmentPeriod = safeDateString(raw?.shipmentPeriod) ?? safeDateString(raw?.shipmentPeriodDate);
  const expiryDate = safeDateString(raw?.expiryDate) ?? safeDateString(raw?.expirationDate);
  const createdAt = safeDateString(raw?.createdAt);
  const updatedAt = safeDateString(raw?.updatedAt);

  const contractId = raw?.contractId !== undefined && raw?.contractId !== null
    ? String(raw.contractId)
    : null;

  const fileUrl = safeString(raw?.fileUrl) ?? safeString(raw?.uploadedFile);
  const fileName = safeString(raw?.fileName) ?? safeString(raw?.uploadedFileName);

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
    status,
    statusKey,
    issueDate,
    shipmentPeriod,
    expiryDate,
    contractId,
    createdAt,
    updatedAt,
    fileUrl,
    fileName,
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
