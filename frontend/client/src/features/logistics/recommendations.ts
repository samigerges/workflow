import type {
  PortLogisticsStats,
  PortRedistributionOption,
} from "./types";

export const DEFAULT_ALERT_THRESHOLD = 0.8;

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "-";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  });
};

export const deriveRedistributionOptions = (
  port: PortLogisticsStats,
  network: PortLogisticsStats[],
): PortRedistributionOption[] => {
  if (port.redistributionOptions && port.redistributionOptions.length > 0) {
    return port.redistributionOptions;
  }

  return network
    .filter((candidate) => candidate.portId !== port.portId)
    .sort((a, b) => {
      const utilizationDiff = a.capacityUtilization - b.capacityUtilization;
      if (utilizationDiff !== 0) {
        return utilizationDiff;
      }
      return b.availableBerths - a.availableBerths;
    })
    .slice(0, 3)
    .map<PortRedistributionOption>((candidate) => ({
      targetPortId: candidate.portId,
      targetPortName: candidate.portName,
      targetRegion: candidate.region ?? null,
      capacityUtilization: candidate.capacityUtilization,
      availableBerths: candidate.availableBerths,
      additionalCapacity: candidate.remainingStorageCapacity ?? null,
      rationale: `${candidate.portName} has ${candidate.availableBerths} open berth(s) and utilisation ${(candidate.capacityUtilization * 100).toFixed(0)}%`,
    }));
};

export const describeRedistributionOption = (
  option: PortRedistributionOption,
): string => {
  const utilisationLabel = `${Math.round(option.capacityUtilization * 100)}% utilised`;
  const berthsLabel = `${option.availableBerths} berth${option.availableBerths === 1 ? "" : "s"} free`;
  const capacityLabel =
    option.additionalCapacity === null || option.additionalCapacity === undefined
      ? null
      : `${formatNumber(option.additionalCapacity)} t free`;

  return [utilisationLabel, berthsLabel, capacityLabel]
    .filter(Boolean)
    .join(" · ");
};

export const isCapacityAlertActive = (
  port: PortLogisticsStats,
  threshold: number = DEFAULT_ALERT_THRESHOLD,
): boolean => {
  if (!port.maxConcurrentVessels || port.maxConcurrentVessels <= 0) {
    return false;
  }

  return port.capacityAlert || port.capacityUtilization >= threshold;
};
