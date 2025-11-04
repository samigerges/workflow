import type { Request, Contract, Vessel } from "@/lib/schemas";

export interface SupplierOption {
  value: string;
  label: string;
}

export interface NeedProgress {
  request: Request;
  contracts: Contract[];
  vessels: Vessel[];
  dischargedThisMonth: number;
  totalDischarged: number;
  remainingQuantity: number;
  overallFulfillmentRate: number;
  monthFulfillmentRate: number;
  isFulfilled: boolean;
  isUnassigned: boolean;
}

export interface NeedsSummary {
  monthKey: string;
  totalNeeds: number;
  totalRequestedQuantity: number;
  totalDischargedQuantity: number;
  overallDischargedQuantity: number;
  pendingQuantity: number;
  backlogQuantity: number;
  fulfilledNeeds: number;
  inProgressNeeds: number;
  unassignedNeeds: number;
  fulfillmentRate: number;
}

export interface DischargedVesselInfo {
  vessel: Vessel;
  contract: Contract | null;
  relatedRequest: Request | null;
  dischargedQuantity: number;
  activityDate: string | null;
  monthKey: string | null;
}
