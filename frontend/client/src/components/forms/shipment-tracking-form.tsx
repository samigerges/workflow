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

// Updated schema to match backend DTO
const shipmentFormSchema = z.object({
  reference: z.string().min(1, "Reference is required"), // Changed from billOfLadingNumber to reference
  status: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative").optional().or(z.literal("")),
  unit: z.string().optional(),
  loadDate: z.string().optional(), // Changed from loadingDate to loadDate
  eta: z.string().optional(),
  etd: z.string().optional(),
  deliveryDate: z.string().optional(),
  vesselId: z.string().min(1, "Vessel is required"), // Changed to string for Guid
  contractId: z.string().optional(),
  letterOfCreditId: z.string().optional(),
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
      loadDate: shipment.loadDate ? new Date(shipment.loadDate).toISOString().split('T')[0] : '',
      eta: shipment.eta ? new Date(shipment.eta).toISOString().split('T')[0] : '',
      etd: shipment.etd ? new Date(shipment.etd).toISOString().split('T')[0] : '',
      deliveryDate: shipment.deliveryDate ? new Date(shipment.deliveryDate).toISOString().split('T')[0] : '',
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
          window.location.href = "/login";
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
              <Label htmlFor="reference">Reference *</Label>
              <Input
                id="reference"
                {...register("reference")}
                placeholder="BL-2024-001"
                className={errors.reference ? "border-red-500" : ""}
              />
              {errors.reference && (
                <p className="text-sm text-red-500 mt-1">{errors.reference.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="vesselId">Vessel *</Label>
              <select 
                {...register("vesselId")}
                className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select vessel</option>
                {vessels.map((vessel) => (
                  <option key={vessel.id} value={vessel.id}>
                    {vessel.name || vessel.vesselName}
                  </option>
                ))}
              </select>
              {errors.vesselId && (
                <p className="text-sm text-red-500 mt-1">{errors.vesselId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                {...register("unit")}
                placeholder="tons"
              />
            </div>
            <div>
              <Label htmlFor="loadDate">Load Date</Label>
              <Input
                id="loadDate"
                type="date"
                {...register("loadDate")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="eta">ETA</Label>
              <Input
                id="eta"
                type="date"
                {...register("eta")}
              />
            </div>
            <div>
              <Label htmlFor="etd">ETD</Label>
              <Input
                id="etd"
                type="date"
                {...register("etd")}
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                {...register("deliveryDate")}
              />
            </div>
          </div>


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
