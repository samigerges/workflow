import { useEffect, useState } from "react";
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
import StatusChangeDropdown from "@/components/ui/status-change-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Ship, Edit, Download, MapPin, Calendar, Eye, Activity, Trash } from "lucide-react";

// Component to display LC numbers for a vessel
function VesselLCDisplay({ vesselId, lcs }: { vesselId: number; lcs: any[] }) {
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
        const lc = lcs.find((l: any) => l.id === vesselLC.lcId);
        return (
          <Badge key={index} variant="secondary" className="text-xs">
            {lc ? lc.lcNumber : `LC-${vesselLC.lcId}`}
          </Badge>
        );
      })}
    </div>
  );
}

export default function Vessels() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVessel, setEditingVessel] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingVessel, setViewingVessel] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [trackingVessel, setTrackingVessel] = useState<any>(null);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);

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
      queryClient.refetchQueries({ queryKey: ["/api/vessels", statusFilter !== "all" ? { status: statusFilter } : {}] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Success",
        description: "Vessel deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Delete vessel error:", error);
      toast({
        title: "Error",
        description: `Failed to delete vessel: ${error.message}`,
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

  const { data: vessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels", statusFilter !== "all" ? { status: statusFilter } : {}],
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
                      {vesselsArray.length}
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
                      {vesselsArray.filter((vessel: any) => vessel.status === 'in_transit').length}
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
                      {vesselsArray.filter((vessel: any) => {
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
                    <p className="text-sm font-medium text-secondary-600">Completed</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {vesselsArray.filter((vessel: any) => vessel.status === 'discharged').length}
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
              ) : vesselsArray.length > 0 ? (
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
                      <TableHead>Customs Release</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselsArray.map((vessel: any) => (
                      <TableRow key={vessel.id}>
                        <TableCell className="font-medium">{vessel.vesselName || 'Unnamed Vessel'}</TableCell>
                        <TableCell>CON-{vessel.contractId ? vessel.contractId.toString().padStart(3, '0') : '000'}</TableCell>
                        <TableCell>
                          <VesselLCDisplay vesselId={vessel.id} lcs={lcsArray} />
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
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={vessel.status} type="vessel" />
                            <StatusChangeDropdown
                              entityType="vessel"
                              entityId={vessel.id}
                              currentStatus={vessel.status}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            vessel?.customsReleaseStatus === 'verified' ? 'bg-green-100 text-green-800' :
                            vessel?.customsReleaseStatus === 'received' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {vessel?.customsReleaseStatus === 'verified' ? 'Released' :
                             vessel?.customsReleaseStatus === 'received' ? 'Received' :
                             'Pending'}
                          </Badge>
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
                            {vessel.status !== 'draft' && ['admin', 'shipping_officer'].includes((user as any)?.role || '') && (
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
                            {vessel.instructionsFile && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`/api/files/${vessel.instructionsFile}`} target="_blank" rel="noopener noreferrer">
                                  <Download size={14} />
                                </a>
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
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Ship className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">No vessels found</h3>
                  <p className="mt-2 text-secondary-600">
                    {statusFilter === "all" 
                      ? "Get started by nominating your first vessel." 
                      : `No vessels with status "${statusFilter}" found.`}
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
