import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import VesselNominationForm from "@/components/forms/vessel-nomination-form";
import VesselSummary from "@/components/vessel-summary";
import VesselDischargeTracking from "@/components/vessel-discharge-tracking";
import StatusBadge from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { VESSEL_STATUSES } from "@/lib/constants";
import { Plus, Ship, Edit, MapPin, Calendar, Eye, Activity, Trash, Loader2 } from "lucide-react";
import { normalizeLc, type NormalizedLC } from "@/lib/lc";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";

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

const VESSEL_STATUS_SEQUENCE = [
  "planned",
  "nominated",
  "confirmed",
  "loading",
  "sailing",
  "in_transit",
  "arrived",
  "discharged",
  "completed",
  "closed",
  "archived",
] as const;

const VESSEL_STATUS_TRANSITIONS: Record<string, string[]> = {
  planned: ["nominated", "confirmed", "loading", "archived"],
  nominated: ["confirmed", "loading", "in_transit", "sailing", "archived"],
  confirmed: ["in_transit", "loading", "archived"],
  loading: ["sailing", "in_transit", "arrived", "archived"],
  sailing: ["arrived", "in_transit", "archived"],
  in_transit: ["arrived", "discharged", "archived"],
  arrived: ["discharged", "completed", "closed", "archived"],
  discharged: ["completed", "closed", "archived"],
  completed: ["closed", "archived"],
  closed: ["archived"],
  archived: [],
};

const statusKeyFromStatus = (status: unknown): string => {
  if (status === null || status === undefined) return "unknown";
  const cleaned = String(status).trim().toLowerCase();
  if (!cleaned) return "unknown";
  return cleaned.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
};

const statusKeyToTitleCase = (statusKey: string): string =>
  statusKey
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const getStatusLabel = (statusKey: string): string =>
  VESSEL_STATUSES[statusKey as keyof typeof VESSEL_STATUSES]?.label ??
  statusKeyToTitleCase(statusKey);

const getStatusOptionsForKey = (statusKey: string): string[] => {
  const allowed = VESSEL_STATUS_TRANSITIONS[statusKey];
  if (allowed) {
    const unique = new Set([statusKey, ...allowed]);
    return VESSEL_STATUS_SEQUENCE.filter((key) => unique.has(key));
  }
  return [statusKey];
};

// Component to display LC numbers for a vessel
function VesselLCDisplay({
  vesselId,
  normalizedLcMap,
}: {
  vesselId: number;
  normalizedLcMap: Map<string, NormalizedLC>;
}) {
  const { data: vesselLCs } = useQuery({
    queryKey: [`/api/vessels/${vesselId}/letters-of-credit`],
    enabled: !!vesselId,
  });

  const vesselLCsArray = Array.isArray(vesselLCs) ? vesselLCs : [];

  if (vesselLCsArray.length === 0) {
    return <span>-</span>;
  }

  return (
    <div className="space-y-1">
      {vesselLCsArray.map((vesselLC: any, index: number) => {
        const linkId = extractLcId(vesselLC);
        const normalizedLc = linkId ? normalizedLcMap.get(linkId) : undefined;
        const lcNumber = normalizedLc?.number ?? (linkId ? `LC-${linkId}` : "-");
        return (
          <Badge key={index} variant="secondary" className="text-xs">
            {lcNumber}
          </Badge>
        );
      })}
    </div>
  );
}

