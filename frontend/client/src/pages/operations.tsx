import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReportsData } from "@/hooks/useReportsData";
import MainLayout from "@/components/layout/main-layout";
import { FiltersSection } from "@/components/reports/FiltersSection";
import { KpiCards } from "@/components/reports/KpiCards";
import { VesselsTable } from "@/components/reports/VesselsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { DateRange } from "@/lib/schemas";



export default function Reports() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  const {
    displayTotals,
    availableSuppliers,
    vesselsWithContractInfo,
    vessels,
    isLoading: dataLoading,
    error,
  } = useReportsData({ selectedSupplier, selectedCountry, dateRange });

  // Callback functions for better performance
  const handleClearAllFilters = useCallback(() => {
    setDateRange({ from: "", to: "" });
    setSelectedSupplier(null);
    setSelectedCountry(null);
  }, []);

  const handleClearVesselFilters = useCallback(() => {
    setSelectedSupplier(null);
    setSelectedCountry(null);
  }, []);

  const handleExport = useCallback(() => {
    // Export functionality can be implemented here
    console.log('Export functionality to be implemented');
  }, []);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-secondary-600">Loading reports...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Error handling
  if (error) {
    return (
      <MainLayout title="Reports" subtitle="Comprehensive reports and analytics">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load reports data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reports" subtitle="Comprehensive reports and analytics with date filtering">
      <div className="p-6 space-y-6">
        <FiltersSection
          dateRange={dateRange}
          selectedSupplier={selectedSupplier}
          selectedCountry={selectedCountry}
          availableSuppliers={availableSuppliers}
          onDateRangeChange={setDateRange}
          onSupplierChange={setSelectedSupplier}
          onCountryChange={setSelectedCountry}
          onClearAll={handleClearAllFilters}
          onExport={handleExport}
        />

        <KpiCards
          displayTotals={displayTotals}
          selectedSupplier={selectedSupplier}
        />

        <VesselsTable
          vesselsWithContractInfo={vesselsWithContractInfo}
          selectedSupplier={selectedSupplier}
          selectedCountry={selectedCountry}
          dateRange={dateRange}
          onSupplierSelect={setSelectedSupplier}
          onCountrySelect={setSelectedCountry}
          onClearFilters={handleClearVesselFilters}
          totalVesselsCount={vessels.length}
        />
      </div>
    </MainLayout>
  );
}