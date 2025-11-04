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
              <TableHead>Supplier</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Discharged this month</TableHead>
              <TableHead>Overall progress</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needs.map((entry) => {
              const overallPercent = Math.min(entry.overallFulfillmentRate * 100, 100);
              const monthPercent = Math.min(entry.monthFulfillmentRate * 100, 100);
              const primaryRequest = entry.primaryRequest;
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
                  <TableCell>
                    <span className="text-sm text-secondary-700 font-medium">
                      {primaryRequest?.supplierName ?? "Unassigned"}
                    </span>
                  </TableCell>
                  <TableCell>{formatQuantity(entry.need.requiredQuantity ?? 0, entry.need.unitOfMeasure)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-secondary-900">
                        {formatQuantity(entry.dischargedThisMonth, entry.need.unitOfMeasure)}
                      </span>
                      <span className="text-xs text-secondary-500">{monthPercent.toFixed(1)}% this month</span>
                    </div>
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
