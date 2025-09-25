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
import { Plus, University, Edit, Eye, Trash, Building2, Factory } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";
import {
  normalizeLc,
  formatLcCurrency,
  formatLcDate,
  isLcExpired,
  daysUntilLcExpiry,
} from "@/lib/lc";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JourneySegment {
  value: "gasc_to_upf" | "upf_to_supplier";
  label: string;
  description: string;
  statuses: string[] | null;
  icon: LucideIcon;
}

const JOURNEY_SEGMENTS: JourneySegment[] = [
  {
    value: "gasc_to_upf",
    label: "LC GASC → UPF",
    description: "Covers issuance and internal approvals before supplier engagement.",
    statuses: ["draft", "issued", "amended"],
    icon: Building2,
  },
  {
    value: "upf_to_supplier",
    label: "UPF → Supplier",
    description: "Tracks fulfillment, utilization, and supplier-facing activities.",
    statuses: ["utilized", "expired", "cancelled", "archived"],
    icon: Factory,
  },
];

const STATUS_OPTIONS = [
  "Draft",
  "Issued",
  "Amended",
  "Utilized",
  "Expired",
  "Cancelled",
  "Archived",
] as const;

const STATUS_FILTER_OPTIONS = ["all", ...STATUS_OPTIONS.map((status) => status.toLowerCase())] as const;

export default function LettersCredit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [journeyFilter, setJourneyFilter] = useState<JourneySegment["value"]>("gasc_to_upf");
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
      toast({
        title: "Error",
        description: "Failed to delete Letter of Credit",
        variant: "destructive",
      });
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const selectedJourney = useMemo(
    () => JOURNEY_SEGMENTS.find((segment) => segment.value === journeyFilter) ?? JOURNEY_SEGMENTS[0],
    [journeyFilter],
  );

  const availableStatusOptions = useMemo(() => {
    if (!selectedJourney || !selectedJourney.statuses) {
      return STATUS_FILTER_OPTIONS as readonly string[];
    }

    return ["all", ...selectedJourney.statuses] as const;
  }, [selectedJourney]);

  useEffect(() => {
    if (statusFilter === "all") return;
    if (!availableStatusOptions.includes(statusFilter)) {
      setStatusFilter("all");
    }
  }, [availableStatusOptions, statusFilter]);

  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery({
    queryKey: ["/api/letters-of-credit", statusFilter !== "all" ? { status: statusFilter } : {}],
    retry: false,
  });

  // Ensure lettersOfCredit is an array
  const lcArray = Array.isArray(lettersOfCredit) ? lettersOfCredit : [];

  const normalizedEntries = useMemo(
    () => lcArray.map((lc: any) => ({ raw: lc, normalized: normalizeLc(lc) })),
    [lcArray],
  );

  const journeyEntries = useMemo(() => {
    const journey = JOURNEY_SEGMENTS.find((segment) => segment.value === journeyFilter);
    if (!journey || !journey.statuses) {
      return normalizedEntries;
    }

    const statusSet = new Set(journey.statuses);
    return normalizedEntries.filter((entry) => statusSet.has(entry.normalized.statusKey));
  }, [journeyFilter, normalizedEntries]);

  const journeyNormalizedLCs = useMemo(
    () => journeyEntries.map((entry) => entry.normalized),
    [journeyEntries],
  );

  const filteredEntries = useMemo(
    () =>
      statusFilter === "all"
        ? journeyEntries
        : journeyEntries.filter((entry) => entry.normalized.statusKey === statusFilter),
    [journeyEntries, statusFilter],
  );

  const journeySummaries = useMemo(
    () =>
      JOURNEY_SEGMENTS.map((segment) => {
        const statusSet = segment.statuses ? new Set(segment.statuses) : null;
        const entries = statusSet
          ? normalizedEntries.filter((entry) => statusSet.has(entry.normalized.statusKey))
          : normalizedEntries;
        const statusLabels = (segment.statuses ?? []).map(
          (status) => status.charAt(0).toUpperCase() + status.slice(1),
        );

        return {
          ...segment,
          total: entries.length,
          statusLabels,
        };
      }),
    [normalizedEntries],
  );

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
  const statusFilterLabel = statusFilter === "all"
    ? "All"
    : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
  const journeyLabel = selectedJourney?.label ?? JOURNEY_SEGMENTS[0].label;
  const emptyStateDescription = (() => {
    if (normalizedEntries.length === 0) {
      return "Get started by creating your first letter of credit.";
    }
    if (statusFilter === "all") {
      return `No letters of credit found for ${journeyLabel}.`;
    }
    return `No LCs with status "${statusFilterLabel}" in ${journeyLabel}.`;
  })();

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
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {journeySummaries.map((summary) => {
              const Icon = summary.icon;
              const isActive = summary.value === journeyFilter;

              return (
                <Card
                  key={summary.value}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    if (suppressJourneySelection) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    setJourneyFilter(summary.value);
                  }}
                  onKeyDown={(event) => {
                    if (suppressJourneySelection) {
                      event.preventDefault();
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setJourneyFilter(summary.value);
                    }
                  }}
                  className={cn(
                    "h-full cursor-pointer border bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    isActive ? "border-primary-500 shadow-md" : "border-secondary-200 hover:border-secondary-300",
                  )}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                    <div>
                      <CardTitle className="text-base font-semibold text-secondary-900">{summary.label}</CardTitle>
                      <p className="mt-1 text-sm text-secondary-600">{summary.description}</p>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg p-2",
                        isActive ? "bg-primary-100 text-primary-700" : "bg-secondary-100 text-secondary-600",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-3xl font-bold text-secondary-900">{summary.total}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">LCs in flow</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summary.statusLabels.map((status) => (
                        <Badge
                          key={`${summary.value}-${status}`}
                          variant="secondary"
                          className={cn(
                            "bg-secondary-100 text-secondary-700",
                            isActive && "bg-primary-100 text-primary-700",
                          )}
                        >
                          {status}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          {/* Header Actions */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "all"
                        ? "All Statuses"
                        : option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  onSuccess={() => {
                    setSuppressJourneySelection(true);
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
                onSuccess={() => {
                  setShowEditDialog(false);
                  setEditingLC(null);
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
              ) : filteredEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LC Number</TableHead>
                      <TableHead>Cargo Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price per Unit</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Issuing Bank</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Shipment Period</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map(({ raw, normalized }, index) => {
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
                          <TableCell>{normalized.beneficiary ?? "—"}</TableCell>
                          <TableCell>{normalized.supplierName ?? "—"}</TableCell>
                          <TableCell>{formatLcDate(normalized.shipmentPeriod)}</TableCell>
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
