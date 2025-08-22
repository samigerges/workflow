import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, TrendingUp, CheckCircle, FileText, Upload } from "lucide-react";

const dischargeTrackingSchema = z.object({
  arrivalDate: z.string().optional(),
  dischargeStartDate: z.string().optional(),
  dischargeEndDate: z.string().optional(),
  actualQuantity: z.number().optional(),
  customsReleaseDate: z.string().optional(),
  customsReleaseNumber: z.string().optional(),
  customsReleaseStatus: z.enum(["pending", "received", "verified"]).optional(),
});

type DischargeTrackingData = z.infer<typeof dischargeTrackingSchema>;

interface VesselDischargeTrackingProps {
  vessel: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function VesselDischargeTracking({ vessel, isOpen, onClose }: VesselDischargeTrackingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customsReleaseFile, setCustomsReleaseFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<DischargeTrackingData>({
    resolver: zodResolver(dischargeTrackingSchema),
    defaultValues: {
      arrivalDate: vessel?.arrivalDate ? new Date(vessel.arrivalDate).toISOString().slice(0, 16) : '',
      dischargeStartDate: vessel?.dischargeStartDate ? new Date(vessel.dischargeStartDate).toISOString().slice(0, 16) : '',
      dischargeEndDate: vessel?.dischargeEndDate ? new Date(vessel.dischargeEndDate).toISOString().slice(0, 16) : '',
      actualQuantity: vessel?.actualQuantity || undefined,
      customsReleaseDate: vessel?.customsReleaseDate ? new Date(vessel.customsReleaseDate).toISOString().slice(0, 16) : '',
      customsReleaseNumber: vessel?.customsReleaseNumber || '',
      customsReleaseStatus: vessel?.customsReleaseStatus || 'pending',
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DischargeTrackingData) => {
      const formData = new FormData();
      
      // Add discharge tracking fields
      if (data.arrivalDate) formData.append('arrivalDate', data.arrivalDate);
      if (data.dischargeStartDate) formData.append('dischargeStartDate', data.dischargeStartDate);
      if (data.dischargeEndDate) formData.append('dischargeEndDate', data.dischargeEndDate);
      if (data.actualQuantity !== undefined) formData.append('actualQuantity', data.actualQuantity.toString());
      
      // Add customs release fields
      if (data.customsReleaseDate) formData.append('customsReleaseDate', data.customsReleaseDate);
      if (data.customsReleaseNumber) formData.append('customsReleaseNumber', data.customsReleaseNumber);
      if (data.customsReleaseStatus) formData.append('customsReleaseStatus', data.customsReleaseStatus);
      
      // Add customs release file if uploaded
      if (customsReleaseFile) {
        formData.append('customsReleaseFile', customsReleaseFile);
      }

      const response = await fetch(`/api/vessels/${vessel.id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({
        title: "Success",
        description: "Discharge tracking updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Error updating discharge tracking:", error);
      toast({
        title: "Error",
        description: "Failed to update discharge tracking",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DischargeTrackingData) => {
    updateMutation.mutate(data);
  };

  const watchedActualQuantity = watch("actualQuantity");
  const plannedQuantity = vessel?.quantity || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Discharge Tracking - {vessel?.vesselName}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Vessel Info Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700">Vessel:</span>
                  <p className="text-blue-900">{vessel?.vesselName}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Planned Quantity:</span>
                  <p className="text-blue-900">{plannedQuantity} tons</p>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Route:</span>
                  <p className="text-blue-900">{vessel?.portOfLoading} → {vessel?.portOfDischarge}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-700">ETA:</span>
                  <p className="text-blue-900">
                    {vessel?.eta ? new Date(vessel.eta).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discharge Tracking Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="arrivalDate">Actual Arrival Date</Label>
                  <Input
                    id="arrivalDate"
                    type="datetime-local"
                    {...register("arrivalDate")}
                    className={errors.arrivalDate ? "border-red-500" : ""}
                  />
                  {errors.arrivalDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.arrivalDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dischargeStartDate">Discharge Start Date</Label>
                  <Input
                    id="dischargeStartDate"
                    type="datetime-local"
                    {...register("dischargeStartDate")}
                    className={errors.dischargeStartDate ? "border-red-500" : ""}
                  />
                  {errors.dischargeStartDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.dischargeStartDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dischargeEndDate">Discharge End Date</Label>
                  <Input
                    id="dischargeEndDate"
                    type="datetime-local"
                    {...register("dischargeEndDate")}
                    className={errors.dischargeEndDate ? "border-red-500" : ""}
                  />
                  {errors.dischargeEndDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.dischargeEndDate.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quantity Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quantity Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="actualQuantity">Actual Quantity Discharged (tons)</Label>
                  <Input
                    id="actualQuantity"
                    type="number"
                    {...register("actualQuantity", { valueAsNumber: true })}
                    placeholder="Enter actual discharged quantity"
                    className={errors.actualQuantity ? "border-red-500" : ""}
                  />
                  {errors.actualQuantity && (
                    <p className="text-sm text-red-500 mt-1">{errors.actualQuantity.message}</p>
                  )}
                </div>

                {/* Real-time Quantity Analysis */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border">
                      <span className="text-sm font-medium text-blue-700">Planned</span>
                      <p className="text-xl font-bold text-blue-900">{plannedQuantity} tons</p>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg border">
                      <span className="text-sm font-medium text-green-700">Actual</span>
                      <p className="text-xl font-bold text-green-900">
                        {watchedActualQuantity || 0} tons
                      </p>
                    </div>
                  </div>

                  {/* Variance Analysis */}
                  {watchedActualQuantity && plannedQuantity && (
                    <div className="mt-3">
                      {watchedActualQuantity < plannedQuantity ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">Shortfall:</span>
                            <span className="text-lg font-bold text-red-900">
                              {plannedQuantity - watchedActualQuantity} tons
                            </span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            {(((plannedQuantity - watchedActualQuantity) / plannedQuantity) * 100).toFixed(1)}% below planned
                          </p>
                        </div>
                      ) : watchedActualQuantity > plannedQuantity ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Excess:</span>
                            <span className="text-lg font-bold text-green-900">
                              {watchedActualQuantity - plannedQuantity} tons
                            </span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            {(((watchedActualQuantity - plannedQuantity) / plannedQuantity) * 100).toFixed(1)}% above planned
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Perfect Match</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Actual matches planned quantity exactly</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customs Release Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Customs Release Documentation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customsReleaseDate">Customs Release Date</Label>
                  <Input
                    id="customsReleaseDate"
                    type="datetime-local"
                    {...register("customsReleaseDate")}
                    className={errors.customsReleaseDate ? "border-red-500" : ""}
                  />
                  {errors.customsReleaseDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.customsReleaseDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customsReleaseNumber">Customs Release Number</Label>
                  <Input
                    id="customsReleaseNumber"
                    type="text"
                    {...register("customsReleaseNumber")}
                    placeholder="Enter customs release document number"
                    className={errors.customsReleaseNumber ? "border-red-500" : ""}
                  />
                  {errors.customsReleaseNumber && (
                    <p className="text-sm text-red-500 mt-1">{errors.customsReleaseNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customsReleaseStatus">Customs Release Status</Label>
                  <Select 
                    value={watch("customsReleaseStatus") || "pending"} 
                    onValueChange={(value) => register("customsReleaseStatus").onChange({ target: { value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Document Received</SelectItem>
                      <SelectItem value="verified">Verified & Released</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customsReleaseFile">Upload Customs Release Document</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="customsReleaseFile"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCustomsReleaseFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {vessel?.customsReleaseFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/uploads/${vessel.customsReleaseFile}`, '_blank')}
                      >
                        View Current
                      </Button>
                    )}
                  </div>
                  {customsReleaseFile && (
                    <p className="text-sm text-green-600 mt-1">
                      New file selected: {customsReleaseFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Customs Release Status Badge */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Status:</span>
                  <Badge className={
                    vessel?.customsReleaseStatus === 'verified' ? 'bg-green-100 text-green-800' :
                    vessel?.customsReleaseStatus === 'received' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {vessel?.customsReleaseStatus === 'verified' ? 'Verified & Released' :
                     vessel?.customsReleaseStatus === 'received' ? 'Document Received' :
                     'Pending Release'}
                  </Badge>
                </div>
                {vessel?.customsReleaseNumber && (
                  <p className="text-sm text-gray-600 mt-1">
                    Release Number: {vessel.customsReleaseNumber}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-primary-500 hover:bg-primary-600 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Discharge Tracking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}