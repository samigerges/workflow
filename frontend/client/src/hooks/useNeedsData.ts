import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Request, Contract, Vessel, Need } from "@/lib/schemas";
import type { NeedProgress, NeedsSummary, DischargedVesselInfo } from "@/types/needs";

interface UseNeedsDataProps {
  monthKey: string;
}

interface UseNeedsDataResult {
  needs: NeedProgress[];
  summary: NeedsSummary;
  dischargedVessels: DischargedVesselInfo[];
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

export function useNeedsData({ monthKey }: UseNeedsDataProps): UseNeedsDataResult {
  const { isAuthenticated } = useAuth();

  const {
    data: needs = [],
    isLoading: needsLoading,
    error: needsError,
  } = useQuery<Need[]>({
    queryKey: ["/api/needs"],
    enabled: isAuthenticated,
  });

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

  const requestsByNeedId = useMemo(() => {
    const map = new Map<string, Request[]>();
    requests.forEach((request) => {
      const needId = request.needId;
      if (!needId) {
        return;
      }
      const key = String(needId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(request);
    });
    return map;
  }, [requests]);

  const needsForMonth = useMemo(() => {
    return needs.filter((need) => {
      const possibleKeys = [
        getMonthKey(need.fulfillmentStartDate),
        getMonthKey(need.fulfillmentEndDate),
        getMonthKey(need.createdAt ?? null),
      ];

      if (!possibleKeys.includes(monthKey)) {
        return false;
      }

      return true;
    });
  }, [needs, monthKey]);

  const contractsByRequestId = useMemo(() => {
    const map = new Map<string, Contract[]>();
    contracts.forEach((contract) => {
      if (contract.requestId == null) {
        return;
      }

      const key = String(contract.requestId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(contract);
    });

    return map;
  }, [contracts]);

  const vesselsByContractId = useMemo(() => {
    const map = new Map<string, Vessel[]>();
    vessels.forEach((vessel) => {
      if (vessel.contractId == null) {
        return;
      }

      const key = String(vessel.contractId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(vessel);
    });

    return map;
  }, [vessels]);

  const needProgress = useMemo<NeedProgress[]>(() => {
    return needsForMonth.map((need) => {
      const relatedRequests = requestsByNeedId.get(need.id) ?? [];
      const primaryRequest = relatedRequests[0] ?? null;

      const relatedContracts = relatedRequests.flatMap((request) =>
        contractsByRequestId.get(String(request.id)) ?? [],
      );
      const relatedVessels: Vessel[] = relatedContracts.flatMap((contract) =>
        vesselsByContractId.get(String(contract.id)) ?? [],
      );

      const dischargedThisMonth = relatedVessels
        .filter((vessel) => getMonthKey(getVesselActivityDate(vessel)) === monthKey)
        .reduce((sum, vessel) => sum + toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0), 0);

      const totalDischarged = relatedVessels.reduce(
        (sum, vessel) => sum + toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0),
        0,
      );

      const requestedQuantity = toNumber(need.requiredQuantity ?? 0);
      const remainingQuantity = Math.max(requestedQuantity - totalDischarged, 0);
      const overallFulfillmentRate = requestedQuantity > 0 ? totalDischarged / requestedQuantity : 0;
      const monthFulfillmentRate = requestedQuantity > 0 ? dischargedThisMonth / requestedQuantity : 0;
      const isUnassigned = relatedRequests.length === 0 || relatedVessels.length === 0;
      const isFulfilled =
        remainingQuantity <= 0 || need.status?.toLowerCase() === "fulfilled" || need.status?.toLowerCase() === "completed";

      return {
        need,
        requests: relatedRequests,
        primaryRequest,
        contracts: relatedContracts,
        vessels: relatedVessels,
        dischargedThisMonth,
        totalDischarged,
        remainingQuantity,
        overallFulfillmentRate,
        monthFulfillmentRate,
        isFulfilled,
        isUnassigned,
      } satisfies NeedProgress;
    });
  }, [needsForMonth, requestsByNeedId, contractsByRequestId, vesselsByContractId, monthKey]);

  const summary = useMemo<NeedsSummary>(() => {
    const totalRequestedQuantity = needProgress.reduce(
      (sum, entry) => sum + toNumber(entry.need.requiredQuantity ?? 0),
      0,
    );

    const contractIdsIncluded = new Set<string>();
    let totalContractedQuantity = 0;

    const vesselIdsIncluded = new Set<string>();
    let totalCompletedDischargedQuantity = 0;

    needProgress.forEach((entry) => {
      entry.contracts.forEach((contract) => {
        const contractId = String(contract.id);
        if (contractIdsIncluded.has(contractId)) {
          return;
        }

        const extendedContract = contract as Contract & { createdAt?: string };
        const contractMonthKeys = [
          getMonthKey(extendedContract.startDate),
          getMonthKey(extendedContract.endDate),
          getMonthKey(extendedContract.createdAt),
        ];

        if (!contractMonthKeys.includes(monthKey)) {
          return;
        }

        contractIdsIncluded.add(contractId);
        totalContractedQuantity += toNumber(extendedContract.quantity ?? 0);
      });

      entry.vessels.forEach((vessel) => {
        const vesselId = String(vessel.id);
        if (vesselIdsIncluded.has(vesselId)) {
          return;
        }

        const status = String((vessel as Vessel & { status?: string }).status ?? "").toLowerCase();
        const isCompletedStatus = status === "completed" || status === "discharged";
        if (!isCompletedStatus) {
          return;
        }

        const vesselMonthKey = getMonthKey(getVesselActivityDate(vessel));
        if (vesselMonthKey !== monthKey) {
          return;
        }

        vesselIdsIncluded.add(vesselId);
        totalCompletedDischargedQuantity += toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0);
      });
    });

    const totalDischargedQuantity = needProgress.reduce(
      (sum, entry) => sum + entry.dischargedThisMonth,
      0,
    );

    const overallDischargedQuantity = needProgress.reduce(
      (sum, entry) => sum + entry.totalDischarged,
      0,
    );

    const pendingQuantity = needProgress.reduce(
      (sum, entry) => sum + Math.max(toNumber(entry.need.requiredQuantity ?? 0) - entry.dischargedThisMonth, 0),
      0,
    );
    const backlogQuantity = needProgress
      .filter((entry) => !entry.isFulfilled)
      .reduce((sum, entry) => sum + entry.remainingQuantity, 0);

    const fulfilledNeeds = needProgress.filter((entry) => entry.isFulfilled).length;
    const inProgressNeeds = needProgress.filter((entry) => !entry.isFulfilled && entry.totalDischarged > 0).length;
    const unassignedNeeds = needProgress.filter((entry) => entry.isUnassigned).length;

    const fulfillmentRate =
      totalRequestedQuantity > 0 ? (totalDischargedQuantity / totalRequestedQuantity) * 100 : 0;

    return {
      monthKey,
      totalNeeds: needProgress.length,
      totalRequestedQuantity,
      totalNeedQuantity: totalRequestedQuantity,
      totalContractedQuantity,
      totalCompletedDischargedQuantity,
      totalDischargedQuantity,
      overallDischargedQuantity,
      pendingQuantity,
      backlogQuantity,
      fulfilledNeeds,
      inProgressNeeds,
      unassignedNeeds,
      fulfillmentRate,
    } satisfies NeedsSummary;
  }, [needProgress, monthKey]);

  const dischargedVessels = useMemo<DischargedVesselInfo[]>(() => {
    const relevantContractIds = new Set<string>();
    needProgress.forEach((entry) => {
      entry.contracts.forEach((contract) => relevantContractIds.add(String(contract.id)));
    });

    return vessels
      .filter((vessel) => {
        if (vessel.contractId == null) return false;
        if (!relevantContractIds.has(String(vessel.contractId))) return false;
        return getMonthKey(getVesselActivityDate(vessel)) === monthKey;
      })
      .map((vessel) => {
        const contract =
          contracts.find((item) => String(item.id) === String(vessel.contractId)) ?? null;
        const relatedRequest =
          contract?.requestId != null
            ? requests.find((request) => String(request.id) === String(contract.requestId)) ?? null
            : null;
        const relatedNeed =
          relatedRequest?.needId != null
            ? needs.find((need) => need.id === String(relatedRequest.needId)) ?? null
            : null;

        return {
          vessel,
          contract,
          relatedRequest,
          relatedNeed,
          dischargedQuantity: toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0),
          activityDate: getVesselActivityDate(vessel) ?? null,
          monthKey: getMonthKey(getVesselActivityDate(vessel)),
        } satisfies DischargedVesselInfo;
      });
  }, [vessels, needProgress, contracts, requests, needs, monthKey]);

  const isLoading = needsLoading || requestsLoading || contractsLoading || vesselsLoading;
  const error = (needsError || requestsError || contractsError || vesselsError) ?? null;

  return {
    needs: needProgress,
    summary,
    dischargedVessels,
    isLoading,
    error,
  };
}
