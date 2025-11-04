import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShipWheel } from "lucide-react";
import type { DischargedVesselInfo } from "@/types/needs";

interface DischargedVesselsCardProps {
  vessels: DischargedVesselInfo[];
  monthKey: string;
}

const formatDate = (value: string | null) => {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatQuantity = (value: number) => `${Math.round(value).toLocaleString()} tons`;

export function DischargedVesselsCard({ vessels, monthKey }: DischargedVesselsCardProps) {
  return (
    <Card className="border border-secondary-200 bg-white shadow-soft">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
          <ShipWheel className="h-5 w-5 text-primary-600" />
          Vessels discharged in {monthKey}
        </CardTitle>
        <p className="text-sm text-secondary-500">
          Linking discharge activity back to the needs it fulfills.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {vessels.length === 0 ? (
          <div className="py-10 text-center text-secondary-500">No discharge activity captured this month.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel</TableHead>
                <TableHead>Related need</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Discharged</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vessels.map((entry) => (
                <TableRow key={entry.vessel.id}>
                  <TableCell className="font-semibold text-secondary-900">
                    {entry.vessel.vesselName ?? `Vessel #${entry.vessel.id}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-secondary-900">
                        {entry.relatedRequest?.description ?? "Unlinked need"}
                      </span>
                      {entry.contract?.publicId && (
                        <span className="text-xs text-secondary-500">Contract {entry.contract.publicId}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-secondary-200">
                      {entry.relatedRequest?.supplierName ?? "Unknown supplier"}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.vessel.cargoType ?? "Not specified"}</TableCell>
                  <TableCell>{formatQuantity(entry.dischargedQuantity)}</TableCell>
                  <TableCell>
                    <Badge className="bg-primary-100 text-primary-700 border-transparent">
                      {entry.vessel.status ?? "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(entry.activityDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
