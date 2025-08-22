import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertContractSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { CARGO_TYPES, COUNTRIES } from "@/lib/constants";

// Create a more flexible schema for drafts
const contractFormSchema = z.object({
  requestId: z.coerce.number().min(1, "Please select a request"),
  supplierName: z.string().min(1, "Supplier name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").optional().or(z.literal("")),
  cargoType: z.string().min(1, "Cargo type is required"),
  countryOfOrigin: z.string().optional(),
  incoterms: z.string().min(1, "Incoterms is required"),
  contractTerms: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reviewNotes: z.string().optional(),
  status: z.string().default("draft"),
  createdBy: z.string().optional(),
})
.refine(
  (data) => {
    // File upload is mandatory - check if files are selected
    return true; // We'll validate this in the component
  },
  {
    message: "Contract document is required",
    path: ["uploadedFile"]
  }
);

type ContractFormData = z.infer<typeof contractFormSchema>;

interface ContractFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  requests: any[];
  contract?: any;
}

export default function ContractForm({ onSuccess, onCancel, onDelete, requests, contract }: ContractFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: contract ? {
      ...contract,
      quantity: contract.quantity ? parseInt(contract.quantity) : 0,
      startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
    } : {
      status: "draft"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const formData = new FormData();
      
      // Add form fields - ensure required fields are present
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add file if selected
      if (selectedFiles.length > 0) {
        formData.append('contractFile', selectedFiles[0]);
      }

      const url = contract ? `/api/contracts/${contract.id}` : "/api/contracts";
      const method = contract ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: contract ? "Contract updated successfully" : "Contract created successfully",
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
        description: contract ? "Failed to update contract" : "Failed to create contract",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contract?.id) throw new Error("Contract ID is required");
      
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
      onDelete?.();
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
        description: "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContractFormData) => {
    // Validate mandatory file upload
    if (selectedFiles.length === 0 && !contract?.uploadedFile) {
      toast({
        title: "Contract Document Required",
        description: "Please upload a contract document",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Form submitted with data:", data);
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="requestId">Related Request *</Label>
              <Select 
                onValueChange={(value) => setValue("requestId", parseInt(value))}
                defaultValue={contract?.requestId?.toString()}
              >
                <SelectTrigger className={errors.requestId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a request" />
                </SelectTrigger>
                <SelectContent>
                  {requests.map((request) => (
                    <SelectItem key={request.id} value={request.id.toString()}>
                      REQ-{request.id.toString().padStart(3, '0')} - {request.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.requestId && (
                <p className="text-sm text-red-500 mt-1">{errors.requestId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="status">Contract Status</Label>
              <Select 
                onValueChange={(value) => setValue("status", value)}
                defaultValue={contract?.status || "draft"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="supplierName">Supplier/Vendor Name *</Label>
              <Input
                id="supplierName"
                {...register("supplierName")}
                placeholder="Company name"
                className={errors.supplierName ? "border-red-500" : ""}
              />
              {errors.supplierName && (
                <p className="text-sm text-red-500 mt-1">{errors.supplierName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cargoType">Cargo Type *</Label>
              <Select 
                onValueChange={(value) => setValue("cargoType", value)}
                defaultValue={contract?.cargoType}
              >
                <SelectTrigger className={errors.cargoType ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select cargo type" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_TYPES.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value}>{cargo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cargoType && (
                <p className="text-sm text-red-500 mt-1">{errors.cargoType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="countryOfOrigin">Country of Origin</Label>
              <Select 
                onValueChange={(value) => setValue("countryOfOrigin", value)}
                defaultValue={contract?.countryOfOrigin}
              >
                <SelectTrigger className={errors.countryOfOrigin ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select country of origin" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.countryOfOrigin && (
                <p className="text-sm text-red-500 mt-1">{errors.countryOfOrigin.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="incoterms">Incoterms *</Label>
              <Select 
                onValueChange={(value) => setValue("incoterms", value)}
                defaultValue={contract?.incoterms}
              >
                <SelectTrigger className={errors.incoterms ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select incoterms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CIF">CIF - Cost, Insurance & Freight</SelectItem>
                  <SelectItem value="FOB">FOB - Free on Board</SelectItem>
                  <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                  <SelectItem value="DAP">DAP - Delivered at Place</SelectItem>
                  <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                  <SelectItem value="FCA">FCA - Free Carrier</SelectItem>
                </SelectContent>
              </Select>
              {errors.incoterms && (
                <p className="text-sm text-red-500 mt-1">{errors.incoterms.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="e.g. 1000"
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Contract Document *</Label>
            <FileUpload
              accept=".pdf,.doc,.docx"
              onFileSelect={setSelectedFiles}
              existingFile={contract?.uploadedFile}
              description="PDF, DOC, DOCX up to 10MB (Required)"
            />
            {selectedFiles.length === 0 && !contract?.uploadedFile && (
              <p className="text-sm text-red-500 mt-1">Contract document is required</p>
            )}
          </div>

          <div>
            <Label htmlFor="contractTerms">Contract Terms & Conditions</Label>
            <Textarea
              id="contractTerms"
              {...register("contractTerms")}
              rows={4}
              placeholder="Key terms, payment conditions, delivery terms, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate">Import Duration - Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Import Duration - End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate")}
                placeholder="Select end date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reviewNotes">Review Notes</Label>
            <Textarea
              id="reviewNotes"
              {...register("reviewNotes")}
              rows={3}
              placeholder="Administrative notes and comments"
            />
          </div>

          <div className="flex justify-between">
            <div className="flex space-x-3">
              {contract && (
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Contract"}
                </Button>
              )}
            </div>
            <div className="flex space-x-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  console.log("Save Draft clicked");
                  console.log("Form errors:", errors);
                  setValue("status", "draft");
                  handleSubmit(onSubmit)();
                }}
                disabled={createMutation.isPending}
              >
                Save Draft
              </Button>
              <Button 
                type="submit" 
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving..." : (contract ? "Update Contract" : "Create Contract")}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
