import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MapPin, RefreshCw, Ship } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";
import { isUnauthorizedError } from "@/lib/authUtils";
import { buildPortsLogisticsQueryKey } from "@/features/logistics/api";
import type { PortLogisticsStats } from "@/features/logistics/types";
import {
  DEFAULT_ALERT_THRESHOLD,
  deriveRedistributionOptions,
  describeRedistributionOption,
  isCapacityAlertActive,
} from "@/features/logistics/recommendations";

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  })}${suffix}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const metricClass = "rounded-xl border border-secondary-200/60 bg-white/60 dark:bg-slate-900/40 p-4 flex flex-col gap-1";

export default function PortsLogisticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { redirectToLogin } = useUnauthorizedRedirect({
    isAuthenticated,
    isLoading: authLoading,
  });

  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [portFilter, setPortFilter] = useState<string>("all");
  const [threshold, setThreshold] = useState<number>(DEFAULT_ALERT_THRESHOLD * 100);
  const [activePort, setActivePort] = useState<PortLogisticsStats | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const thresholdFraction = threshold / 100;

  const queryKey = useMemo(
    () =>
      buildPortsLogisticsQueryKey({
        region: regionFilter === "all" ? undefined : regionFilter,
        portId: portFilter === "all" ? undefined : portFilter,
        alertThreshold: Number.isFinite(thresholdFraction)
          ? Number(thresholdFraction.toFixed(2))
          : DEFAULT_ALERT_THRESHOLD,
      }),
    [regionFilter, portFilter, thresholdFraction],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PortLogisticsStats[]>({
    queryKey,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      redirectToLogin();
    }
  }, [error, redirectToLogin]);

  const ports = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const regions = useMemo(() => {
    const values = new Set<string>();
    ports.forEach((port) => {
      if (port.region) {
        values.add(port.region);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [ports]);

  const portOptions = useMemo(() => {
    const relevantPorts =
      regionFilter === "all"
        ? ports
        : ports.filter((port) => (port.region ?? "").toLowerCase() === regionFilter.toLowerCase());

    return relevantPorts
      .map((port) => ({ id: port.portId, name: port.portName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ports, regionFilter]);

  const redistributionPlan = useMemo(
    () => (activePort ? deriveRedistributionOptions(activePort, ports) : []),
    [activePort, ports],
  );

  useEffect(() => {
    if (!planDialogOpen) {
      setActivePort(null);
    }
  }, [planDialogOpen]);

  const handleOpenPlan = (port: PortLogisticsStats) => {
    setActivePort(port);
    setPlanDialogOpen(true);
  };

  const handleRegionChange = (value: string) => {
    setRegionFilter(value);
    setPortFilter("all");
  };

  const handleThresholdChange = (values: number[]) => {
    if (values && values[0] !== undefined) {
      setThreshold(Math.round(values[0]));
    }
  };

  const renderAssignmentsTable = (port: PortLogisticsStats) => {
    const assignments = port.assignments.slice(0, 8);
    if (assignments.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-secondary-200/60 p-6 text-center text-sm text-secondary-500 dark:border-slate-700 dark:text-slate-400">
          No vessels scheduled.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Vessel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>ETD</TableHead>
              <TableHead className="text-right">Quantity (t)</TableHead>
              <TableHead className="text-center">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={`${port.portId}-${assignment.vesselId}`}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Ship className="h-4 w-4 text-primary-500" />
                  <span>{assignment.vesselName}</span>
                </TableCell>
                <TableCell className="text-sm text-secondary-600 dark:text-slate-400">
                  {assignment.vesselStatus ?? "-"}
                </TableCell>
                <TableCell>{formatDate(assignment.eta ?? undefined)}</TableCell>
                <TableCell>{formatDate(assignment.etd ?? undefined)}</TableCell>
                <TableCell className="text-right">{formatNumber(assignment.quantity ?? null)}</TableCell>
                <TableCell className="text-center">
                  {assignment.isForecast ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                      Forecast
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                      Confirmed
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const alertingPorts = ports.filter((port) => isCapacityAlertActive(port, thresholdFraction));

  return (
    <MainLayout
      title="Ports logistics overview"
      subtitle="Monitor port capacity, scheduled vessels, and proactive redistribution suggestions"
    >
      <div className="flex flex-col gap-6">
        <Card className="shadow-none border border-secondary-200/70 dark:border-slate-800/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Planner controls</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={regionFilter} onValueChange={handleRegionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Select
                value={portFilter}
                onValueChange={setPortFilter}
                disabled={portOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All ports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ports</SelectItem>
                  {portOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Capacity alert threshold ({Math.round(thresholdFraction * 100)}%)</Label>
              <Slider
                value={[threshold]}
                onValueChange={handleThresholdChange}
                min={50}
                max={95}
                step={1}
              />
              <p className="text-xs text-secondary-500 dark:text-slate-400">
                Ports at or above this utilisation trigger redistribution recommendations.
              </p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card
                key={index}
                className="border border-secondary-200/60 dark:border-slate-800/60 shadow-none"
              >
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : ports.length === 0 ? (
          <Card className="border border-dashed border-secondary-200/80 dark:border-slate-800/80 shadow-none">
            <CardContent className="py-12 text-center text-secondary-500 dark:text-slate-400">
              No port logistics data available.
              <div className="mt-3">
                <Button variant="ghost" onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {alertingPorts.length > 0 && (
              <Card className="border border-amber-300/70 bg-amber-50/80 dark:border-amber-400/50 dark:bg-amber-500/10">
                <CardContent className="py-4 flex items-center gap-3 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span>
                    {alertingPorts.length} port{alertingPorts.length === 1 ? " is" : "s are"} over the alert threshold. Review
                    redistribution plans to avoid congestion.
                  </span>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {ports.map((port) => {
                const utilisationPercent = Math.round(port.capacityUtilization * 100);
                const hasAlert = isCapacityAlertActive(port, thresholdFraction);
                return (
                  <Card
                    key={port.portId}
                    className={`border ${
                      hasAlert
                        ? "border-amber-400 shadow-[0_12px_40px_-24px_rgba(217,119,6,0.6)]"
                        : "border-secondary-200/70 dark:border-slate-800/70 shadow-none"
                    }`}
                  >
                    <CardHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl font-semibold text-secondary-900 dark:text-white">
                            {port.portName}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-secondary-600 dark:text-slate-400">
                            {port.region && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {port.region}
                              </span>
                            )}
                            {port.country && <span>{port.country}</span>}
                          </div>
                        </div>
                        {hasAlert ? (
                          <Badge variant="destructive" className="bg-amber-500 text-white">
                            Capacity alert
                          </Badge>
                        ) : (
                          <Badge variant="outline">Stable</Badge>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-secondary-600 dark:text-slate-400">
                          <span>Berth utilisation</span>
                          <span>{utilisationPercent}%</span>
                        </div>
                        <Progress value={utilisationPercent} className="h-2" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={metricClass}>
                          <span className="text-xs uppercase text-secondary-500 tracking-wide">Assigned vessels</span>
                          <span className="text-2xl font-semibold text-secondary-900 dark:text-white">
                            {port.assignedVessels}
                          </span>
                        </div>
                        <div className={metricClass}>
                          <span className="text-xs uppercase text-secondary-500 tracking-wide">Active berths</span>
                          <span className="text-2xl font-semibold text-secondary-900 dark:text-white">
                            {port.occupiedBerths}
                          </span>
                          <span className="text-xs text-secondary-500 dark:text-slate-400">
                            {port.availableBerths} berth{port.availableBerths === 1 ? "" : "s"} free
                          </span>
                        </div>
                        <div className={metricClass}>
                          <span className="text-xs uppercase text-secondary-500 tracking-wide">Committed volume</span>
                          <span className="text-2xl font-semibold text-secondary-900 dark:text-white">
                            {formatNumber(port.totalAssignedQuantity ?? null, " t")}
                          </span>
                          <span className="text-xs text-secondary-500 dark:text-slate-400">
                            Remaining storage: {formatNumber(port.remainingStorageCapacity ?? null, " t")}
                          </span>
                        </div>
                        <div className={metricClass}>
                          <span className="text-xs uppercase text-secondary-500 tracking-wide">Next arrival</span>
                          <span className="text-sm text-secondary-800 dark:text-slate-200">
                            {formatDate(port.nextArrival ?? undefined)}
                          </span>
                          {port.upcomingArrivals.length > 0 && (
                            <span className="text-xs text-secondary-500 dark:text-slate-400">
                              {port.upcomingArrivals.length} upcoming arrival{port.upcomingArrivals.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-secondary-800 dark:text-slate-200">
                            Vessel schedule
                          </h4>
                          {hasAlert && (
                            <Button size="sm" variant="secondary" onClick={() => handleOpenPlan(port)}>
                              View redistribution
                            </Button>
                          )}
                        </div>
                        {renderAssignmentsTable(port)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {activePort ? `Redistribution plan for ${activePort.portName}` : "Redistribution plan"}
            </DialogTitle>
          </DialogHeader>
          {activePort ? (
            <div className="space-y-4">
              {redistributionPlan.length === 0 ? (
                <div className="rounded-lg border border-dashed border-secondary-200/60 p-6 text-center text-sm text-secondary-500 dark:border-slate-700 dark:text-slate-400">
                  No alternative ports currently offer spare capacity.
                </div>
              ) : (
                <div className="space-y-3">
                  {redistributionPlan.map((option) => (
                    <div
                      key={option.targetPortId}
                      className="rounded-xl border border-secondary-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-900/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-secondary-900 dark:text-white">
                            {option.targetPortName}
                          </p>
                          <p className="text-xs text-secondary-500 dark:text-slate-400">
                            {describeRedistributionOption(option)}
                          </p>
                        </div>
                        <Badge variant="outline">{option.targetRegion ?? "N/A"}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-secondary-600 dark:text-slate-300">
                        {option.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
