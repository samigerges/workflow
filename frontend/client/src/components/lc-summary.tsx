import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { University, Calendar, FileText, ExternalLink, Ship, Users, ClipboardList } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/ui/status-badge";
import {
  normalizeLc,
  formatLcCurrency,
  formatLcDate,
  isLcExpired,
  daysUntilLcExpiry,
  type NormalizedLC,
} from "@/lib/lc";

interface LCSummaryProps {
  lc: any;
  isOpen: boolean;
  onClose: () => void;
}

function buildDetailItems(lc: NormalizedLC) {
  const shipmentFrom = formatLcDate(lc.shipmentPeriodStart);
  const shipmentTo = formatLcDate(lc.shipmentPeriodEnd);
  const shipmentLabel =
    shipmentFrom === "—" && shipmentTo === "—"
      ? "—"
      : `${shipmentFrom !== "—" ? shipmentFrom : "—"} → ${shipmentTo !== "—" ? shipmentTo : "—"}`;

  return [
    { label: "LC Number", value: lc.number },
    { label: "Cargo Type", value: lc.cargoType ?? "—" },
    {
      label: "Quantity",
      value: typeof lc.quantity === "number" ? lc.quantity.toLocaleString() : "—",
    },
    {
      label: "Price per Unit",
      value: formatLcCurrency(lc.pricePerUnit, lc.currency),
    },
    { label: "Total Price", value: formatLcCurrency(lc.amount, lc.currency) },
    { label: "Issuing Bank", value: lc.issuingBank ?? "—" },
    {
      label: "Journey",
      value: lc.flowKey === "gasc_to_upf" ? "LC GASC → UPF" : "UPF → Supplier",
    },
    { label: "Shipment Period", value: shipmentLabel },
    { label: "Issue Date", value: formatLcDate(lc.issueDate) },
    {
      label: "Expiry Date",
      value: formatLcDate(lc.expiryDate),
      highlight: isLcExpired(lc.expiryDate),
    },
  ];
}

