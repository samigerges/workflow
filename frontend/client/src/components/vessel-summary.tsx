import { useMemo, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Ship,
  Package,
  MapPin,
  FileText,
  ExternalLink,
  University,
  Globe,
  Clock,
  DollarSign,
  Layers,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/ui/status-badge";
import VesselDocuments from "@/components/vessel-documents";
import { normalizeLc, type NormalizedLC, formatLcCurrency } from "@/lib/lc";
import {
  CARGO_TYPES,
  CONTRACT_PAYMENT_METHODS,
  CONTRACT_SHIPPING_METHODS,
} from "@/lib/constants";
import { getOptionLabel } from "@/lib/utils";

function extractLcId(link: any): string | null {
  if (!link) return null;

  const possibleId =
    link.lcId ??
    link.letterOfCreditId ??
    link.letter_of_credit_id ??
    link.LetterOfCreditId ??
    link?.letterOfCredit?.id ??
    null;

  if (possibleId === null || possibleId === undefined) {
    return null;
  }

  const idString = String(possibleId);
  return idString.length > 0 ? idString : null;
}

interface VesselSummaryProps {
  vessel: any;
  isOpen: boolean;
  onClose: () => void;
}

interface InfoRowProps {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

const InfoRow = ({ icon: Icon, label, value, highlight = false }: InfoRowProps) => {
  return (
    <div className="flex items-start gap-3">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 text-gray-400" /> : null}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <div
          className={
            highlight
              ? "text-base font-semibold text-gray-900"
              : "text-sm font-medium text-gray-900"
          }
        >
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatQuantity = (value: unknown) => {
  const parsed = parseNumber(value);
  return parsed !== null ? `${parsed.toLocaleString()} tons` : "—";
};

const formatNumber = (value: unknown) => {
  const parsed = parseNumber(value);
  return parsed !== null ? parsed.toLocaleString() : "—";
};

const formatUsd = (value: unknown) => {
  const parsed = parseNumber(value);
  return parsed !== null ? `$${parsed.toLocaleString()} USD` : "—";
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date.toLocaleDateString()} • ${time}`;
};

export default function VesselSummary({ vessel, isOpen, onClose }: VesselSummaryProps) {
  if (!vessel) return null;

  // Fetch contracts and LCs to get detailed information
  const { data: contracts } = useQuery({
    queryKey: ["/api/contracts"],
    enabled: isOpen && !!vessel.contractId,
  });

  const { data: lcs } = useQuery({
    queryKey: ["/api/letters-of-credit"],
    enabled: isOpen,
  });

  // Fetch vessel-specific LCs and loading ports
  const { data: vesselLCs } = useQuery({
    queryKey: [`/api/vessels/${vessel.id}/letters-of-credit`],
    enabled: isOpen && !!vessel.id,
  });

  const { data: loadingPorts } = useQuery({
    queryKey: ["/api/vessels", vessel.id, "loading-ports"],
    enabled: isOpen && !!vessel.id,
  });

  const contractsArray = Array.isArray(contracts) ? contracts : [];
  const lcsArray = Array.isArray(lcs) ? lcs : [];
  const vesselLCsArray = Array.isArray(vesselLCs) ? vesselLCs : [];
  const loadingPortsArray = Array.isArray(loadingPorts) ? loadingPorts : [];

  const normalizedLcMap = useMemo(() => {
    const map = new Map<string, NormalizedLC>();
    lcsArray.forEach((lc: any) => {
      const normalized = normalizeLc(lc);
      const key = lc?.id ?? normalized.id;
      if (key !== null && key !== undefined) {
        map.set(String(key), normalized);
      }
    });
    return map;
  }, [lcsArray]);

  const associatedContract = contractsArray.find((contract: any) => contract.id === vessel.contractId);

  const dischargedQuantity =
    vessel.discharged_quantity ?? vessel.dischargedQuantity ?? vessel.dischargeQuantity ?? null;

  const tradeTermsLabel = (vessel.tradeTerms ?? "FOB").toUpperCase();
  const tradeTermsDescription =
    tradeTermsLabel === "CIF" ? "Cost, Insurance, and Freight" : "Free On Board";

  const contractPublicId = associatedContract?.publicId ??
    (vessel.contractId != null
      ? `CON-${vessel.contractId.toString().padStart(3, "0")}`
      : "—");

  const contractQuantity = formatQuantity(associatedContract?.quantity);
  const contractPricePerTon = (() => {
    const parsed = parseNumber(associatedContract?.pricePerTon);
    return parsed !== null ? `$${parsed.toLocaleString()}` : "—";
  })();

  const contractCargoType = associatedContract?.cargoType
    ? getOptionLabel(CARGO_TYPES, associatedContract.cargoType)
    : associatedContract?.cargoType ?? "—";

  const contractPaymentMethod = associatedContract?.paymentMethod
    ? getOptionLabel(CONTRACT_PAYMENT_METHODS, associatedContract.paymentMethod)
    : associatedContract?.paymentMethod ?? "—";

  const contractShippingMethod = associatedContract?.shippingMethod
    ? getOptionLabel(CONTRACT_SHIPPING_METHODS, associatedContract.shippingMethod)
    : associatedContract?.shippingMethod ?? "—";

  const lcTotals = useMemo(() => {
    let totalLcQuantity = 0;
    let totalAssignedQuantity = 0;
    let totalAmount = 0;
    let currency: string | null = null;

    vesselLCsArray.forEach((vesselLC: any) => {
      const assigned = parseNumber(vesselLC.quantity) ?? 0;
      totalAssignedQuantity += assigned;

      const linkId = extractLcId(vesselLC);
      const normalizedLc = linkId ? normalizedLcMap.get(linkId) : undefined;

      if (normalizedLc?.quantity != null) {
        totalLcQuantity += Number(normalizedLc.quantity);
      }

      if (normalizedLc?.amount != null) {
        totalAmount += normalizedLc.amount;
        if (currency === null) {
          currency = normalizedLc.currency ?? null;
        } else if (normalizedLc.currency !== currency) {
          currency = null;
        }
      }
    });

    return {
      totalLcQuantity,
      totalAssignedQuantity,
      totalAmount,
      currency,
    };
  }, [normalizedLcMap, vesselLCsArray]);

  const lcCoverage = lcTotals.totalLcQuantity > 0
    ? Math.min(100, (lcTotals.totalAssignedQuantity / lcTotals.totalLcQuantity) * 100)
    : null;

  const lcTotalAmountLabel =
    lcTotals.currency && lcTotals.totalAmount > 0
      ? formatLcCurrency(lcTotals.totalAmount, lcTotals.currency)
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Ship className="h-5 w-5" />
            <span>Vessel Summary - {vessel.vesselName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg">Vessel Overview</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={vessel.status} type="vessel" />
                  {vessel.publicId ? (
                    <Badge variant="outline" className="uppercase tracking-wide">
                      {vessel.publicId}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {vessel.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(vessel.createdAt)}</span>
                  </div>
                )}
                {vessel.updatedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last updated {formatDate(vessel.updatedAt)}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Identification & Capacity
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <InfoRow icon={Ship} label="Vessel Name" value={vessel.vesselName ?? "—"} highlight />
                  <InfoRow icon={Package} label="Nomination Quantity" value={formatQuantity(vessel.quantity)} highlight />
                  <InfoRow icon={Layers} label="Cargo Type" value={vessel.cargoType ?? "—"} />
                  <InfoRow icon={Globe} label="Country of Origin" value={vessel.countryOfOrigin ?? "Not specified"} />
                  <InfoRow icon={MapPin} label="Port of Loading" value={vessel.portOfLoading ?? "Not specified"} />
                  <InfoRow icon={MapPin} label="Port of Discharge" value={vessel.portOfDischarge ?? "Not specified"} />
                  <InfoRow icon={Package} label="Discharged Quantity" value={formatQuantity(dischargedQuantity)} />
                  <InfoRow icon={University} label="Linked Contract" value={contractPublicId} />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Schedule
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <InfoRow icon={Calendar} label="Estimated Arrival (ETA)" value={formatDateTime(vessel.eta)} />
                  <InfoRow icon={Clock} label="Estimated Departure (ETD)" value={formatDateTime(vessel.etd)} />
                  {vessel.actualArrivalDate ? (
                    <InfoRow
                      icon={Calendar}
                      label="Actual Arrival"
                      value={formatDateTime(vessel.actualArrivalDate)}
                    />
                  ) : null}
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Trade & Service Providers
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <InfoRow
                    icon={DollarSign}
                    label="Trade Terms"
                    value={
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase">
                          {tradeTermsLabel}
                        </Badge>
                        <span className="text-xs text-gray-500">{tradeTermsDescription}</span>
                      </div>
                    }
                  />
                  <InfoRow
                    icon={User}
                    label="Insurance Company"
                    value={vessel.insuranceCompany ?? "Not specified"}
                  />
                  <InfoRow
                    icon={User}
                    label="Inspection Company"
                    value={vessel.inspectionCompany ?? "Not specified"}
                  />
                  <InfoRow
                    icon={User}
                    label="Shipping Company"
                    value={vessel.shippingCompany ?? "Not specified"}
                  />
                </div>

                {tradeTermsLabel === "FOB" &&
                (vessel.insuranceCost || vessel.inspectionCost || vessel.shippingCost) ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <h4 className="font-semibold text-yellow-900">FOB Additional Costs</h4>
                    <div className="mt-3 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                      <InfoRow
                        label="Insurance Cost"
                        value={formatUsd(vessel.insuranceCost)}
                      />
                      <InfoRow
                        label="Inspection Cost"
                        value={formatUsd(vessel.inspectionCost)}
                      />
                      <InfoRow
                        label="Shipping Cost"
                        value={formatUsd(vessel.shippingCost)}
                      />
                    </div>
                    <div className="mt-3 border-t border-yellow-200 pt-3 text-sm font-semibold text-yellow-900">
                      Total Additional Costs: $
                      {formatNumber(
                        (parseNumber(vessel.insuranceCost) ?? 0) +
                          (parseNumber(vessel.inspectionCost) ?? 0) +
                          (parseNumber(vessel.shippingCost) ?? 0),
                      )} USD
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Loading Ports
                </h4>
                {loadingPortsArray.length > 0 ? (
                  <div className="space-y-3">
                    {loadingPortsArray.map((port: any, index: number) => {
                      const statusVariant =
                        port.loadingStatus && String(port.loadingStatus).toLowerCase() === "completed"
                          ? "default"
                          : "secondary";
                      return (
                        <div key={index} className="rounded-lg border border-dashed border-gray-200 p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <InfoRow icon={MapPin} label="Port" value={port.portName || "—"} />
                            <InfoRow icon={Globe} label="Country" value={port.country || "Not specified"} />
                            <InfoRow
                              icon={Package}
                              label="Expected Quantity"
                              value={formatQuantity(port.expectedQuantity)}
                            />
                            <InfoRow
                              label="Status"
                              value={<Badge variant={statusVariant}>{port.loadingStatus || "Pending"}</Badge>}
                            />
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {port.loadingDate ? (
                              <InfoRow
                                icon={Calendar}
                                label="Loading Date"
                                value={formatDate(port.loadingDate)}
                              />
                            ) : null}
                            {port.notes ? (
                              <InfoRow label="Notes" value={<span className="text-sm text-gray-700">{port.notes}</span>} />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No loading ports specified for this vessel.
                  </p>
                )}
              </section>
            </CardContent>
          </Card>

          {/* Associated Contract */}
          {associatedContract && (
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">Associated Contract</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  {associatedContract.status ? (
                    <Badge variant="outline" className="capitalize">
                      {associatedContract.status}
                    </Badge>
                  ) : null}
                  {associatedContract.createdAt ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(associatedContract.createdAt)}</span>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <InfoRow icon={FileText} label="Contract ID" value={contractPublicId} highlight />
                  <InfoRow label="Supplier" value={associatedContract.supplierName ?? "—"} />
                  <InfoRow label="Cargo Type" value={contractCargoType} />
                  <InfoRow icon={Package} label="Contract Quantity" value={contractQuantity} />
                  <InfoRow icon={DollarSign} label="Price per Ton" value={contractPricePerTon} />
                  <InfoRow label="Payment Method" value={contractPaymentMethod} />
                  <InfoRow label="Shipping Method" value={contractShippingMethod} />
                  <InfoRow
                    icon={Globe}
                    label="Country of Origin"
                    value={associatedContract.countryOfOrigin ?? "—"}
                  />
                  {associatedContract.startDate ? (
                    <InfoRow
                      icon={Calendar}
                      label="Import Start"
                      value={formatDate(associatedContract.startDate)}
                    />
                  ) : null}
                  {associatedContract.endDate ? (
                    <InfoRow
                      icon={Calendar}
                      label="Import End"
                      value={formatDate(associatedContract.endDate)}
                    />
                  ) : null}
                </div>
                {associatedContract.contractTerms ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Contract Terms
                    </div>
                    <p className="mt-2 whitespace-pre-line">{associatedContract.contractTerms}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Associated Letters of Credit */}
          {vesselLCsArray.length > 0 && (
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <University className="h-5 w-5" />
                  <span>Associated Letters of Credit ({vesselLCsArray.length})</span>
                </CardTitle>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Total LC Quantity
                    </div>
                    <div className="text-lg font-semibold text-blue-900">
                      {lcTotals.totalLcQuantity > 0
                        ? `${lcTotals.totalLcQuantity.toLocaleString()} tons`
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Assigned to Vessel
                    </div>
                    <div className="text-lg font-semibold text-emerald-900">
                      {lcTotals.totalAssignedQuantity.toLocaleString()} tons
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Coverage
                    </div>
                    <div className="text-lg font-semibold text-amber-900">
                      {lcCoverage !== null ? `${lcCoverage.toFixed(1)}%` : "—"}
                    </div>
                  </div>
                  {lcTotalAmountLabel ? (
                    <div className="rounded-lg bg-purple-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                        Total LC Amount
                      </div>
                      <div className="text-lg font-semibold text-purple-900">{lcTotalAmountLabel}</div>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vesselLCsArray.map((vesselLC: any, index: number) => {
                    const linkId = extractLcId(vesselLC);
                    const normalizedLc = linkId ? normalizedLcMap.get(linkId) : undefined;
                    const lcNumber = normalizedLc?.number ?? (linkId ? `LC-${linkId}` : "-");
                    const issuingBank = normalizedLc?.issuingBank ?? "Not specified";
                    const lcStatusKey = normalizedLc?.statusKey ?? normalizedLc?.status?.toLowerCase();
                    const statusLabel = normalizedLc?.status
                      ? normalizedLc.status.charAt(0).toUpperCase() + normalizedLc.status.slice(1)
                      : "Unknown";
                    const lcAmountLabel = formatLcCurrency(
                      normalizedLc?.amount ?? null,
                      normalizedLc?.currency ?? null,
                    );
                    const pricePerUnitLabel = formatLcCurrency(
                      normalizedLc?.pricePerUnit ?? null,
                      normalizedLc?.currency ?? null,
                    );
                    const lcQuantityLabel = normalizedLc?.quantity
                      ? `${Number(normalizedLc.quantity).toLocaleString()} tons`
                      : "—";
                    const assignedQuantity = parseNumber(vesselLC.quantity) ?? 0;
                    const lcCoverageLabel = normalizedLc?.quantity
                      ? `${Math.min(100, (assignedQuantity / Number(normalizedLc.quantity)) * 100).toFixed(1)}%`
                      : "—";
                    const issueDateLabel = formatDate(normalizedLc?.issueDate ?? null);
                    const shipmentWindowLabel = normalizedLc?.shipmentPeriodStart || normalizedLc?.shipmentPeriodEnd
                      ? `${formatDate(normalizedLc?.shipmentPeriodStart)} → ${formatDate(normalizedLc?.shipmentPeriodEnd)}`
                      : "—";
                    const expiryDateLabel = formatDate(normalizedLc?.expiryDate ?? null);
                    return (
                      <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <InfoRow label="LC Number" value={lcNumber} highlight />
                          <InfoRow label="Issuing Bank" value={issuingBank} />
                          <InfoRow
                            label="Status"
                            value={
                              <Badge
                                className={
                                  lcStatusKey === "issued"
                                    ? "bg-green-100 text-green-800"
                                    : lcStatusKey === "expired"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {statusLabel}
                              </Badge>
                            }
                          />
                          <InfoRow
                            label="LC Quantity"
                            value={lcQuantityLabel}
                          />
                          <InfoRow
                            label="Assigned to Vessel"
                            value={`${assignedQuantity.toLocaleString()} tons`}
                          />
                          <InfoRow label="Coverage" value={lcCoverageLabel} />
                          <InfoRow label="Applicant" value={normalizedLc?.applicant ?? "—"} />
                          <InfoRow label="Beneficiary" value={normalizedLc?.supplierName ?? "—"} />
                          <InfoRow label="Price per Unit" value={pricePerUnitLabel} />
                          <InfoRow label="Total Amount" value={lcAmountLabel} />
                          <InfoRow label="Issue Date" value={issueDateLabel} />
                          <InfoRow label="Shipment Window" value={shipmentWindowLabel} />
                          <InfoRow label="Expiry Date" value={expiryDateLabel} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}



          {/* Shipping Instructions */}
          {vessel.instructionsFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>Instructions Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/files/${vessel.instructionsFile}`;
                      link.target = '_blank';
                      link.click();
                    }}
                    className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    View Instructions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vessel Documents */}
          <VesselDocuments vessel={vessel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}