import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Request, Contract, Vessel } from "@/lib/schemas";
import type {
  SupplierOption,
  NeedProgress,
  NeedsSummary,
  DischargedVesselInfo,
} from "@/types/needs";

interface UseNeedsDataProps {
  monthKey: string;
  supplier: string | null;
}

interface UseNeedsDataResult {
  needs: NeedProgress[];
  summary: NeedsSummary;
  dischargedVessels: DischargedVesselInfo[];
  availableSuppliers: SupplierOption[];
  supplierLabel: string | null;
  isLoading: boolean;
  error: Error | null;
}

const getMonthKey = (dateString?: string | null): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const normalizeSupplier = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

const getRequestPrimaryDate = (request: Request): string | undefined => {
  return request.startDate || request.createdAt;
};

const getVesselActivityDate = (vessel: Vessel): string | undefined => {
  // Prefer actual discharge dates when available, fallback to ETA, then createdAt
  const extendedVessel = vessel as Vessel & {
    dischargeEndDate?: string;
    dischargedAt?: string;
    dischargeDate?: string;
  };

  return (
    extendedVessel.dischargeEndDate ||
    extendedVessel.dischargedAt ||
    extendedVessel.dischargeDate ||
    vessel.eta ||
    vessel.createdAt
  );
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useNeedsData({ monthKey, supplier }: UseNeedsDataProps): UseNeedsDataResult {
  const { isAuthenticated } = useAuth();

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery<Request[]>({
    queryKey: ["/api/requests"],
    enabled: isAuthenticated,
  });

  const {
    data: contracts = [],
    isLoading: contractsLoading,
    error: contractsError,
  } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  const {
    data: vessels = [],
    isLoading: vesselsLoading,
    error: vesselsError,
  } = useQuery<Vessel[]>({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
  });

  const normalizedSupplier = useMemo(() => normalizeSupplier(supplier), [supplier]);

  const availableSuppliers = useMemo<SupplierOption[]>(() => {
    const supplierMap = new Map<string, string>();
    requests.forEach((request) => {
      const key = normalizeSupplier(request.supplierName);
      if (!key) return;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, request.supplierName ?? "Unknown Supplier");
      }
    });

    return Array.from(supplierMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [requests]);

  const supplierLabel = useMemo(() => {
    if (!normalizedSupplier) return null;
    const match = availableSuppliers.find((option) => option.value === normalizedSupplier);
    return match?.label ?? null;
  }, [availableSuppliers, normalizedSupplier]);

  const requestsForMonth = useMemo(() => {
    return requests.filter((request) => {
      const requestMonth = getMonthKey(getRequestPrimaryDate(request));
      if (requestMonth !== monthKey) {
        return false;
      }

      if (!normalizedSupplier) {
        return true;
      }

      return normalizeSupplier(request.supplierName) === normalizedSupplier;
    });
  }, [requests, monthKey, normalizedSupplier]);

  const contractsByRequestId = useMemo(() => {
    const map = new Map<number, Contract[]>();
    contracts.forEach((contract) => {
      if (contract.requestId == null) {
        return;
      }

      if (!map.has(contract.requestId)) {
        map.set(contract.requestId, []);
      }
      map.get(contract.requestId)?.push(contract);
    });

    return map;
  }, [contracts]);

  const vesselsByContractId = useMemo(() => {
    const map = new Map<number, Vessel[]>();
    vessels.forEach((vessel) => {
      if (vessel.contractId == null) {
        return;
      }

      if (!map.has(vessel.contractId)) {
        map.set(vessel.contractId, []);
      }
      map.get(vessel.contractId)?.push(vessel);
    });

    return map;
  }, [vessels]);

  const needs = useMemo<NeedProgress[]>(() => {
    return requestsForMonth.map((request) => {
      const relatedContracts = contractsByRequestId.get(request.id) ?? [];
      const relatedVessels: Vessel[] = relatedContracts.flatMap((contract) =>
        vesselsByContractId.get(contract.id) ?? [],
      );

      const dischargedThisMonth = relatedVessels
        .filter((vessel) => getMonthKey(getVesselActivityDate(vessel)) === monthKey)
        .reduce((sum, vessel) => sum + toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0), 0);

      const totalDischarged = relatedVessels.reduce(
        (sum, vessel) => sum + toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0),
        0,
      );

      const requestedQuantity = toNumber(request.quantity ?? 0);
      const remainingQuantity = Math.max(requestedQuantity - totalDischarged, 0);
      const overallFulfillmentRate = requestedQuantity > 0 ? totalDischarged / requestedQuantity : 0;
      const monthFulfillmentRate = requestedQuantity > 0 ? dischargedThisMonth / requestedQuantity : 0;
      const isUnassigned = relatedContracts.length === 0 || relatedVessels.length === 0;

      return {
        request,
        contracts: relatedContracts,
        vessels: relatedVessels,
        dischargedThisMonth,
        totalDischarged,
        remainingQuantity,
        overallFulfillmentRate,
        monthFulfillmentRate,
        isFulfilled: remainingQuantity <= 0,
        isUnassigned,
      } satisfies NeedProgress;
    });
  }, [requestsForMonth, contractsByRequestId, vesselsByContractId, monthKey]);

  const summary = useMemo<NeedsSummary>(() => {
    const totalRequestedQuantity = needs.reduce(
      (sum, need) => sum + toNumber(need.request.quantity ?? 0),
      0,
    );

    const totalDischargedQuantity = needs.reduce(
      (sum, need) => sum + need.dischargedThisMonth,
      0,
    );

    const overallDischargedQuantity = needs.reduce(
      (sum, need) => sum + need.totalDischarged,
      0,
    );

    const pendingQuantity = Math.max(totalRequestedQuantity - totalDischargedQuantity, 0);
    const backlogQuantity = needs
      .filter((need) => !need.isFulfilled)
      .reduce((sum, need) => sum + need.remainingQuantity, 0);

    const fulfilledNeeds = needs.filter((need) => need.isFulfilled).length;
    const inProgressNeeds = needs.filter((need) => !need.isFulfilled && need.totalDischarged > 0).length;
    const unassignedNeeds = needs.filter((need) => need.isUnassigned).length;

    const fulfillmentRate =
      totalRequestedQuantity > 0 ? (totalDischargedQuantity / totalRequestedQuantity) * 100 : 0;

    return {
      monthKey,
      totalNeeds: needs.length,
      totalRequestedQuantity,
      totalDischargedQuantity,
      overallDischargedQuantity,
      pendingQuantity,
      backlogQuantity,
      fulfilledNeeds,
      inProgressNeeds,
      unassignedNeeds,
      fulfillmentRate,
    } satisfies NeedsSummary;
  }, [needs, monthKey]);

  const dischargedVessels = useMemo<DischargedVesselInfo[]>(() => {
    const relevantContractIds = new Set<number>();
    needs.forEach((need) => {
      need.contracts.forEach((contract) => relevantContractIds.add(contract.id));
    });

    return vessels
      .filter((vessel) => {
        if (vessel.contractId == null) return false;
        if (!relevantContractIds.has(vessel.contractId)) return false;
        return getMonthKey(getVesselActivityDate(vessel)) === monthKey;
      })
      .map((vessel) => {
        const contract = contracts.find((item) => item.id === vessel.contractId) ?? null;
        const relatedRequest =
          contract?.requestId != null
            ? requests.find((request) => request.id === contract.requestId) ?? null
            : null;

        return {
          vessel,
          contract,
          relatedRequest,
          dischargedQuantity: toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0),
          activityDate: getVesselActivityDate(vessel) ?? null,
          monthKey: getMonthKey(getVesselActivityDate(vessel)),
        } satisfies DischargedVesselInfo;
      });
  }, [vessels, needs, contracts, requests, monthKey]);

  const isLoading = requestsLoading || contractsLoading || vesselsLoading;
  const error = (requestsError || contractsError || vesselsError) ?? null;

  return {
    needs,
    summary,
    dischargedVessels,
    availableSuppliers,
    supplierLabel,
    isLoading,
    error,
  };
}
