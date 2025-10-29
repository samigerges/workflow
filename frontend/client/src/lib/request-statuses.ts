export type StatusDisplayConfig = {
  label: string;
  color: string;
};

export const DEFAULT_STATUS_CONFIG: StatusDisplayConfig = {
  label: "Unknown",
  color: "bg-gray-100 text-gray-800",
};

export const REQUEST_STATUSES = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  submitted: { label: "Submitted", color: "bg-sky-100 text-sky-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  contracted: { label: "Contracted", color: "bg-blue-100 text-blue-800" },
  applied: { label: "Applied", color: "bg-indigo-100 text-indigo-800" },
  in_progress: { label: "In Progress", color: "bg-cyan-100 text-cyan-800" },
  completed: { label: "Completed", color: "bg-purple-100 text-purple-800" },
  archived: { label: "Archived", color: "bg-slate-200 text-slate-800" },
} as const;

export type RequestStatusKey = keyof typeof REQUEST_STATUSES;

const NORMALIZATION_REGEX = /[\s-]+/g;

export const REQUEST_STATUS_VALUES = new Set(
  Object.keys(REQUEST_STATUSES) as RequestStatusKey[]
);

export const REQUEST_STATUS_OPTIONS = Object.entries(REQUEST_STATUSES).map(
  ([value, config]) => ({
    value: value as RequestStatusKey,
    label: config.label,
  })
);

export function normalizeRequestStatus(
  status?: string | null
): RequestStatusKey | undefined {
  if (!status) {
    return undefined;
  }

  const normalized = status
    .trim()
    .toLowerCase()
    .replace(NORMALIZATION_REGEX, "_");

  return REQUEST_STATUS_VALUES.has(normalized as RequestStatusKey)
    ? (normalized as RequestStatusKey)
    : undefined;
}

export function isValidRequestStatus(
  status?: string | null
): status is RequestStatusKey {
  return normalizeRequestStatus(status) !== undefined;
}

export function getRequestStatusConfig(
  status?: string | null
): StatusDisplayConfig {
  const normalized = normalizeRequestStatus(status);
  if (!normalized) {
    return DEFAULT_STATUS_CONFIG;
  }
  return REQUEST_STATUSES[normalized];
}

export function getRequestStatusLabel(status?: string | null): string {
  return getRequestStatusConfig(status).label;
}

export function getRequestStatusColor(status?: string | null): string {
  return getRequestStatusConfig(status).color;
}
