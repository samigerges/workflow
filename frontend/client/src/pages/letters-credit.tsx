import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import LetterOfCreditForm from "@/components/forms/letter-of-credit-form";
import LCSummary from "@/components/lc-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, University, Edit, Eye, Trash, Building2, Factory } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";
import {
  normalizeLc,
  formatLcCurrency,
  formatLcDate,
  isLcExpired,
  daysUntilLcExpiry,
  type NormalizedLC,
} from "@/lib/lc";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";

type FlowKey = NormalizedLC["flowKey"];

interface JourneySegment {
  value: FlowKey;
  label: string;
  description: string;
  icon: LucideIcon;
}

const JOURNEY_SEGMENTS: JourneySegment[] = [
  {
    value: "gasc_to_upf",
    label: "LC GASC → UPF",
    description: "Covers issuance and internal approvals before supplier engagement.",
    icon: Building2,
  },
  {
    value: "upf_to_supplier",
    label: "UPF → Suppliers",
    description: "Tracks fulfillment, utilization, and supplier-facing activities.",
    icon: Factory,
  },
];

const STATUS_OPTIONS = [
  "Draft",
  "Issued",
  "Active",
  "Amended",
  "Utilized",
  "Expired",
  "Cancelled",
  "Archived",
] as const;

export default function LettersCredit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { redirectToLogin } = useUnauthorizedRedirect({
    isAuthenticated,
    isLoading,
  });
  const queryClient = useQueryClient();
  const [journeyFilter, setJourneyFilter] = useState<FlowKey>("gasc_to_upf");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingLC, setEditingLC] = useState<any>(null);
  const [viewingLC, setViewingLC] = useState<any>(null);
  const [suppressJourneySelection, setSuppressJourneySelection] = useState(false);

  useEffect(() => {
    if (!suppressJourneySelection) {
      return;
    }

    const timer = window.setTimeout(() => setSuppressJourneySelection(false), 250);
    return () => window.clearTimeout(timer);
  }, [suppressJourneySelection]);

  // Delete LC mutation
  const deleteLCMutation = useMutation({
      mutationFn: async (lcId: string | number) => {
        await apiRequest("DELETE", `/api/letters-of-credit/${lcId}`);
      },
    onSuccess: () => {
      // Remove all LC-related queries from cache completely
      queryClient.removeQueries({ queryKey: ["/api/letters-of-credit"] });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "/api/letters-of-credit" });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Success",
        description: "Letter of Credit deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete Letter of Credit",
        variant: "destructive",
      });
    },
  });

  const selectedJourney = useMemo(
    () => JOURNEY_SEGMENTS.find((segment) => segment.value === journeyFilter) ?? JOURNEY_SEGMENTS[0],
    [journeyFilter],
  );

  const journeyLabel = selectedJourney?.label ?? JOURNEY_SEGMENTS[0].label;

  const canonicalFlow = journeyFilter === "upf_to_supplier" ? "UPF_TO_SUPPLIER" : "GASC_TO_UPF";

  const lcQueryParams = useMemo(() => {
    const params: Record<string, string> = { flow: canonicalFlow };
    return params;
  }, [canonicalFlow]);

  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery({
    queryKey: ["/api/letters-of-credit", lcQueryParams],
    retry: false,
  });

  // Ensure lettersOfCredit is an array
  const lcArray = Array.isArray(lettersOfCredit) ? lettersOfCredit : [];

  const normalizedEntries = useMemo(
    () => lcArray.map((lc: any) => ({ raw: lc, normalized: normalizeLc(lc) })),
    [lcArray],
  );

  const journeyEntries = useMemo(
    () => normalizedEntries.filter((entry) => entry.normalized.flowKey === journeyFilter),
    [journeyFilter, normalizedEntries],
  );

  const journeyNormalizedLCs = useMemo(
    () => journeyEntries.map((entry) => entry.normalized),
    [journeyEntries],
  );

  const isUpfToSuppliers = journeyFilter === "upf_to_supplier";

  const issuedCount = journeyNormalizedLCs.filter((lc) => lc.statusKey === "issued").length;
  const documentsCount = journeyNormalizedLCs.filter((lc) => Boolean(lc.fileUrl)).length;
  const linkedContractsCount = journeyNormalizedLCs.reduce((set, lc) => {
    if (lc.contractId) {
      set.add(lc.contractId);
    }
    return set;
  }, new Set<string>()).size;
  const expiringSoonCount = journeyNormalizedLCs.filter((lc) => {
    const days = daysUntilLcExpiry(lc.expiryDate);
    return typeof days === "number" && days > 0 && days <= 5;
  }).length;
  const emptyStateDescription = normalizedEntries.length === 0
    ? "Get started by creating your first letter of credit."
    : `No letters of credit found for ${journeyLabel}.`;

  const handleStatusChange = async (lcId: string | number, newStatus: string) => {
    try {
      await apiRequest("POST", `/api/letters-of-credit/${lcId}/status`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "LC status updated successfully",
      });
    } catch (error) {
      if (error instanceof Error && isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }

      toast({
        title: "Error",
        description: "Failed to update LC status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Letters of Credit" subtitle="Manage financial instruments and LC processing">
      <div className="space-y-8">
        <section>
          <Tabs
            value={journeyFilter}
            onValueChange={(value) => {
              if (suppressJourneySelection) {
                return;
              }
              setJourneyFilter(value as FlowKey);
            }}
          >
            <TabsList
              className={cn(
                "grid w-full grid-cols-2 gap-2 rounded-lg bg-secondary-100 p-1 text-sm font-medium text-secondary-600 sm:w-fit",
                suppressJourneySelection && "pointer-events-none opacity-60",
              )}
            >
              <TabsTrigger
                value="gasc_to_upf"
                className="rounded-md px-4 py-2 text-secondary-700 data-[state=active]:bg-white data-[state=active]:text-secondary-900 data-[state=active]:shadow"
              >
                LC GASC → UPF
              </TabsTrigger>
              <TabsTrigger
                value="upf_to_supplier"
                className="rounded-md px-4 py-2 text-secondary-700 data-[state=active]:bg-white data-[state=active]:text-secondary-900 data-[state=active]:shadow"
              >
                UPF → Suppliers
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        <section>
          {/* Header Actions */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <span className="text-xs text-secondary-500">
                Viewing: <span className="font-semibold text-secondary-700">{journeyLabel}</span>
              </span>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary-500 text-black hover:bg-primary-600 sm:w-auto">
                  <Plus className="mr-2" size={16} />
                  New LC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Letter of Credit</DialogTitle>
                </DialogHeader>
                <LetterOfCreditForm
                  onSuccess={(flowKey) => {
                    setSuppressJourneySelection(true);
                    setJourneyFilter(flowKey);
                    setShowCreateDialog(false);
                  }}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Edit LC Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Letter of Credit</DialogTitle>
            </DialogHeader>
            {editingLC && (
              <LetterOfCreditForm
                lc={editingLC}
                onSuccess={(flowKey) => {
                  setShowEditDialog(false);
                  setEditingLC(null);
                  setJourneyFilter(flowKey);
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setEditingLC(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View LC Summary Dialog */}
        <LCSummary
          lc={viewingLC}
          isOpen={showViewDialog}
          onClose={() => {
            setShowViewDialog(false);
            setViewingLC(null);
          }}
        />

        {/* LC Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="bg-white border border-secondary-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">Issued LCs</p>
                    <p className="text-3xl font-bold text-secondary-900">{issuedCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <University className="text-green-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">LCs with Documents</p>
                    <p className="text-3xl font-bold text-secondary-900">{documentsCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <University className="text-blue-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Linked Contracts</p>
                    <p className="text-3xl font-bold text-secondary-900">{linkedContractsCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <University className="text-purple-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Expiring Soon (5 Days)</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {expiringSoonCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <University className="text-orange-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Letters of Credit Table */}
          <Card className="bg-white border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-secondary-900">
                Letters of Credit
                <span className="mt-1 block text-sm font-normal text-secondary-500">{journeyLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lcsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-secondary-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : journeyEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LC Number</TableHead>
                      <TableHead>Cargo Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price per Unit</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Issuing Bank</TableHead>
                      {!isUpfToSuppliers && <TableHead>Beneficiary</TableHead>}
                      {!isUpfToSuppliers && <TableHead>Supplier</TableHead>}
                      <TableHead>Shipment From</TableHead>
                      <TableHead>Shipment To</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeyEntries.map(({ raw, normalized }, index) => {
                      const rowKey = normalized.id ?? raw?.id ?? index;
                      const expired = isLcExpired(normalized.expiryDate);
                      const statusValue = normalized.status || "Draft";
                      const statusOptionsForRow = Array.from(new Set([...STATUS_OPTIONS, statusValue]));
                      const lcIdentifier = raw?.id ?? normalized.id;

                      return (
                        <TableRow key={String(rowKey)} className={expired ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">{normalized.number}</TableCell>
                          <TableCell>{normalized.cargoType ?? "—"}</TableCell>
                          <TableCell>
                            {typeof normalized.quantity === "number"
                              ? normalized.quantity.toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {formatLcCurrency(normalized.pricePerUnit, normalized.currency)}
                          </TableCell>
                          <TableCell>{formatLcCurrency(normalized.amount, normalized.currency)}</TableCell>
                          <TableCell>{normalized.issuingBank ?? "—"}</TableCell>
                          {!isUpfToSuppliers && (
                            <TableCell>{normalized.beneficiary ?? "—"}</TableCell>
                          )}
                          {!isUpfToSuppliers && (
                            <TableCell>{normalized.supplierName ?? "—"}</TableCell>
                          )}
                          <TableCell>{formatLcDate(normalized.shipmentPeriodStart)}</TableCell>
                          <TableCell>{formatLcDate(normalized.shipmentPeriodEnd)}</TableCell>
                          <TableCell>{formatLcDate(normalized.issueDate)}</TableCell>
                          <TableCell className={expired ? "text-red-600 font-medium" : ""}>
                            {formatLcDate(normalized.expiryDate)}
                            {expired && <div className="text-xs text-red-500">Expired</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <StatusBadge status={normalized.statusKey} type="lc" />
                              <Select
                                value={statusValue}
                                onValueChange={(newStatus) => {
                                  if (lcIdentifier == null) return;
                                  handleStatusChange(lcIdentifier, newStatus);
                                }}
                                disabled={lcIdentifier == null}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptionsForRow.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                                onClick={() => {
                                  setViewingLC(raw);
                                  setShowViewDialog(true);
                                }}
                                title="View LC summary"
                              >
                                <Eye size={14} className="mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                onClick={() => {
                                  setEditingLC(raw);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this Letter of Credit?")) {
                                    if (lcIdentifier == null) return;
                                    deleteLCMutation.mutate(lcIdentifier);
                                  }
                                }}
                                disabled={deleteLCMutation.isPending}
                              >
                                <Trash size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <University className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">No letters of credit found</h3>
                  <p className="mt-2 text-secondary-600">
                    {emptyStateDescription}
                  </p>
                  {user && ['admin', 'finance_officer'].includes((user as any)?.role) ? (
                    <Button
                      className="mt-4 bg-primary-500 hover:bg-primary-600 text-white"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="mr-2" size={16} />
                      Create New LC
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </MainLayout>
  );
}
