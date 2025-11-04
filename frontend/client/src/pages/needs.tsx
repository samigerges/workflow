import { useMemo, useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/useAuth";
import { NeedsFilters } from "@/components/needs/NeedsFilters";
import { NeedsSummaryCards } from "@/components/needs/NeedsSummaryCards";
import { NeedsProgressTable } from "@/components/needs/NeedsProgressTable";
import { DischargedVesselsCard } from "@/components/needs/DischargedVesselsCard";
import { NeedsAlerts } from "@/components/needs/NeedsAlerts";
import { useNeedsData } from "@/hooks/useNeedsData";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function getCurrentMonthKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

function getMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function NeedsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthKey());
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const {
    needs,
    summary,
    dischargedVessels,
    availableSuppliers,
    supplierLabel,
    isLoading,
    error,
  } = useNeedsData({ monthKey: selectedMonth, supplier: selectedSupplier });

  const sortedNeeds = useMemo(() => {
    return [...needs].sort((a, b) => {
      if (a.isUnassigned !== b.isUnassigned) {
        return a.isUnassigned ? -1 : 1;
      }
      if (a.isFulfilled !== b.isFulfilled) {
        return a.isFulfilled ? 1 : -1;
      }
      return b.totalDischarged - a.totalDischarged;
    });
  }, [needs]);

  const backlogNeeds = useMemo(() => sortedNeeds.filter((need) => !need.isFulfilled), [sortedNeeds]);
  const unassignedNeeds = useMemo(() => sortedNeeds.filter((need) => need.isUnassigned), [sortedNeeds]);

  const monthLabel = useMemo(() => getMonthLabel(summary.monthKey), [summary.monthKey]);

  const handleReset = () => {
    setSelectedMonth(getCurrentMonthKey());
    setSelectedSupplier(null);
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout title="Needs" subtitle="Monthly overview of requirements and vessel discharge progress">
        <div className="min-h-[50vh] flex items-center justify-center text-secondary-500">
          Loading needs analytics…
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <MainLayout title="Needs" subtitle="Monthly overview of requirements and vessel discharge progress">
        <div className="p-6">
          <Alert variant="destructive" className="max-w-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We could not load the needs data. Please refresh the page or try again later.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Needs" subtitle="Monthly overview of requirements and vessel discharge progress">
      <div className="space-y-6">
        <NeedsFilters
          monthKey={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedSupplier={selectedSupplier}
          onSupplierChange={setSelectedSupplier}
          supplierOptions={availableSuppliers}
          onReset={handleReset}
        />

        <NeedsSummaryCards summary={summary} supplierLabel={supplierLabel} />

        <NeedsAlerts backlogNeeds={backlogNeeds} unassignedNeeds={unassignedNeeds} />

        <NeedsProgressTable needs={sortedNeeds} isLoading={false} />

        <DischargedVesselsCard vessels={dischargedVessels} monthKey={monthLabel} />
      </div>
    </MainLayout>
  );
}
