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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { CARGO_TYPES, CURRENCIES } from "@/lib/constants";
import { normalizeLc, formatLcCurrency } from "@/lib/lc";

// Create a more flexible schema for drafts - matching backend DTO
const lcFormSchema = z.object({
  number: z.string().min(1, "LC Number is required"),
  issuingBank: z.string().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity is required" })
    .gt(0, "Quantity must be greater than zero"),
  pricePerUnit: z.coerce
    .number({ invalid_type_error: "Price per unit is required" })
    .gt(0, "Price per unit must be greater than zero"),
  currency: z.string().default("USD"),
  cargoType: z.string().optional(),
  issueDate: z.string().optional(),
  shipmentPeriod: z.string().optional(),
  expiryDate: z.string().optional(),
  beneficiary: z.string().optional(),
  status: z.string().default("draft"),
  createdBy: z.string().optional(),
});

type LCFormData = z.infer<typeof lcFormSchema>;

interface LetterOfCreditFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  lc?: any;
}

export default function LetterOfCreditForm({ onSuccess, onCancel, lc }: LetterOfCreditFormProps) {
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
          quantity: normalizedLc.quantity ?? undefined,
          pricePerUnit: normalizedLc.pricePerUnit ?? undefined,
          currency: normalizedLc.currency ?? "USD",
          cargoType: normalizedLc.cargoType ?? "",
          issueDate: normalizedLc.issueDate
            ? new Date(normalizedLc.issueDate).toISOString().split("T")[0]
            : "",
          shipmentPeriod: normalizedLc.shipmentPeriod
            ? new Date(normalizedLc.shipmentPeriod).toISOString().split("T")[0]
            : "",
          expiryDate: normalizedLc.expiryDate
            ? new Date(normalizedLc.expiryDate).toISOString().split("T")[0]
            : "",
          beneficiary: normalizedLc.beneficiary ?? "",
          status: normalizedLc.statusKey ?? "draft",
        }
      : {
          currency: "USD",
          cargoType: "",
          status: "draft",
        },
  });

  const watchedQuantity = watch("quantity");
  const watchedPricePerUnit = watch("pricePerUnit");
  const watchedCurrency = watch("currency");

  const createMutation = useMutation({
    mutationFn: async (data: LCFormData) => {
      const formData = new FormData();
      
      // Add form fields - ensure required fields are present
      formData.append("number", data.number.trim());

      if (data.issuingBank) {
        formData.append("issuingBank", data.issuingBank);
      }

      const normalizedQuantity =
        typeof data.quantity === "number" && Number.isFinite(data.quantity)
          ? data.quantity
          : null;
      if (normalizedQuantity !== null) {
        formData.append("quantity", normalizedQuantity.toString());
      }

      const normalizedPricePerUnit =
        typeof data.pricePerUnit === "number" && Number.isFinite(data.pricePerUnit)
          ? data.pricePerUnit
          : null;
      if (normalizedPricePerUnit !== null) {
        formData.append("pricePerUnit", normalizedPricePerUnit.toString());
      }

      const totalPrice =
        normalizedQuantity !== null && normalizedPricePerUnit !== null
          ? normalizedQuantity * normalizedPricePerUnit
          : null;
      if (totalPrice !== null) {
        formData.append("amount", totalPrice.toString());
      }

      if (data.currency) {
        formData.append("currency", data.currency);
      }

      if (data.cargoType) {
        formData.append("cargoType", data.cargoType);
      }

      if (data.issueDate) {
        formData.append("issueDate", data.issueDate);
      }

      if (data.shipmentPeriod) {
        formData.append("shipmentPeriod", data.shipmentPeriod);
      }

      if (data.expiryDate) {
        formData.append("expiryDate", data.expiryDate);
      }

      if (data.beneficiary) {
        formData.append("beneficiary", data.beneficiary);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="1000"
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="pricePerUnit">Price per Unit *</Label>
              <Input
                id="pricePerUnit"
                type="number"
                step="0.01"
                {...register("pricePerUnit", { valueAsNumber: true })}
                placeholder="250"
                className={errors.pricePerUnit ? "border-red-500" : ""}
              />
              {errors.pricePerUnit && (
                <p className="text-sm text-red-500 mt-1">{errors.pricePerUnit.message}</p>
              )}
            </div>
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
          </div>

          {/* LC Pricing Summary */}
          {(() => {
            const quantityValue =
              typeof watchedQuantity === "number" && Number.isFinite(watchedQuantity)
                ? watchedQuantity
                : null;
            const priceValue =
              typeof watchedPricePerUnit === "number" && Number.isFinite(watchedPricePerUnit)
                ? watchedPricePerUnit
                : null;
            const totalValue =
              quantityValue !== null && priceValue !== null ? quantityValue * priceValue : null;

            if (quantityValue === null && priceValue === null && totalValue === null) {
              return null;
            }

            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">LC Pricing Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Quantity:</span>
                    <p className="font-medium">
                      {quantityValue !== null ? quantityValue.toLocaleString() : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Price per Unit:</span>
                    <p className="font-medium">
                      {priceValue !== null
                        ? formatLcCurrency(priceValue, watchedCurrency || "USD")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Price:</span>
                    <p className="font-medium">
                      {totalValue !== null
                        ? formatLcCurrency(totalValue, watchedCurrency || "USD")
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="cargoType">Cargo Type</Label>
              <Select
                onValueChange={(value) => setValue("cargoType", value)}
                defaultValue={normalizedLc?.cargoType || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cargo type" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_TYPES.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value}>
                      {cargo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="beneficiary">Beneficiary</Label>
              <Input
                id="beneficiary"
                {...register("beneficiary")}
                placeholder="Beneficiary name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <Label htmlFor="shipmentPeriod">Shipment Period Date</Label>
              <Input
                id="shipmentPeriod"
                type="date"
                {...register("shipmentPeriod")}
                className={errors.shipmentPeriod ? "border-red-500" : ""}
              />
              {errors.shipmentPeriod && (
                <p className="text-sm text-red-500 mt-1">{errors.shipmentPeriod.message}</p>
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
