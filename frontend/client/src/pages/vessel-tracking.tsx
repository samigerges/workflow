import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Ship, Eye, Edit, TrendingUp, CheckCircle } from "lucide-react";
import VesselStepper, {
  VESSEL_STAGES,
  findStageByStatus,
  normalizeStageId,
} from "@/components/vessel-stepper";

/* ----------------------------- Types & helpers ---------------------------- */

type VesselStatus = string;

interface Vessel {
  id: number;
  vesselName: string;
  cargoType?: string;
  status: VesselStatus;
  eta?: string | null; // ISO string
  arrivalDate?: string | null; // ISO string
  dischargeStartDate?: string | null; // ISO string
  quantity?: number; // contractual quantity (tons)
  discharged_quantity?: number; // cumulative discharged so far (tons)
}

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "-";

const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString() : "";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const todayLocalISO = () => {
  // Ensures the default <input type="date" /> value matches local date (not UTC)
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

const getETAChip = (eta?: string | null) => {
  if (!eta) return "TBD";
  const etaDate = new Date(eta);
  const now = new Date();
  const diffMs = etaDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays} days`;
};

const stageIconMap = new Map(
  VESSEL_STAGES.map((stage) => [stage.id, stage.icon])
);

const getStatusIcon = (status: VesselStatus) => {
  const Icon = stageIconMap.get(normalizeStageId(status));
  if (Icon) {
    return <Icon className="h-4 w-4" />;
  }
  return <Ship className="h-4 w-4" />;
};

/* ----------------------------- Zod + RHF types ---------------------------- */

const dischargeUpdateSchema = z.object({
  vesselId: z.number(),
  date: z.string(), // yyyy-mm-dd from <input type="date" />
  quantityDischarged: z
    .number({ invalid_type_error: "Enter a number" })
    .positive("Quantity must be positive"),
  notes: z.string().optional(),
});

type DischargeUpdateData = z.infer<typeof dischargeUpdateSchema>;

/* ------------------------ Discharge Update Dialog ------------------------- */

function DischargeUpdateDialog({
  vessel,
  isOpen,
  onClose,
}: {
  vessel: Vessel | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const contractualQuantity = vessel?.quantity ?? 0;
  const currentDischarged = vessel?.discharged_quantity ?? 0;
  const remaining = Math.max(0, contractualQuantity - currentDischarged);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setError,
  } = useForm<DischargeUpdateData>({
    resolver: zodResolver(dischargeUpdateSchema),
    defaultValues: {
      vesselId: vessel?.id ?? 0,
      date: todayLocalISO(),
      quantityDischarged: 0,
      notes: "",
    },
  });

  // Keep form vesselId & default date in sync when dialog opens for a new vessel
  useEffect(() => {
    reset({
      vesselId: vessel?.id ?? 0,
      date: todayLocalISO(),
      quantityDischarged: 0,
      notes: "",
    });
    setUploadedFile(null);
  }, [vessel, reset]);

  const watchedQuantity = watch("quantityDischarged") || 0;
  const newCumulative = currentDischarged + watchedQuantity;

  const updateMutation = useMutation({
    mutationFn: async (data: DischargeUpdateData) => {
      const formData = new FormData();
      formData.append("vesselId", String(data.vesselId));
      formData.append("date", data.date);
      formData.append("quantityDischarged", String(data.quantityDischarged));
      if (data.notes) formData.append("notes", data.notes);
      if (uploadedFile) formData.append("proofDocument", uploadedFile);

      const response = await apiRequest(
        "POST",
        "/api/vessels/discharge-updates",
        formData
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update discharge quantity");
      }
      return response.json();
    },
    onSuccess: (payload) => {
      // Optimistic refresh
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vessels/discharge-updates"] });
      toast({
        title: "Success",
        description: "Discharge quantity updated successfully",
      });
      reset();
      setUploadedFile(null);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update discharge quantity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DischargeUpdateData) => {
    // Guard: don't allow entering more than remaining unless it's exactly completing (business rule – adjust as needed)
    if (data.quantityDischarged > remaining) {
      setError("quantityDischarged", {
        type: "manual",
        message: `Exceeds remaining contract (${remaining.toLocaleString()} tons)`,
      });
      return;
    }
    updateMutation.mutate(data);
  };

  return (
    <Dialog
      open={isOpen}
      // Only close when user requests close (avoid firing on open)
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Update Discharge Quantity{vessel?.vesselName ? ` – ${vessel.vesselName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Status Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm font-medium text-blue-700">Contractual Quantity</p>
                  <p className="text-lg font-bold text-blue-900">
                    {contractualQuantity.toLocaleString()} tons
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Currently Discharged</p>
                  <p className="text-lg font-bold text-blue-900">
                    {currentDischarged.toLocaleString()} tons
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Remaining</p>
                  <p className="text-lg font-bold text-blue-900">
                    {remaining.toLocaleString()} tons
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Discharge Date</Label>
              <Input
                id="date"
                type="date"
                // Prevent future dates
                max={todayLocalISO()}
                {...register("date")}
                className={errors.date ? "border-red-500" : ""}
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantityDischarged">Daily Quantity Discharged (tons)</Label>
              <Input
                id="quantityDischarged"
                type="number"
                step="0.01"
                min={0.01}
                // Show remaining as a helpful upper bound
                max={Math.max(0.01, remaining)}
                placeholder="Enter today's discharged quantity"
                {...register("quantityDischarged", { valueAsNumber: true })}
                className={errors.quantityDischarged ? "border-red-500" : ""}
                aria-invalid={!!errors.quantityDischarged}
              />
              <div className="text-xs text-gray-500 mt-1">
                Allowed: up to {remaining.toLocaleString()} tons
              </div>
              {errors.quantityDischarged && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.quantityDischarged.message}
                </p>
              )}
            </div>
          </div>

          {/* New Cumulative Preview */}
          {watchedQuantity > 0 && (
            <Card
              className={
                newCumulative <= contractualQuantity
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">New Total Discharged</p>
                    <p className="text-xl font-bold">
                      {newCumulative.toLocaleString()} tons
                    </p>
                  </div>
                  <div className="text-right">
                    {newCumulative <= contractualQuantity ? (
                      <div className="flex items-center text-green-700">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm">Within contract</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-700">
                        <TrendingUp className="h-5 w-5 mr-1" />
                        <span className="text-sm">
                          Over contract by{" "}
                          {(newCumulative - contractualQuantity).toLocaleString()} tons
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input id="notes" {...register("notes")} placeholder="Additional notes" />
          </div>

          <div>
            <Label htmlFor="proofDocument">Upload Proof Document</Label>
            <Input
              id="proofDocument"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
            />
            {uploadedFile && (
              <p className="text-sm text-green-600 mt-1">Selected: {uploadedFile.name}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
              {isSubmitting || updateMutation.isPending ? "Updating..." : "Update Discharge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function VesselTracking() {
  const [selectedStatus, setSelectedStatus] = useState<VesselStatus | "all">("all");
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [updateVessel, setUpdateVessel] = useState<Vessel | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const { data: vessels, isLoading } = useQuery({
    queryKey: ["/api/vessels"],
    // If you have a global defaultQueryFn, you can omit queryFn.
    // queryFn: () => apiRequest('GET', '/api/vessels').then(r => r.json()),
    staleTime: 30_000,
    select: (d) => d as Vessel[] | undefined,
  });

  const filteredVessels = useMemo(() => {
    const list = vessels ?? [];
    if (selectedStatus === "all") {
      return list;
    }
    return list.filter(
      (v) => normalizeStageId(v.status ?? "") === selectedStatus
    );
  }, [vessels, selectedStatus]);

  const { stageCounts, unmatchedCount } = useMemo(() => {
    const base = VESSEL_STAGES.reduce<Record<string, number>>((acc, stage) => {
      acc[stage.id] = 0;
      return acc;
    }, {});

    let other = 0;
    for (const vessel of filteredVessels) {
      const key = normalizeStageId(vessel.status ?? "");
      if (key && key in base) {
        base[key] += 1;
      } else if (vessel.status) {
        other += 1;
      }
    }

    return { stageCounts: base, unmatchedCount: other };
  }, [filteredVessels]);

  if (isLoading) {
    return (
      <MainLayout
        title="Vessel Tracking"
        subtitle="Real-time vessel location and status"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-secondary-600">Loading vessel tracking data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Vessel Tracking" subtitle="Real-time vessel location and status">
      <div className="space-y-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                <CardTitle>Vessel Status Filter</CardTitle>
              </div>
              <div className="flex items-center space-x-4">
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as VesselStatus | "all")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Vessels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vessels</SelectItem>
                    {VESSEL_STAGES.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-sm">
                  {filteredVessels.length} vessels
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredVessels.length}
              </div>
              <div className="text-sm text-secondary-600">Total Vessels</div>
            </div>

            {VESSEL_STAGES.map((stage) => {
              const value = stageCounts[stage.id] ?? 0;
              return (
                <div key={stage.id} className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      stage.statTextColor ?? "text-primary-600"
                    }`}
                  >
                    {value}
                  </div>
                  <div className="text-sm text-secondary-600">{stage.title}</div>
                </div>
              );
            })}

            {unmatchedCount > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {unmatchedCount}
                </div>
                <div className="text-sm text-secondary-600">Other Statuses</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vessel Discharge Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vessel Discharge Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredVessels.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                No vessels found for selected filter
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vessel</TableHead>
                      <TableHead>ETA Date</TableHead>
                      <TableHead>ATA Date</TableHead>
                      <TableHead>Contractual Quantity</TableHead>
                      <TableHead>Start of Discharge</TableHead>
                      <TableHead>Quantity Discharged</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVessels.map((vessel) => {
                      const stageMeta = findStageByStatus(vessel.status);
                      const contractualQty = vessel.quantity ?? 0;
                      const dischargedQty = vessel.discharged_quantity ?? 0;
                      const progressPercent =
                        contractualQty > 0
                          ? (dischargedQty / contractualQty) * 100
                          : 0;

                      return (
                        <TableRow
                          key={vessel.id}
                          className={selectedVessel?.id === vessel.id ? "bg-primary-50" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(vessel.status)}
                              <div>
                                <div>{vessel.vesselName}</div>
                                <div className="text-xs text-gray-500">{vessel.cargoType}</div>
                                {stageMeta && (
                                  <div className="text-xs text-gray-400">
                                    {stageMeta.title}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              {vessel.eta ? formatDate(vessel.eta) : "TBD"}
                              {vessel.eta && (
                                <div className="text-xs text-gray-500">
                                  {getETAChip(vessel.eta)}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              {formatDate(vessel.arrivalDate)}
                              {vessel.arrivalDate && (
                                <div className="text-xs text-gray-500">
                                  {formatTime(vessel.arrivalDate)}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-medium">
                              {contractualQty.toLocaleString()} tons
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              {formatDate(vessel.dischargeStartDate)}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {dischargedQty.toLocaleString()} tons
                              </div>
                              {contractualQty > 0 && (
                                <div className="text-xs text-gray-500">
                                  {(dischargedQty / contractualQty * 100).toFixed(1)}% complete
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2" aria-hidden>
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    progressPercent >= 100
                                      ? "bg-green-500"
                                      : progressPercent >= 50
                                      ? "bg-blue-500"
                                      : "bg-yellow-500"
                                  }`}
                                  style={{ width: `${clamp(progressPercent, 0, 100)}%` }}
                                />
                              </div>
                              <div className="text-xs text-center">
                                {progressPercent.toFixed(0)}%
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVessel(
                                    selectedVessel?.id === vessel.id ? null : vessel
                                  );
                                }}
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setUpdateVessel(vessel);
                                  setShowUpdateDialog(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Update
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vessel Progress Stepper */}
        {selectedVessel && (
          <VesselStepper
            selectedVessel={selectedVessel}
            vessels={filteredVessels}
            onClose={() => setSelectedVessel(null)}
          />
        )}

        {/* Discharge Update Dialog */}
        <DischargeUpdateDialog
          vessel={updateVessel}
          isOpen={showUpdateDialog}
          onClose={() => {
            setShowUpdateDialog(false);
            setUpdateVessel(null);
          }}
        />
      </div>
    </MainLayout>
  );
}
