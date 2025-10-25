import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { SUPPLIER_FILTER_SEPARATOR } from '@/types/reports';
import type { SupplierFilterOption, SupplierFilterValue } from '@/types/reports';
import type {
  Contract,
  Vessel,
  Request,
  DateRange,
  SupplierData,
  QuantityMetrics,
  DisplayTotals,
  VesselWithContract,
} from '@/lib/schemas';

interface UseReportsDataProps {
  selectedSupplier: string | null;
  selectedCountry: string | null;
  dateRange: DateRange;
}

export function useReportsData({ selectedSupplier, selectedCountry, dateRange }: UseReportsDataProps) {
  const { isAuthenticated } = useAuth();

  const normalizeSupplierName = (name?: string | null) => {
    if (typeof name !== 'string') return null;
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const getSupplierKey = (name?: string | null) => {
    const normalized = normalizeSupplierName(name);
    return normalized ? normalized.toLowerCase() : null;
  };

  const parseSupplierFilterValue = (value: string | null): SupplierFilterValue | null => {
    if (!value) return null;

    const [contractId, supplierKey] = value.split(SUPPLIER_FILTER_SEPARATOR);

    if (!contractId || !supplierKey) {
      return null;
    }

    return { contractId, supplierKey } satisfies SupplierFilterValue;
  };

  const buildSupplierFilterValue = (contract: Contract): SupplierFilterValue | null => {
    const supplierKey = getSupplierKey(contract.supplierName);
    const contractId = contract.id != null ? String(contract.id) : null;

    if (!supplierKey || !contractId) {
      return null;
    }

    return { contractId, supplierKey } satisfies SupplierFilterValue;
  };

  const serializeSupplierFilterValue = (value: SupplierFilterValue): string =>
    `${value.contractId}${SUPPLIER_FILTER_SEPARATOR}${value.supplierKey}`;

  const selectedSupplierFilter = useMemo(
    () => parseSupplierFilterValue(selectedSupplier),
    [selectedSupplier],
  );

  // Fetch data with proper types
  const { data: contracts = [], isLoading: contractsLoading, error: contractsError } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  const { data: vessels = [], isLoading: vesselsLoading, error: vesselsError } = useQuery<Vessel[]>({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
  });

  const { data: requests = [], isLoading: requestsLoading, error: requestsError } = useQuery<Request[]>({
    queryKey: ["/api/requests"],
    enabled: isAuthenticated,
  });

  // Helper function to filter data by date range
  const filterByDateRange = useMemo(() => {
    return <T extends { createdAt?: string }>(data: T[], dateField: keyof T = 'createdAt' as keyof T): T[] => {
      if (!dateRange.from && !dateRange.to) return data;
      
      return data.filter((item: T) => {
        const itemDate = new Date(item[dateField] as string);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        
        if (fromDate && toDate) {
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          return itemDate >= fromDate;
        } else if (toDate) {
          return itemDate <= toDate;
        }
        return true;
      });
    };
  }, [dateRange]);

  // Apply date filtering
  const filteredContracts = useMemo(() => 
    filterByDateRange(contracts), 
    [contracts, filterByDateRange]
  );

  const filteredVesselsForDateRange = useMemo(() =>
    filterByDateRange(vessels),
    [vessels, filterByDateRange]
  );

  // Apply supplier and country filters
  const filteredVessels = useMemo(
    () =>
      filteredVesselsForDateRange.filter((vessel: Vessel) => {
        const contract = filteredContracts.find((c: Contract) => c.id === vessel.contractId);

        const supplierMatch = selectedSupplierFilter
          ? contract != null &&
            getSupplierKey(contract.supplierName) === selectedSupplierFilter.supplierKey &&
            String(contract.id) === selectedSupplierFilter.contractId
          : true;
        const countryMatch = selectedCountry ? vessel.countryOfOrigin === selectedCountry : true;

        return supplierMatch && countryMatch;
      }),
    [filteredVesselsForDateRange, filteredContracts, selectedSupplierFilter, selectedCountry]
  );

  // Process suppliers data
  const suppliersData = useMemo((): SupplierData[] => {
    const suppliersMap = new Map<string, SupplierData>();

    filteredContracts.forEach((contract: Contract) => {
      const supplierName = normalizeSupplierName(contract.supplierName) ?? 'Unknown Supplier';
      const supplierKey = getSupplierKey(contract.supplierName) ?? 'unknown-supplier';

      const contractQuantity = Number(contract.quantity ?? 0);
      const vesselsForContract = filteredVesselsForDateRange.filter((v: Vessel) => v.contractId === contract.id).length;

      const existing = suppliersMap.get(supplierKey);

      if (existing) {
        existing.contracts += 1;
        existing.quantity += contractQuantity;
        existing.vessels += vesselsForContract;
      } else {
        suppliersMap.set(supplierKey, {
          supplier: supplierName,
          vessels: vesselsForContract,
          quantity: contractQuantity,
          contracts: 1,
        });
      }
    });

    return Array.from(suppliersMap.values());
  }, [filteredContracts, filteredVesselsForDateRange]);

  // Calculate quantity metrics
  const calculateQuantityMetrics = useMemo(() => {
    return (contracts: Contract[], vessels: Vessel[]): QuantityMetrics => {
      const totalContracted = contracts.reduce(
        (sum: number, contract: Contract) => sum + Number(contract.quantity ?? 0),
        0,
      );

      const arrivedQuantity = vessels.reduce((sum: number, vessel: Vessel) => {
        const discharged = vessel.dischargedQuantity ?? vessel.quantity ?? 0;
        return sum + Number(discharged);
      }, 0);

      const remainingQuantity = Math.max(totalContracted - arrivedQuantity, 0);

      return {
        totalContracted,
        arrivedQuantity,
        remainingQuantity,
      };
    };
  }, []);

  // Get metrics for selected filters
  const relevantContracts = useMemo(() => {
    const supplierFiltered = selectedSupplierFilter
      ? filteredContracts.filter(
          (c: Contract) =>
            getSupplierKey(c.supplierName) === selectedSupplierFilter.supplierKey &&
            String(c.id) === selectedSupplierFilter.contractId,
        )
      : filteredContracts;

    if (!selectedCountry) {
      return supplierFiltered;
    }

    const contractIdsFromVessels = new Set(
      filteredVessels
        .map((vessel) => (vessel.contractId != null ? String(vessel.contractId) : null))
        .filter((contractId): contractId is string => Boolean(contractId)),
    );

    if (contractIdsFromVessels.size === 0) {
      return [];
    }

    return supplierFiltered.filter((contract) => contractIdsFromVessels.has(String(contract.id)));
  }, [filteredContracts, filteredVessels, selectedSupplierFilter, selectedCountry]);

  const quantityMetrics = useMemo(
    () => calculateQuantityMetrics(relevantContracts, filteredVessels),
    [calculateQuantityMetrics, relevantContracts, filteredVessels]
  );

  // Calculate display totals
  const displayTotals = useMemo((): DisplayTotals => {
    const supplierCount = selectedSupplier
      ? 1
      : new Set(
          relevantContracts
            .map((contract) => getSupplierKey(contract.supplierName))
            .filter((name): name is string => Boolean(name)),
        ).size;

    return {
      totalSuppliers: supplierCount,
      totalVessels: filteredVessels.length,
      totalContracts: relevantContracts.length,
      totalContracted: quantityMetrics.totalContracted,
      arrivedQuantity: quantityMetrics.arrivedQuantity,
      remainingQuantity: quantityMetrics.remainingQuantity,
    } satisfies DisplayTotals;
  }, [filteredVessels, quantityMetrics, relevantContracts, selectedSupplier]);

  // Get unique suppliers for dropdown
  const availableSuppliers = useMemo(() => {
    const seenValues = new Set<string>();
    const suppliers: SupplierFilterOption[] = [];

    filteredContracts.forEach((contract: Contract) => {
      const normalizedName = normalizeSupplierName(contract.supplierName) ?? 'Unknown Supplier';
      const supplierValue = buildSupplierFilterValue(contract);

      if (!supplierValue) {
        return;
      }

      const value = serializeSupplierFilterValue(supplierValue);

      if (seenValues.has(value)) {
        return;
      }

      seenValues.add(value);

      const contractLabel = contract.publicId ?? String(contract.id);

      suppliers.push({
        value,
        label: `${normalizedName} (Contract ${contractLabel})`,
      });
    });

    return suppliers;
  }, [filteredContracts]);

  const selectedSupplierLabel = useMemo(() => {
    if (!selectedSupplier) {
      return null;
    }

    return availableSuppliers.find((option) => option.value === selectedSupplier)?.label ?? null;
  }, [availableSuppliers, selectedSupplier]);

  // Get supplier-specific data
  const selectedSupplierData = useMemo(() => {
    if (!selectedSupplierFilter) return null;

    const supplierContracts = filteredContracts.filter(
      (c: Contract) =>
        getSupplierKey(c.supplierName) === selectedSupplierFilter.supplierKey &&
        String(c.id) === selectedSupplierFilter.contractId,
    );

    const vesselMatchesSupplier = (vessel: Vessel) => {
      const vesselContractId = vessel.contractId != null ? String(vessel.contractId) : null;
      if (!vesselContractId) return false;

      return supplierContracts.some((contract) => String(contract.id) === vesselContractId);
    };

    const vesselsForSupplier = filteredVesselsForDateRange.filter(vesselMatchesSupplier);
    const filteredSupplierVessels = filteredVessels.filter(vesselMatchesSupplier);

    const totalQuantity = supplierContracts.reduce(
      (sum: number, contract: Contract) => sum + Number(contract.quantity ?? 0),
      0,
    );

    return {
      supplier: selectedSupplierLabel ?? selectedSupplier ?? 'Unknown Supplier',
      vessels: selectedCountry ? filteredSupplierVessels.length : vesselsForSupplier.length,
      quantity: totalQuantity,
      contracts: supplierContracts.length,
    } satisfies SupplierData;
  }, [
    selectedSupplier,
    selectedSupplierFilter,
    selectedSupplierLabel,
    filteredContracts,
    filteredVesselsForDateRange,
    filteredVessels,
    selectedCountry,
  ]);

  // Prepare vessels data with contract information
  const vesselsWithContractInfo = useMemo((): VesselWithContract[] =>
    filteredVessels.map((vessel: Vessel) => {
      const contract = filteredContracts.find((c: Contract) => c.id === vessel.contractId);
      const contractReportId = contract?.id ?? vessel.contractId ?? null;

      return {
        ...vessel,
        supplierName: normalizeSupplierName(contract?.supplierName) ?? 'Unknown',
        contractQuantity: Number(contract?.quantity ?? 0),
        contractPublicId: contract?.publicId ?? null,
        contractReportId: contractReportId != null ? String(contractReportId) : null,
      };
    }),
    [filteredVessels, filteredContracts]
  );

  const isLoading = contractsLoading || vesselsLoading || requestsLoading;
  const error = contractsError || vesselsError || requestsError;

  return {
    // Data
    contracts: filteredContracts,
    vessels: filteredVesselsForDateRange,
    requests,
    
    // Processed data
    suppliersData,
    selectedSupplierData,
    displayTotals,
    filteredVessels,
    availableSuppliers,
    selectedSupplierLabel,
    vesselsWithContractInfo,
    quantityMetrics,
    
    // Loading and error states
    isLoading,
    error,
  };
}