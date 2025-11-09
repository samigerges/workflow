import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Ship } from "lucide-react";
import type { NeedProgress } from "@/types/needs";

interface NeedsProgressTableProps {
  needs: NeedProgress[];
  isLoading: boolean;
}

const formatQuantity = (value: number, unit: string | undefined) => {
  const normalizedUnit = unit ? unit.toLowerCase() : "units";
  return `${Math.round(value).toLocaleString()} ${normalizedUnit}`;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface SupplierMetric {
  name: string;
  contracted: number;
  discharged: number;
}

const getSupplierMetrics = (entry: NeedProgress): SupplierMetric[] => {
  const supplierMap = new Map<string, SupplierMetric>();
  const contractIdToSupplier = new Map<string, string>();

  entry.contracts.forEach((contract) => {
    const supplierName = (contract.supplierName ?? "Unassigned").trim();
    const key = supplierName.toLowerCase();
    const contracted = toNumber(contract.quantity ?? 0);

    const existing = supplierMap.get(key) ?? {
      name: supplierName,
      contracted: 0,
      discharged: 0,
    };

    existing.contracted += contracted;
    existing.name = supplierName;
    supplierMap.set(key, existing);
    contractIdToSupplier.set(String(contract.id), key);
  });

  entry.vessels.forEach((vessel) => {
    const contractKey =
      vessel.contractId != null ? contractIdToSupplier.get(String(vessel.contractId)) : undefined;
    const fallbackKey = "unassigned";
    const key = contractKey ?? fallbackKey;
    const name = contractKey
      ? supplierMap.get(contractKey)?.name ?? "Unassigned"
      : "Unassigned";
    const discharged = toNumber(vessel.dischargedQuantity ?? vessel.quantity ?? 0);

    const existing = supplierMap.get(key) ?? {
      name,
      contracted: 0,
      discharged: 0,
    };

    existing.discharged += discharged;
    existing.name = name;
    supplierMap.set(key, existing);
  });

  entry.requests.forEach((request) => {
    if (!request.supplierName) {
      return;
    }

    const supplierName = request.supplierName.trim();
    if (!supplierName) {
      return;
    }

    const key = supplierName.toLowerCase();
    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        name: supplierName,
        contracted: 0,
        discharged: 0,
      });
    }
  });

  return Array.from(supplierMap.values()).sort((a, b) => b.contracted - a.contracted);
};

export function NeedsProgressTable({ needs, isLoading }: NeedsProgressTableProps) {
  if (isLoading) {
    return (
      <Card className="border border-secondary-200 bg-white shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-secondary-900">
            Needs fulfillment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (needs.length === 0) {
    return (
      <Card className="border border-dashed border-secondary-200 bg-white shadow-soft">
        <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-secondary-500">
          <Ship className="h-12 w-12 text-secondary-300" />
          <p className="text-base font-medium">No needs recorded for this month</p>
          <p className="text-sm text-secondary-400">Update the month or create new requests to track progress.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (entry: NeedProgress) => {
    if (entry.isFulfilled) {
      return <Badge className="bg-emerald-100 text-emerald-700 border-transparent">Fulfilled</Badge>;
    }

    if (entry.isUnassigned) {
      return <Badge className="bg-amber-100 text-amber-700 border-transparent">Unassigned</Badge>;
    }

    return <Badge className="bg-blue-100 text-blue-700 border-transparent">In progress</Badge>;
  };

  return (
    <Card className="border border-secondary-200 bg-white shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary-600" />
          Needs fulfillment overview
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Need</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Supplier discharge comparison</TableHead>
              <TableHead>Overall progress</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needs.map((entry) => {
              const overallPercent = Math.min(entry.overallFulfillmentRate * 100, 100);
              const supplierMetrics = getSupplierMetrics(entry);
              const maxSupplierValue = supplierMetrics.reduce(
                (max, metric) => Math.max(max, metric.contracted, metric.discharged),
                0,
              );
              return (
                <TableRow key={entry.need.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-secondary-900">
                        {entry.need.title}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-secondary-500">
                        {entry.need.category} · {entry.need.unitOfMeasure}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatQuantity(entry.need.requiredQuantity ?? 0, entry.need.unitOfMeasure)}</TableCell>
                  <TableCell>
                    {supplierMetrics.length === 0 ? (
                      <span className="text-xs text-secondary-500">No supplier assignments</span>
                    ) : (
                      <div className="flex flex-col gap-4 min-w-[220px]">
                        {supplierMetrics.map((metric) => {
                          const denominator = Math.max(maxSupplierValue, 1);
                          const contractedPercent = Math.min((metric.contracted / denominator) * 100, 100);
                          const dischargedPercent = Math.min((metric.discharged / denominator) * 100, 100);
                          return (
                            <div key={metric.name} className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-secondary-600">
                                <span className="font-medium text-secondary-800">{metric.name}</span>
                                <span className="text-[11px] text-secondary-500">
                                  {formatQuantity(metric.discharged, entry.need.unitOfMeasure)}
                                  {" "}/
                                  {formatQuantity(metric.contracted, entry.need.unitOfMeasure)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 flex-1 rounded-full bg-primary-100">
                                    <div
                                      className="h-2 rounded-full bg-primary-500"
                                      style={{ width: `${contractedPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold uppercase text-primary-700">
                                    Contract
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 flex-1 rounded-full bg-emerald-100">
                                    <div
                                      className="h-2 rounded-full bg-emerald-500"
                                      style={{ width: `${dischargedPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold uppercase text-emerald-700">
                                    Discharged
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-64">
                    <div className="flex flex-col gap-2">
                      <Progress value={overallPercent} className="h-2" />
                      <span className="text-xs text-secondary-500">{overallPercent.toFixed(1)}% fulfilled</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatQuantity(entry.remainingQuantity, entry.need.unitOfMeasure)}</TableCell>
                  <TableCell>{getStatusBadge(entry)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
