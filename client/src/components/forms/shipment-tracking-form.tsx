import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertShipmentSchema } from "@/lib/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { CheckCircle, Ship, Anchor, Download } from "lucide-react";

const shipmentFormSchema = insertShipmentSchema.extend({
  loadingDate: z.string().optional(),
  norDate: z.string().optional(),
  actualArrivalTime: z.string().optional(),
  dischargeStartDate: z.string().optional(),
  dischargeEndDate: z.string().optional(),
});

type ShipmentFormData = z.infer<typeof shipmentFormSchema>;

interface ShipmentTrackingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  vessels: any[];
  shipment?: any;
}

export default function ShipmentTrackingForm({ onSuccess, onCancel, vessels, shipment }: ShipmentTrackingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bolFiles, setBolFiles] = useState<File[]>([]);
  const [norFiles, setNorFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: shipment ? {
      ...shipment,
      loadingDate: shipment.loadingDate ? new Date(shipment.loadingDate).toISOString().split('T')[0] : '',
      norDate: shipment.norDate ? new Date(shipment.norDate).toISOString().slice(0, 16) : '',
      actualArrivalTime: shipment.actualArrivalTime ? new Date(shipment.actualArrivalTime).toISOString().slice(0, 16) : '',
      dischargeStartDate: shipment.dischargeStartDate ? new Date(shipment.dischargeStartDate).toISOString().slice(0, 16) : '',
      dischargeEndDate: shipment.dischargeEndDate ? new Date(shipment.dischargeEndDate).toISOString().slice(0, 16) : '',
    } : {
      status: "loading"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: ShipmentFormData) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key.includes('Date') || key.includes('Time')) {
            // Convert dates to ISO string
            formData.append(key, new Date(value as string).toISOString());
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add files
      if (bolFiles.length > 0) {
        formData.append('billOfLadingFile', bolFiles[0]);
      }
      if (norFiles.length > 0) {
        formData.append('norFile', norFiles[0]);
      }

      const url = shipment ? `/api/shipments/${shipment.id}` : "/api/shipments";
      const method = shipment ? "PUT" : "POST";
      
        const response = await apiRequest(method, url, formData);

        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      toast({
        title: "Success",
        description: shipment ? "Shipment updated successfully" : "Shipment created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: shipment ? "Failed to update shipment" : "Failed to create shipment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ShipmentFormData) => {
    createMutation.mutate(data);
  };

  // Mock timeline data
  const timelineSteps = [
    {
      id: 'loading',
      title: 'Loading Complete',
      description: 'Cargo loaded at port',
      icon: CheckCircle,
      completed: true,
      date: '2024-12-10'
    },
    {
      id: 'in_transit',
      title: 'In Transit',
      description: 'Vessel en route',
      icon: Ship,
      completed: true,
      date: null
    },
    {
      id: 'nor_issued',
      title: 'Notice of Readiness',
      description: 'NOR document issued',
      icon: Anchor,
      completed: false,
      date: null
    },
    {
      id: 'discharged',
      title: 'Discharge',
      description: 'Cargo unloading',
      icon: Download,
      completed: false,
      date: null
    }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        {/* Shipment Timeline */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Shipment Progress</h3>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-secondary-200"></div>
            <div className="space-y-6">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="relative flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-100' : 'bg-secondary-100'
                    }`}>
                      <Icon className={step.completed ? 'text-green-600' : 'text-secondary-600'} size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-secondary-900">{step.title}</h4>
                      <p className="text-sm text-secondary-600">{step.description}</p>
                      {step.date && (
                        <p className="text-xs text-secondary-500">{step.date}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Shipment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vesselId">Vessel *</Label>
              <select 
                {...register("vesselId", { valueAsNumber: true })}
                className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select vessel</option>
                {vessels.map((vessel) => (
                  <option key={vessel.id} value={vessel.id}>
                    {vessel.vesselName}
                  </option>
                ))}
              </select>
              {errors.vesselId && (
                <p className="text-sm text-red-500 mt-1">{errors.vesselId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="loadingDate">Loading Date</Label>
              <Input
                id="loadingDate"
                type="date"
                {...register("loadingDate")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="billOfLadingNumber">Bill of Lading Number</Label>
              <Input
                id="billOfLadingNumber"
                {...register("billOfLadingNumber")}
                placeholder="BL-2024-001"
              />
            </div>
            <div>
              <Label>Bill of Lading Document</Label>
              <FileUpload
                accept=".pdf"
                onFileSelect={setBolFiles}
                existingFile={shipment?.billOfLadingFile}
                description="PDF files up to 5MB"
              />
            </div>
          </div>

          {/* NOR Section */}
          <Card className="border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-lg">Notice of Readiness (NOR)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="norDate">NOR Date & Time</Label>
                  <Input
                    id="norDate"
                    type="datetime-local"
                    {...register("norDate")}
                  />
                </div>
                <div>
                  <Label htmlFor="actualArrivalTime">Actual Arrival Time</Label>
                  <Input
                    id="actualArrivalTime"
                    type="datetime-local"
                    {...register("actualArrivalTime")}
                  />
                </div>
              </div>
              <div>
                <Label>NOR Document</Label>
                <FileUpload
                  accept=".pdf"
                  onFileSelect={setNorFiles}
                  existingFile={shipment?.norFile}
                  description="PDF files up to 5MB"
                />
              </div>
            </CardContent>
          </Card>

          {/* Discharge Section */}
          <Card className="border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-lg">Discharge Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="dischargeStartDate">Discharge Start Date</Label>
                  <Input
                    id="dischargeStartDate"
                    type="datetime-local"
                    {...register("dischargeStartDate")}
                  />
                </div>
                <div>
                  <Label htmlFor="dischargeEndDate">Discharge End Date</Label>
                  <Input
                    id="dischargeEndDate"
                    type="datetime-local"
                    {...register("dischargeEndDate")}
                  />
                </div>
                <div>
                  <Label htmlFor="quantityUnloaded">Quantity Unloaded</Label>
                  <Input
                    id="quantityUnloaded"
                    type="number"
                    {...register("quantityUnloaded", { valueAsNumber: true })}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="button" 
              variant="outline"
              disabled={createMutation.isPending}
            >
              Save Progress
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Updating..." : "Update Shipment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
