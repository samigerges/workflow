import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { CURRENCIES } from "@/lib/constants";
import { normalizeLc } from "@/lib/lc";

// Create a more flexible schema for drafts - matching backend DTO
const lcFormSchema = z.object({
  number: z.string().min(1, "LC Number is required"), // Changed from lcNumber to number
  issuingBank: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount cannot be negative").optional().or(z.literal("")), // Changed from quantity to amount
  currency: z.string().default("USD"),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  applicant: z.string().optional(), // Added missing field
  beneficiary: z.string().optional(), // Added missing field
  contractId: z.string().optional(), // Added missing field
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

  const normalizedLc = useMemo(() => (lc ? normalizeLc(lc) : null), [lc]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LCFormData>({
    resolver: zodResolver(lcFormSchema),
    defaultValues: normalizedLc
      ? {
          number: normalizedLc.number,
          issuingBank: normalizedLc.issuingBank ?? "",
          amount: normalizedLc.amount ?? undefined,
          currency: normalizedLc.currency ?? "USD",
          issueDate: normalizedLc.issueDate
            ? new Date(normalizedLc.issueDate).toISOString().split("T")[0]
            : "",
          expiryDate: normalizedLc.expiryDate
            ? new Date(normalizedLc.expiryDate).toISOString().split("T")[0]
            : "",
          applicant: normalizedLc.applicant ?? "",
          beneficiary: normalizedLc.beneficiary ?? "",
          contractId: normalizedLc.contractId ?? "",
          status: normalizedLc.statusKey ?? "draft",
        }
      : {
          currency: "USD",
          status: "draft",
        },
  });

  const watchedAmount = watch("amount");
  const watchedCurrency = watch("currency");

  const createMutation = useMutation({
    mutationFn: async (data: LCFormData) => {
      const formData = new FormData();
      
      // Add form fields - ensure required fields are present
      formData.append("number", data.number.trim());

      if (data.issuingBank) {
        formData.append("issuingBank", data.issuingBank);
      }

      const normalizedAmount =
        typeof data.amount === "number" && !Number.isNaN(data.amount)
          ? data.amount
          : null;
      if (normalizedAmount !== null) {
        formData.append("amount", normalizedAmount.toString());
      }

      if (data.currency) {
        formData.append("currency", data.currency);
      }

      if (data.issueDate) {
        formData.append("issueDate", data.issueDate);
      }

      if (data.expiryDate) {
        formData.append("expiryDate", data.expiryDate);
      }

      if (data.applicant) {
        formData.append("applicant", data.applicant);
      }

      if (data.beneficiary) {
        formData.append("beneficiary", data.beneficiary);
      }

      if (data.contractId) {
        formData.append("contractId", data.contractId);
      }

      // Add file if selected
      if (selectedFiles.length > 0) {
        formData.append("lcFile", selectedFiles[0]);
      }

      const url = lc
        ? `/api/letters-of-credit/${lc.id}/upload`
        : "/api/letters-of-credit/upload";
      const method = lc ? "PUT" : "POST";

      const response = await apiRequest(method, url, formData);
      return response.json();
    },
    onSuccess: () => {
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
    // Check if file is required - for new LCs or existing LCs without a file
    const hasExistingFile = Boolean(normalizedLc?.fileUrl || normalizedLc?.fileName);
    const isFileRequired = !lc || !hasExistingFile;
    
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
              <Label htmlFor="number">LC Number *</Label>
              <Input
                id="number"
                {...register("number")}
                placeholder="LC-2024-001"
                className={errors.number ? "border-red-500" : ""}
              />
              {errors.number && (
                <p className="text-sm text-red-500 mt-1">{errors.number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                onValueChange={(value) => setValue("currency", value)}
                defaultValue={normalizedLc?.currency || "USD"}
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
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                {...register("amount", { valueAsNumber: true })}
                placeholder="100000"
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* LC Amount Display */}
          {typeof watchedAmount === "number" && !Number.isNaN(watchedAmount) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">LC Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Amount:</span>
                  <p className="font-medium">
                    {watchedAmount.toLocaleString()} {watchedCurrency || "USD"}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">Currency:</span>
                  <p className="font-medium">{watchedCurrency || "USD"}</p>
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
              <Label htmlFor="applicant">Applicant</Label>
              <Input
                id="applicant"
                {...register("applicant")}
                placeholder="Applicant name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="beneficiary">Beneficiary</Label>
              <Input
                id="beneficiary"
                {...register("beneficiary")}
                placeholder="Beneficiary name"
              />
            </div>
            <div>
              <Label htmlFor="contractId">Related Contract</Label>
              <Select
                onValueChange={(value) => setValue("contractId", value)}
                defaultValue={normalizedLc?.contractId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => {
                    const contractId = String(contract.id);
                    const supplierName = contract.supplierName ? ` - ${contract.supplierName}` : "";
                    const title = contract.title
                      ? contract.title
                      : `Contract ${contractId.slice(0, 8)}`;

                    return (
                      <SelectItem key={contractId} value={contractId}>
                        {title}
                        {supplierName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
            description="PDF files up to 10MB each - Required for all LCs"
            existingFile={
              normalizedLc?.fileName ||
              (normalizedLc?.fileUrl ? normalizedLc.fileUrl.split("/").pop() : undefined)
            }
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
