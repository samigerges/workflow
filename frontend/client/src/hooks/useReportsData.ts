import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { Contract, Vessel, Request, DateRange, SupplierData, QuantityMetrics, DisplayTotals, VesselWithContract } from '@/lib/schemas';

interface UseReportsDataProps {
  selectedSupplier: string | null;
  selectedCountry: string | null;
  dateRange: DateRange;
}

export function useReportsData({ selectedSupplier, selectedCountry, dateRange }: UseReportsDataProps) {
  const { isAuthenticated } = useAuth();

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

  // Process suppliers data
  const suppliersData = useMemo((): SupplierData[] => {
    return filteredContracts.reduce((acc: SupplierData[], contract: Contract) => {
      const supplierName = contract.supplierName || 'Unknown Supplier';
      const existing = acc.find(item => item.supplier === supplierName);
      
      if (existing) {
        existing.contracts += 1;
        existing.quantity += contract.quantity || 0;
        existing.vessels += filteredVesselsForDateRange.filter((v: Vessel) => v.contractId === contract.id).length;
      } else {
        acc.push({
          supplier: supplierName,
          vessels: filteredVesselsForDateRange.filter((v: Vessel) => v.contractId === contract.id).length,
          quantity: contract.quantity || 0,
          contracts: 1
        });
      }
      
      return acc;
    }, []);
  }, [filteredContracts, filteredVesselsForDateRange]);

  // Get supplier-specific data
  const selectedSupplierData = useMemo(() => 
    selectedSupplier ? suppliersData.find(s => s.supplier === selectedSupplier) : null,
    [selectedSupplier, suppliersData]
  );

  // Calculate quantity metrics
  const calculateQuantityMetrics = useMemo(() => {
    return (contracts: Contract[], vessels: Vessel[]): QuantityMetrics => {
      const totalContracted = contracts.reduce((sum: number, contract: Contract) => sum + (contract.quantity || 0), 0);
      
      // Calculate arrived quantity from discharged vessel quantities
      const arrivedQuantity = vessels.reduce((sum: number, vessel: Vessel) => {
        return sum + (vessel.dischargedQuantity || 0);
      }, 0);
      
      const remainingQuantity = totalContracted - arrivedQuantity;
      
      return {
        totalContracted,
        arrivedQuantity,
        remainingQuantity
      };
    };
  }, []);

  // Get metrics for selected supplier or all
  const relevantContracts = useMemo(() => 
    selectedSupplier 
      ? filteredContracts.filter((c: Contract) => c.supplierName === selectedSupplier)
      : filteredContracts,
    [selectedSupplier, filteredContracts]
  );

  const relevantVessels = useMemo(() => 
    selectedSupplier
      ? filteredVesselsForDateRange.filter((vessel: Vessel) => {
          const contract = filteredContracts.find((c: Contract) => c.id === vessel.contractId);
          return contract?.supplierName === selectedSupplier;
        })
      : filteredVesselsForDateRange,
    [selectedSupplier, filteredVesselsForDateRange, filteredContracts]
  );

  const quantityMetrics = useMemo(() => 
    calculateQuantityMetrics(relevantContracts, relevantVessels),
    [calculateQuantityMetrics, relevantContracts, relevantVessels]
  );

  // Calculate display totals
  const displayTotals = useMemo((): DisplayTotals => ({
    totalSuppliers: selectedSupplierData ? 1 : suppliersData.length,
    totalVessels: selectedSupplierData ? selectedSupplierData.vessels : filteredVesselsForDateRange.length,
    totalContracts: selectedSupplierData ? selectedSupplierData.contracts : filteredContracts.length,
    totalContracted: quantityMetrics.totalContracted || 0,
    arrivedQuantity: quantityMetrics.arrivedQuantity || 0,
    remainingQuantity: quantityMetrics.remainingQuantity || 0
  }), [selectedSupplierData, suppliersData, filteredVesselsForDateRange, filteredContracts, quantityMetrics]);

  // Filter vessels by selected criteria
  const filteredVessels = useMemo(() => 
    filteredVesselsForDateRange.filter((vessel: Vessel) => {
      const contract = filteredContracts.find((c: Contract) => c.id === vessel.contractId);
      
      const supplierMatch = selectedSupplier ? contract?.supplierName === selectedSupplier : true;
      const countryMatch = selectedCountry ? vessel.countryOfOrigin === selectedCountry : true;
      
      return supplierMatch && countryMatch;
    }), 
    [filteredVesselsForDateRange, filteredContracts, selectedSupplier, selectedCountry]
  );

  // Get unique suppliers for dropdown
  const availableSuppliers = useMemo(() => 
    Array.from(new Set(filteredContracts.map((c: Contract) => c.supplierName).filter(Boolean))) as string[],
    [filteredContracts]
  );

  // Prepare vessels data with contract information
  const vesselsWithContractInfo = useMemo((): VesselWithContract[] => 
    filteredVessels.map((vessel: Vessel) => {
      const contract = filteredContracts.find((c: Contract) => c.id === vessel.contractId);
      return {
        ...vessel,
        supplierName: contract?.supplierName || 'Unknown',
        contractQuantity: contract?.quantity || 0,
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
    vesselsWithContractInfo,
    quantityMetrics,
    
    // Loading and error states
    isLoading,
    error,
  };
}