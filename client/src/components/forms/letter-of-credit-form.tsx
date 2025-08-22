import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertLetterOfCreditSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { CURRENCIES } from "@/lib/constants";

// Create a more flexible schema for drafts
const lcFormSchema = z.object({
  lcNumber: z.string().min(1, "LC Number is required"),
  currency: z.string().default("USD"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative").optional().or(z.literal("")),
  issuingBank: z.string().optional(),
  advisingBank: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  termsConditions: z.string().optional(),
  status: z.string().default("draft"),
  createdBy: z.string().optional(),
});

type LCFormData = z.infer<typeof lcFormSchema>;

interface LetterOfCreditFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  requests: any[];
  contracts: any[];
  lc?: any;
  onDeleteRequest?: (requestId: number) => void;
}

export default function LetterOfCreditForm({ onSuccess, onCancel, requests, contracts, lc, onDeleteRequest }: LetterOfCreditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LCFormData>({
    resolver: zodResolver(lcFormSchema),
    defaultValues: lc ? {
      ...lc,
      issueDate: lc.issueDate ? new Date(lc.issueDate).toISOString().split('T')[0] : '',
      expiryDate: lc.expiryDate ? new Date(lc.expiryDate).toISOString().split('T')[0] : '',
    } : {
      currency: "USD",
      status: "draft"
    }
  });

  // Watch for changes in quantity
  const watchedQuantity = watch('quantity');

  const createMutation = useMutation({
    mutationFn: async (data: LCFormData) => {
      const formData = new FormData();
      
      // Add form fields - ensure required fields are present
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'unitPrice') {
            // Convert unitPrice to string for FormData
            if (typeof value === 'number' && value >= 0) {
              formData.append(key, value.toString());
            }
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add default values for required fields if not provided (for drafts)
      if (data.status === 'draft') {
        if (!data.unitPrice || data.unitPrice === 0) {
          formData.append('unitPrice', '0');
        }
        if (!data.issueDate) {
          formData.append('issueDate', new Date().toISOString().split('T')[0]);
        }
        if (!data.expiryDate) {
          const defaultExpiry = new Date();
          defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
          formData.append('expiryDate', defaultExpiry.toISOString().split('T')[0]);
        }
        if (!data.issuingBank) {
          formData.append('issuingBank', 'TBD');
        }
      }

      // Add file if selected
      if (selectedFiles.length > 0) {
        formData.append('lcFile', selectedFiles[0]);
      }

      const url = lc ? `/api/letters-of-credit/${lc.id}` : "/api/letters-of-credit";
      const method = lc ? "PUT" : "POST";
      
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
      queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] });
      toast({
        title: "Success",
        description: lc ? "Letter of Credit updated successfully" : "Letter of Credit created successfully",
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
        description: lc ? "Failed to update LC" : "Failed to create LC",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LCFormData) => {
    console.log("LC Form submitted with data:", data);
    
    // Check if file is required - for new LCs or existing LCs without a file
    const isFileRequired = !lc || !lc.uploadedFile;
    
    if (isFileRequired && selectedFiles.length === 0) {
      setFileError("LC documentation is required");
      toast({
        title: "File Required",
        description: "Please upload LC documentation before submitting",
        variant: "destructive",
      });
      return;
    }
    
    setFileError(""); // Clear any previous file errors
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Label htmlFor="lcNumber">LC Number *</Label>
              <Input
                id="lcNumber"
                {...register("lcNumber")}
                placeholder="LC-2024-001"
                className={errors.lcNumber ? "border-red-500" : ""}
              />
              {errors.lcNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.lcNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select 
                onValueChange={(value) => setValue("currency", value)}
                defaultValue={lc?.currency || "USD"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity (tons) *</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="1000"
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          {/* LC Quantity Display */}
          {watchedQuantity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">LC Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Quantity:</span>
                  <p className="font-medium">{watchedQuantity ? `${Number(watchedQuantity).toLocaleString()} tons` : '0 tons'}</p>
                </div>
                <div>
                  <span className="text-blue-700">Currency:</span>
                  <p className="font-medium">{watch('currency') || 'USD'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="issuingBank">Issuing Bank *</Label>
              <Input
                id="issuingBank"
                {...register("issuingBank")}
                placeholder="Bank name"
                className={errors.issuingBank ? "border-red-500" : ""}
              />
              {errors.issuingBank && (
                <p className="text-sm text-red-500 mt-1">{errors.issuingBank.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="advisingBank">Advising Bank</Label>
              <Input
                id="advisingBank"
                {...register("advisingBank")}
                placeholder="Bank name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input
                id="issueDate"
                type="date"
                {...register("issueDate")}
                className={errors.issueDate ? "border-red-500" : ""}
              />
              {errors.issueDate && (
                <p className="text-sm text-red-500 mt-1">{errors.issueDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input
                id="expiryDate"
                type="date"
                {...register("expiryDate")}
                className={errors.expiryDate ? "border-red-500" : ""}
              />
              {errors.expiryDate && (
                <p className="text-sm text-red-500 mt-1">{errors.expiryDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="termsConditions">LC Terms & Conditions</Label>
            <Textarea
              id="termsConditions"
              {...register("termsConditions")}
              rows={4}
              placeholder="Payment terms, shipping terms, document requirements, etc."
            />
          </div>

          <div>
            <Label>LC Documentation *</Label>
            <FileUpload
              accept=".pdf"
              multiple
              onFileSelect={(files) => {
                setSelectedFiles(files);
                if (files.length > 0) {
                  setFileError(""); // Clear error when file is selected
                }
              }}
              existingFile={lc?.uploadedFile}
              description="PDF files up to 10MB each - Required for all LCs"
            />
            {fileError && (
              <p className="text-sm text-red-500 mt-1">{fileError}</p>
            )}
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
              onClick={() => {
                console.log("LC Save Draft clicked");
                console.log("LC Form errors:", errors);
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
              {createMutation.isPending ? "Processing..." : (lc ? "Update LC" : "Issue LC")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
