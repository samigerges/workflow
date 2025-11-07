import { useMemo, useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/useAuth";
import { NeedsFilters } from "@/components/needs/NeedsFilters";
import { NeedsSummaryCards } from "@/components/needs/NeedsSummaryCards";
import { NeedsProgressTable } from "@/components/needs/NeedsProgressTable";
import { DischargedVesselsCard } from "@/components/needs/DischargedVesselsCard";
import StatementOfNeedsForm from "@/components/forms/statement-of-needs-form";
import { useNeedsData } from "@/hooks/useNeedsData";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Plus } from "lucide-react";

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
  const [isNeedDialogOpen, setIsNeedDialogOpen] = useState(false);

  const {
    needs,
    summary,
    dischargedVessels,
    isLoading,
    error,
  } = useNeedsData({ monthKey: selectedMonth });

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

  const monthLabel = useMemo(() => getMonthLabel(summary.monthKey), [summary.monthKey]);

  const handleReset = () => {
    setSelectedMonth(getCurrentMonthKey());
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
        <section className="rounded-lg border border-secondary-200 bg-white p-4 shadow-soft space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-secondary-900">Monthly scope</h2>
              <p className="text-sm text-secondary-600">
                Choose the reporting month to focus the needs overview.
              </p>
            </div>
            <Dialog open={isNeedDialogOpen} onOpenChange={setIsNeedDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Record Statement of Need
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Statement of Need</DialogTitle>
                </DialogHeader>
                <StatementOfNeedsForm
                  onSuccess={() => setIsNeedDialogOpen(false)}
                  onCancel={() => setIsNeedDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <NeedsFilters monthKey={selectedMonth} onMonthChange={setSelectedMonth} onReset={handleReset} />
        </section>

        <NeedsSummaryCards summary={summary} />

        <NeedsProgressTable needs={sortedNeeds} isLoading={false} />

        <DischargedVesselsCard vessels={dischargedVessels} monthKey={monthLabel} />
      </div>
    </MainLayout>
  );
}
