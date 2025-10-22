export interface PortVesselAssignment {
  vesselId: string;
  vesselName: string;
  vesselStatus?: string | null;
  eta?: string | null;
  etd?: string | null;
  quantity?: number | null;
  isForecast: boolean;
}

export interface PortUpcomingArrival {
  vesselId: string;
  vesselName: string;
  eta?: string | null;
  isForecast: boolean;
}

export interface PortRedistributionOption {
  targetPortId: string;
  targetPortName: string;
  targetRegion?: string | null;
  capacityUtilization: number;
  availableBerths: number;
  additionalCapacity?: number | null;
  rationale: string;
}

export interface PortLogisticsStats {
  portId: string;
  portName: string;
  region?: string | null;
  country?: string | null;
  maxConcurrentVessels?: number | null;
  storageCapacity?: number | null;
  dailyThroughputCapacity?: number | null;
  assignedVessels: number;
  occupiedBerths: number;
  availableBerths: number;
  capacityUtilization: number;
  capacityAlert: boolean;
  totalAssignedQuantity?: number | null;
  remainingStorageCapacity?: number | null;
  nextArrival?: string | null;
  upcomingArrivals: PortUpcomingArrival[];
  assignments: PortVesselAssignment[];
  redistributionOptions: PortRedistributionOption[];
}

export interface PortsLogisticsFilters {
  region?: string;
  portId?: string;
  alertThreshold?: number;
}
