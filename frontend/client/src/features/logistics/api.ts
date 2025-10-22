import type { PortsLogisticsFilters } from "./types";

export const PORTS_LOGISTICS_QUERY_KEY = "/api/ports/logistics" as const;

export const buildPortsLogisticsQueryKey = (
  filters: PortsLogisticsFilters = {}
) => [
  PORTS_LOGISTICS_QUERY_KEY,
  {
    region: filters.region || undefined,
    portId: filters.portId || undefined,
    alertThreshold: filters.alertThreshold,
  },
] as const;