export default function LCSummary({ lc, isOpen, onClose }: LCSummaryProps) {
  const normalizedLc = useMemo(() => (lc ? normalizeLc(lc) : null), [lc]);

  const { data: vessels } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isOpen && !!normalizedLc?.id,
  });

  const { data: lcVesselRelations, isLoading: lcVesselRelationsLoading } = useQuery({
    queryKey: normalizedLc?.id ? [`/api/letters-of-credit/${normalizedLc.id}/vessels`] : [],
    enabled: isOpen && !!normalizedLc?.id,
  });

  const lcVessels = useMemo(() => {
    if (!Array.isArray(vessels) || !Array.isArray(lcVesselRelations)) return [];
    return vessels.filter((vessel: any) =>
      lcVesselRelations.some((relation: any) => relation.vesselId === vessel.id),
    );
  }, [vessels, lcVesselRelations]);

  const totalAllocatedQuantity = useMemo(() => {
    if (!Array.isArray(lcVesselRelations)) return 0;
    return lcVesselRelations.reduce(
      (sum: number, relation: any) => sum + (Number(relation.quantity) || 0),
      0,
    );
  }, [lcVesselRelations]);

  if (!lc || !normalizedLc) return null;

  const expiryExpired = isLcExpired(normalizedLc.expiryDate);
  const createdDateLabel = normalizedLc.createdAt ? formatLcDate(normalizedLc.createdAt) : null;
  const updatedDateLabel = normalizedLc.updatedAt ? formatLcDate(normalizedLc.updatedAt) : null;
  const expiryCountdown = daysUntilLcExpiry(normalizedLc.expiryDate);
  const detailItems = buildDetailItems(normalizedLc);
  const supplierAllocations = normalizedLc.supplierAllocations;
  const supplierAllocationCount = supplierAllocations.length;
  const totalSupplierQuantity = supplierAllocations.reduce(
    (sum, allocation) => sum + (allocation.quantity ?? 0),
    0,
  );
  const totalSupplierAmount = supplierAllocations.reduce(
    (sum, allocation) => sum + (allocation.amount ?? 0),
    0,
  );
  const lcQuantity = typeof normalizedLc.quantity === "number" ? normalizedLc.quantity : null;
  const remainingQuantity =
    lcQuantity !== null ? Math.max(lcQuantity - totalAllocatedQuantity, 0) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <University className="h-5 w-5" />
            <span>Letter of Credit Summary - {normalizedLc.number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={normalizedLc.statusKey} type="lc" />
            {expiryExpired && <Badge className="bg-red-100 text-red-800">Expired</Badge>}
            {typeof expiryCountdown === "number" && expiryCountdown > 0 && expiryCountdown <= 30 && (
              <Badge className="bg-orange-100 text-orange-800">
                Expires in {expiryCountdown} day{expiryCountdown === 1 ? "" : "s"}
              </Badge>
            )}
            {createdDateLabel && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {createdDateLabel}</span>
              </div>
            )}
            {updatedDateLabel && (
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Updated: {updatedDateLabel}</span>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">LC Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detailItems.map((item) => (
                  <div key={item.label}>
                    <h4 className="text-sm font-medium text-gray-500">{item.label}</h4>
                    <p
                      className={`text-gray-900 font-semibold ${
                        item.highlight ? "text-red-600" : ""
                      }`}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {normalizedLc.fileUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uploaded Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">
                      {normalizedLc.fileName || "LC Document"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(normalizedLc.fileUrl ?? "", "_blank", "noopener");
                    }}
                    className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    View Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}


          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Supplier Allocations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-indigo-600">Suppliers</div>
                  <div className="text-xl font-bold text-indigo-900">{supplierAllocationCount}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-emerald-600">Allocated Quantity</div>
                  <div className="text-xl font-bold text-emerald-900">
                    {totalSupplierQuantity.toLocaleString()} tons
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-amber-600">Allocated Amount</div>
                  <div className="text-xl font-bold text-amber-900">
                    {supplierAllocationCount > 0
                      ? formatLcCurrency(totalSupplierAmount, normalizedLc.currency)
                      : "—"}
                  </div>
                </div>
              </div>

              {supplierAllocationCount > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierAllocations.map((allocation) => (
                      <TableRow key={String(allocation.id ?? allocation.supplierName)}>
                        <TableCell className="font-medium">{allocation.supplierName}</TableCell>
                        <TableCell>
                          {typeof allocation.quantity === "number"
                            ? `${allocation.quantity.toLocaleString()} tons`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {typeof allocation.amount === "number"
                            ? formatLcCurrency(allocation.amount, normalizedLc.currency)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {allocation.createdAt ? formatLcDate(allocation.createdAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No supplier allocations recorded for this LC.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ship className="h-5 w-5" />
                <span>Associated Vessels</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">LC Quantity</div>
                  <div className="text-xl font-bold text-blue-900">
                    {lcQuantity !== null ? `${lcQuantity.toLocaleString()} tons` : "—"}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-600">Allocated</div>
                  <div className="text-xl font-bold text-green-900">
                    {totalAllocatedQuantity.toLocaleString()} tons
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-amber-600">Remaining</div>
                  <div className="text-xl font-bold text-amber-900">
                    {remainingQuantity !== null
                      ? `${remainingQuantity.toLocaleString()} tons`
                      : "—"}
                  </div>
                </div>
              </div>

              {lcVesselRelationsLoading ? (
                <div className="text-center text-gray-500">Loading vessel details...</div>
              ) : lcVessels.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vessel Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Route</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lcVessels.map((vessel: any) => {
                      const relation = Array.isArray(lcVesselRelations)
                        ? lcVesselRelations.find((rel: any) => rel.vesselId === vessel.id)
                        : null;

                      return (
                        <TableRow key={vessel.id}>
                          <TableCell className="font-medium">{vessel.vesselName}</TableCell>
                          <TableCell>{relation?.quantity || 0} tons</TableCell>
                          <TableCell>
                            <StatusBadge status={vessel.status} type="vessel" />
                          </TableCell>
                          <TableCell>
                            {vessel.eta ? formatLcDate(vessel.eta) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {vessel.countryOfOrigin} → {vessel.portOfDischarge}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No vessels nominated for this LC yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
