import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertFinalSettlementSchema } from "@samy/shared";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";

const settlementFormSchema = insertFinalSettlementSchema.extend({
  settlementDate: z.string(),
});

type SettlementFormData = z.infer<typeof settlementFormSchema>;

interface FinalSettlementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  requests: any[];
  settlement?: any;
}

export default function FinalSettlementForm({ onSuccess, onCancel, requests, settlement }: FinalSettlementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: settlement ? {
      ...settlement,
      settlementDate: settlement.settlementDate ? new Date(settlement.settlementDate).toISOString().split('T')[0] : '',
    } : {
      status: "pending"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: SettlementFormData) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add file if selected
      if (selectedFiles.length > 0) {
        formData.append('documentsFile', selectedFiles[0]);
      }

      const url = settlement ? `/api/final-settlements/${settlement.id}` : "/api/final-settlements";
      const method = settlement ? "PUT" : "POST";
      
        const response = await apiRequest(method, url, formData);

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/final-settlements"] });
      toast({
        title: "Success",
        description: settlement ? "Settlement updated successfully" : "Settlement created successfully",
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
        description: settlement ? "Failed to update settlement" : "Failed to create settlement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettlementFormData) => {
    createMutation.mutate(data);
  };

  // Calculate totals
  const watchedValues = watch();
  const calculateTotal = () => {
    const costs = [
      'goodsCost',
      'shippingCost', 
      'insurance',
      'portCharges',
      'customsDuties',
      'otherFees'
    ];
    
    return costs.reduce((total, field) => {
      const value = parseFloat(watchedValues[field as keyof typeof watchedValues] as string || '0');
      return total + (isNaN(value) ? 0 : value);
    }, 0);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Financial Summary */}
        <Card className="bg-secondary-50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-secondary-600">Total Calculated</p>
                <p className="text-2xl font-bold text-secondary-900">
                  ${calculateTotal().toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-600">Final Invoice Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ${parseFloat(watchedValues.finalInvoiceAmount || '0').toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-600">Difference</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${(parseFloat(watchedValues.finalInvoiceAmount || '0') - calculateTotal()).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="requestId">Related Request *</Label>
              <select 
                {...register("requestId", { valueAsNumber: true })}
                className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a request</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    REQ-{request.id.toString().padStart(3, '0')} - {request.title}
                  </option>
                ))}
              </select>
              {errors.requestId && (
                <p className="text-sm text-red-500 mt-1">{errors.requestId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="settlementDate">Settlement Date *</Label>
              <Input
                id="settlementDate"
                type="date"
                {...register("settlementDate")}
                className={errors.settlementDate ? "border-red-500" : ""}
              />
              {errors.settlementDate && (
                <p className="text-sm text-red-500 mt-1">{errors.settlementDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="finalInvoiceAmount">Final Invoice Amount (USD) *</Label>
            <Input
              id="finalInvoiceAmount"
              type="number"
              step="0.01"
              {...register("finalInvoiceAmount")}
              placeholder="235750"
              className={errors.finalInvoiceAmount ? "border-red-500" : ""}
            />
            {errors.finalInvoiceAmount && (
              <p className="text-sm text-red-500 mt-1">{errors.finalInvoiceAmount.message}</p>
            )}
          </div>

          {/* Cost Breakdown */}
          <Card className="border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-lg">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goodsCost">Goods Cost</Label>
                  <Input
                    id="goodsCost"
                    type="number"
                    step="0.01"
                    {...register("goodsCost")}
                    placeholder="200000"
                  />
                </div>
                <div>
                  <Label htmlFor="shippingCost">Shipping Cost</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    step="0.01"
                    {...register("shippingCost")}
                    placeholder="15000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurance">Insurance</Label>
                  <Input
                    id="insurance"
                    type="number"
                    step="0.01"
                    {...register("insurance")}
                    placeholder="2500"
                  />
                </div>
                <div>
                  <Label htmlFor="portCharges">Port Charges</Label>
                  <Input
                    id="portCharges"
                    type="number"
                    step="0.01"
                    {...register("portCharges")}
                    placeholder="3250"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customsDuties">Customs Duties</Label>
                  <Input
                    id="customsDuties"
                    type="number"
                    step="0.01"
                    {...register("customsDuties")}
                    placeholder="12000"
                  />
                </div>
                <div>
                  <Label htmlFor="otherFees">Other Fees</Label>
                  <Input
                    id="otherFees"
                    type="number"
                    step="0.01"
                    {...register("otherFees")}
                    placeholder="3000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="settlementNotes">Settlement Notes</Label>
            <Textarea
              id="settlementNotes"
              {...register("settlementNotes")}
              rows={4}
              placeholder="Final settlement notes, discrepancies, adjustments..."
            />
          </div>

          <div>
            <Label>Settlement Documents</Label>
            <FileUpload
              accept=".pdf"
              multiple
              onFileSelect={setSelectedFiles}
              existingFile={settlement?.documentsFile}
              description="PDF files up to 10MB each"
            />
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
              onClick={() => setValue("status", "pending")}
              disabled={createMutation.isPending}
            >
              Save Draft
            </Button>
            <Button 
              type="submit" 
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Processing..." : "Complete Settlement"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