export default function Vessels() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { redirectToLogin } = useUnauthorizedRedirect({
    isAuthenticated,
    isLoading,
  });
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVessel, setEditingVessel] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingVessel, setViewingVessel] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [trackingVessel, setTrackingVessel] = useState<any>(null);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);

  const statusQueryArg = useMemo(
    () => (statusFilter === "all" ? {} : { status: statusKeyToTitleCase(statusFilter) }),
    [statusFilter],
  );

  // Delete vessel mutation
  const deleteVesselMutation = useMutation({
      mutationFn: async (vesselId: number) => {
        const response = await apiRequest("DELETE", `/api/vessels/${vesselId}`);

      if (!response.ok) {
        let errorMessage = `${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
        }
        throw new Error(errorMessage);
      }

        // For DELETE requests, the response might be empty or not JSON
        const text = await response.text();
        try {
          return text ? JSON.parse(text) : { success: true };
        } catch {
          return { success: true }; // Assume success if response is not JSON
        }
      },
    onSuccess: () => {
      // Remove all vessel-related queries from cache completely
      queryClient.removeQueries({ queryKey: ["/api/vessels"] });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "/api/vessels" });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });

      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/vessels", statusQueryArg] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Success",
        description: "Vessel deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }
      console.error("Delete vessel error:", error);
      toast({
        title: "Error",
        description: `Failed to delete vessel: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation<any, Error, { vesselId: number; statusKey: string }>({
    mutationFn: async ({ vesselId, statusKey }) => {
      const response = await apiRequest("POST", `/api/vessels/${vesselId}/status`, {
        status: statusKeyToTitleCase(statusKey),
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/vessels" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Status updated",
        description: `Vessel status set to ${getStatusLabel(variables.statusKey)}.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }
      const rawMessage = error instanceof Error ? error.message : "Failed to update vessel status.";
      const description = rawMessage.replace(/^[0-9]{3}:\s*/, "").trim() || "Failed to update vessel status.";
      toast({
        title: "Update failed",
        description,
        variant: "destructive",
      });
    },
  });

  const { data: vessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels", statusQueryArg],
    retry: false,
  });

  const { data: contracts } = useQuery({
    queryKey: ["/api/contracts"],
    retry: false,
  });

  const { data: lcs } = useQuery({
    queryKey: ["/api/letters-of-credit"],
    retry: false,
  });

  const vesselsArray = Array.isArray(vessels) ? vessels : [];
  const contractsArray = Array.isArray(contracts) ? contracts : [];
  const lcsArray = Array.isArray(lcs) ? lcs : [];

  const vesselsWithStatusKeys = useMemo(
    () =>
      vesselsArray.map((vessel: any) => ({
        ...vessel,
        statusKey: statusKeyFromStatus(vessel?.status ?? vessel?.Status ?? ""),
      })),
    [vesselsArray],
  );

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

  const handleStatusChange = (vessel: any, nextStatusKey: string) => {
    if (!vessel?.id) return;
    if (nextStatusKey === vessel.statusKey) return;
    updateStatusMutation.mutate({ vesselId: vessel.id, statusKey: nextStatusKey });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Vessels" subtitle="Manage vessel nominations and shipping coordination">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="nominated">Nominated</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                  <SelectItem value="completed">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-black w-full sm:w-auto">
                  <Plus className="mr-2" size={16} />
                  Nominate Vessel
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nominate New Vessel</DialogTitle>
                  </DialogHeader>
                  <VesselNominationForm 
                    onSuccess={() => setShowCreateDialog(false)}
                    onCancel={() => setShowCreateDialog(false)}
                    contracts={contractsArray}
                    lcs={lcsArray}
                  />
                </DialogContent>
              </Dialog>

              {/* Edit Vessel Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Vessel</DialogTitle>
                  </DialogHeader>
                  <VesselNominationForm 
                    vessel={editingVessel}
                    onSuccess={() => {
                      setShowEditDialog(false);
                      setEditingVessel(null);
                    }}
                    onCancel={() => {
                      setShowEditDialog(false);
                      setEditingVessel(null);
                    }}
                    contracts={contractsArray}
                    lcs={lcsArray}
                  />
                </DialogContent>
              </Dialog>

              {/* Vessel Summary Dialog */}
              <VesselSummary
                vessel={viewingVessel}
                isOpen={showViewDialog}
                onClose={() => {
                  setShowViewDialog(false);
                  setViewingVessel(null);
                }}
              />

              {/* Discharge Tracking Dialog */}
              <VesselDischargeTracking
                vessel={trackingVessel}
                isOpen={showTrackingDialog}
                onClose={() => {
                  setShowTrackingDialog(false);
                  setTrackingVessel(null);
                }}
              />
          </div>

          {/* Vessel Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Vessels</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {vesselsWithStatusKeys.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Ship className="text-blue-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">In Transit</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {vesselsWithStatusKeys.filter((vessel: any) => vessel.statusKey === 'in_transit').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Ship className="text-orange-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Arriving Soon</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {vesselsWithStatusKeys.filter((vessel: any) => {
                        if (!vessel.eta) return false;
                        const eta = new Date(vessel.eta);
                        const now = new Date();
                        const diffDays = Math.ceil((eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays <= 7 && diffDays > 0;
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="text-green-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Finished</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {vesselsWithStatusKeys.filter((vessel: any) => vessel.statusKey === 'completed').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Ship className="text-purple-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vessels Table */}
          <Card className="bg-white border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-secondary-900">
                Vessels
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vesselsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-secondary-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : vesselsWithStatusKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vessel Name</TableHead>
                      <TableHead>Contract ID</TableHead>
                      <TableHead>LC Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselsWithStatusKeys.map((vessel: any) => {
                      const relatedContract = contractsArray.find(
                        (contract: any) => contract.id === vessel.contractId,
                      );
                      const quantityNumber =
                        typeof vessel.quantity === "number"
                          ? vessel.quantity
                          : typeof vessel.quantity === "string"
                            ? Number(vessel.quantity)
                            : null;
                      const statusOptions = getStatusOptionsForKey(vessel.statusKey);
                      const isStatusLocked = ["completed", "closed", "archived"].includes(vessel.statusKey);
                      const isStatusUpdating =
                        updateStatusMutation.isPending && updateStatusMutation.variables?.vesselId === vessel.id;
                      const canChangeStatus = statusOptions.some((option) => option !== vessel.statusKey);

                      return (
                        <TableRow key={vessel.id}>
                          <TableCell className="font-medium">{vessel.vesselName || 'Unnamed Vessel'}</TableCell>
                          <TableCell>
                            {relatedContract?.publicId ?? (
                              vessel.contractId
                                ? `CON-${vessel.contractId.toString().padStart(3, '0')}`
                                : '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <VesselLCDisplay vesselId={vessel.id} normalizedLcMap={normalizedLcMap} />
                          </TableCell>
                          <TableCell>{vessel.quantity || 0} tons</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1 text-sm">
                                <MapPin size={12} className="text-secondary-500" />
                                <span>{vessel.portOfLoading || 'TBD'}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm text-secondary-600">
                                <span>→</span>
                                <span>{vessel.portOfDischarge || 'TBD'}</span>
                              </div>
                            </div>
                          </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'TBD'}
                            </div>
                            <div className="text-xs text-secondary-500">
                              {vessel.eta ? new Date(vessel.eta).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Select
                              value={vessel.statusKey}
                              onValueChange={(value) => handleStatusChange(vessel, value)}
                            >
                              <SelectTrigger
                                className="w-44 justify-between"
                                disabled={isStatusLocked || isStatusUpdating || !canChangeStatus}
                              >
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={vessel.statusKey} type="vessel" />
                                  {isStatusUpdating && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary-500" />
                                  )}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem key={option} value={option} disabled={option === vessel.statusKey}>
                                    {getStatusLabel(option)}
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
                                setViewingVessel(vessel);
                                setShowViewDialog(true);
                              }}
                              title="View vessel summary"
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => {
                                setEditingVessel(vessel);
                                setShowEditDialog(true);
                              }}
                              title="Edit vessel details"
                            >
                              <Edit size={14} />
                            </Button>
                            {vessel.statusKey !== 'draft' && ['admin', 'shipping_officer'].includes((user as any)?.role || '') && (
                              <Button 
                                size="sm" 
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() => {
                                  setTrackingVessel(vessel);
                                  setShowTrackingDialog(true);
                                }}
                                title="Track discharge progress"
                              >
                                <Activity size={14} />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this vessel?")) {
                                  deleteVesselMutation.mutate(vessel.id);
                                }
                              }}
                              disabled={deleteVesselMutation.isPending}
                              title="Delete vessel"
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
                  <Ship className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">No vessels found</h3>
                  <p className="mt-2 text-secondary-600">
                    {statusFilter === "all"
                      ? "Get started by nominating your first vessel."
                      : `No vessels with status "${getStatusLabel(statusFilter)}" found.`}
                  </p>
                  {['admin', 'shipping_officer'].includes((user as any)?.role || '') && (
                    <Button 
                      className="mt-4 bg-primary-500 hover:bg-primary-600 text-white"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="mr-2" size={16} />
                      Nominate Vessel
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
    </MainLayout>
  );
}
