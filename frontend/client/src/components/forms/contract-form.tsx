import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  CARGO_TYPES,
  CONTRACT_PAYMENT_METHODS,
  CONTRACT_SHIPPING_METHODS,
  CURRENCIES,
  COUNTRIES,
  UNITS_OF_MEASURE,
} from "@/lib/constants";

const CONTRACT_NARRATIVE_LIMIT = 20000;
const REVIEW_NOTES_LIMIT = 20000;
const LETTER_OF_GUARANTEE_LIMIT = 4000;

const formatRequestPreview = (description?: string) => {
  if (!description) return "No description";
  return description.length > 60 ? `${description.slice(0, 60)}…` : description;
};

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const match = error.message.match(/^(\d{3}):\s*([\s\S]*)$/);
    if (match) {
      const [, statusCode, rawBody] = match;
      if (statusCode) {
        const body = rawBody.trim();
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === "object" && "message" in parsed) {
            const message = (parsed as { message?: unknown }).message;
            if (typeof message === "string") {
              return message;
            }
          }
        } catch {
          // fall through to return the body as-is
        }
        if (body) {
          return body.replace(/^"|"$/g, "");
        }
      }
    }

    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return undefined;
}

// Create a more flexible schema for drafts - consistent with backend DTO
const contractFormSchema = z.object({
  description: z
    .string()
    .max(
      CONTRACT_NARRATIVE_LIMIT,
      `Description must be at most ${CONTRACT_NARRATIVE_LIMIT} characters`,
    )
    .optional(),
  requestId: z.string().optional(), // Made optional since it's not always required
  supplierName: z.string().min(1, "Supplier name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").optional().or(z.literal("")),
  unitOfMeasure: z.string().optional(),
  cargoType: z.string().min(1, "Cargo type is required"),
  countryOfOrigin: z.string().optional(),
  pricePerTon: z.coerce.number().positive("Price per ton must be positive").optional(),
  paymentCurrency: z.string().optional(),
  paymentMethod: z.string().optional(),
  shippingMethod: z.string().optional(),
  wheatPercentage: z
    .coerce
    .number({ invalid_type_error: "Wheat percentage must be between 0 and 100" })
    .min(0, "Wheat percentage must be between 0 and 100")
    .max(100, "Wheat percentage must be between 0 and 100")
    .optional()
    .or(z.literal("")),
  contractTerms: z
    .string()
    .max(
      CONTRACT_NARRATIVE_LIMIT,
      `Contract terms must be at most ${CONTRACT_NARRATIVE_LIMIT} characters`,
    )
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  letterOfGuarantee: z
    .string()
    .max(
      LETTER_OF_GUARANTEE_LIMIT,
      `Letter of guarantee must be at most ${LETTER_OF_GUARANTEE_LIMIT} characters`,
    )
    .optional(),
  reviewNotes: z
    .string()
    .max(
      REVIEW_NOTES_LIMIT,
      `Review notes must be at most ${REVIEW_NOTES_LIMIT} characters`,
    )
    .optional(),
  createdBy: z.string().optional(),
})
.refine(
  (data) => {
    // File upload is mandatory - check if files are selected
    return true; // We'll validate this in the component
  },
  {
    message: "Contract document is required",
    path: ["fileName"]
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

  const longNarrativeHelper = useMemo(
    () => `Maximum ${CONTRACT_NARRATIVE_LIMIT.toLocaleString()} characters`,
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: contract
      ? {
          ...contract,
          requestId: contract.requestId ? contract.requestId.toString() : contract.requestId,
          quantity: contract.quantity ? parseInt(contract.quantity) : 0,
          wheatPercentage:
            contract?.wheatPercentage !== undefined &&
            contract?.wheatPercentage !== null &&
            contract.wheatPercentage !== ""
              ? Number.parseFloat(contract.wheatPercentage)
              : undefined,
          startDate: contract.startDate
            ? new Date(contract.startDate).toISOString().split("T")[0]
            : "",
          endDate: contract.endDate
            ? new Date(contract.endDate).toISOString().split("T")[0]
            : "",
        }
      : {}
  });

  const existingFileName = contract?.fileName ?? contract?.uploadedFile ?? undefined;
  const hasExistingFile = Boolean(contract?.fileUrl || existingFileName);

  const cargoTypeValue = watch("cargoType");
  const requestIdValue = watch("requestId");
  const unitOfMeasureValue = watch("unitOfMeasure");
  const countryOfOriginValue = watch("countryOfOrigin");
  const paymentCurrencyValue = watch("paymentCurrency");
  const paymentMethodValue = watch("paymentMethod");
  const shippingMethodValue = watch("shippingMethod");
  const isWheat = (cargoTypeValue ?? "").toLowerCase() === "wheat";

  const selectedRequest = useMemo(() => {
    if (!requestIdValue || requestIdValue === "none") {
      return undefined;
    }

    return requests.find((req) => {
      const id = req?.id ?? req?.requestId;
      return id !== undefined && id !== null && id.toString() === requestIdValue;
    });
  }, [requestIdValue, requests]);

  const normalizeNumber = useCallback((value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, []);

  const normalizeDate = useCallback((value: unknown) => {
    if (!value) {
      return "";
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? "" : value.toISOString().split("T")[0];
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return "";
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }

      return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
    }

    return "";
  }, []);

  const copyRequestDataToForm = useCallback(
    (requestData: any) => {
      if (!requestData) {
        return;
      }

      const normalizedFields: Partial<ContractFormData> = {
        description: requestData.description ?? requestData.summary ?? "",
        supplierName: requestData.supplierName ?? "",
        cargoType: requestData.cargoType ?? undefined,
        quantity: normalizeNumber(requestData.quantity),
        unitOfMeasure: requestData.unitOfMeasure ?? undefined,
        countryOfOrigin: requestData.countryOfOrigin ?? undefined,
        pricePerTon:
          normalizeNumber(
            requestData.pricePerTon ?? requestData.unitPrice ?? requestData.estimatedUnitPrice ?? requestData.unit_cost,
          ),
        paymentCurrency: requestData.paymentCurrency ?? requestData.currency ?? undefined,
        paymentMethod: requestData.paymentMethod ?? undefined,
        shippingMethod: requestData.shippingMethod ?? undefined,
        wheatPercentage: normalizeNumber(requestData.wheatPercentage),
        letterOfGuarantee: requestData.letterOfGuarantee ?? "",
        startDate: normalizeDate(requestData.startDate),
        endDate: normalizeDate(requestData.endDate),
      };

      (Object.entries(normalizedFields) as [keyof ContractFormData, ContractFormData[keyof ContractFormData]][]).forEach(
        ([field, value]) => {
          setValue(field, value as never, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        },
      );
    },
    [normalizeDate, normalizeNumber, setValue],
  );

  const isInitialRequestSync = useRef(true);

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }

    const isInitial = isInitialRequestSync.current;
    if (isInitial) {
      isInitialRequestSync.current = false;

      if (contract?.requestId && contract.requestId.toString() === requestIdValue) {
        return;
      }
    }

    copyRequestDataToForm(selectedRequest);
  }, [contract?.requestId, copyRequestDataToForm, requestIdValue, selectedRequest]);

  const handleManualCopyFromRequest = useCallback(() => {
    if (!selectedRequest) {
      return;
    }

    isInitialRequestSync.current = false;
    copyRequestDataToForm(selectedRequest);
  }, [copyRequestDataToForm, selectedRequest]);

  useEffect(() => {
    if (!isWheat) {
      setValue("wheatPercentage", undefined, { shouldValidate: true });
    }
  }, [isWheat, setValue]);

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const formData = new FormData();

      const matchedRequest = data.requestId
        ? requests.find((req) => req.id?.toString() === data.requestId)
        : undefined;

      const resolvedTitle =
        contract?.title ??
        (matchedRequest?.publicId
          ? `Contract for ${matchedRequest.publicId}`
          : data.supplierName
            ? `${data.supplierName} Contract`
            : data.cargoType
              ? `${data.cargoType.charAt(0).toUpperCase()}${data.cargoType.slice(1)} Contract`
              : "Contract");

      formData.append("title", resolvedTitle);

      // Add form fields - ensure required fields are present
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'number' && Number.isNaN(value)) {
            return;
          }
          // Handle special cases for GUID fields
          if (key === 'requestId' && (value === '' || value === '0' || value === 'none')) {
            // Skip empty requestId
            return;
          }
          formData.append(key, value.toString());
        }
      });

      // Add file if selected
      if (selectedFiles.length > 0) {
        formData.append('contractFile', selectedFiles[0]);
      }

      const url = contract
        ? `/api/contracts/${contract.id}/upload`
        : "/api/contracts";
      const method = contract ? "PUT" : "POST";
      
        const response = await apiRequest(method, url, formData);

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
      const friendlyMessage = extractErrorMessage(error);
      toast({
        title: "Error",
        description:
          friendlyMessage ??
          (contract ? "Failed to update contract" : "Failed to create contract"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contract?.id) throw new Error("Contract ID is required");
      
        const response = await apiRequest("DELETE", `/api/contracts/${contract.id}`);
      
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
    if (selectedFiles.length === 0 && !hasExistingFile) {
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Details</h3>
              <p className="text-sm text-muted-foreground">
                Link this contract to a request and capture supplier information.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="requestId">Related Request</Label>
                {selectedRequest && (
                  <Button type="button" variant="secondary" size="sm" onClick={handleManualCopyFromRequest}>
                    Copy data from request
                  </Button>
                )}
              </div>
              <Select
                onValueChange={(value) =>
                  setValue("requestId", value, { shouldDirty: true, shouldTouch: true })
                }
                value={requestIdValue ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a request (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No related request</SelectItem>
                  {requests.map((request) => (
                    <SelectItem key={request.id} value={request.id.toString()}>
                      {(request.publicId ?? `REQ-${request.id.toString().padStart(3, '0')}`)} - {formatRequestPreview(request.description)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="countryOfOrigin">Country of Origin</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("countryOfOrigin", value, { shouldDirty: true, shouldTouch: true })
                  }
                  value={countryOfOriginValue ?? undefined}
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
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Commodity Details</h3>
              <p className="text-sm text-muted-foreground">Describe the goods covered by this contract.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="cargoType">Cargo Type *</Label>
                <Select
                  onValueChange={(value) => setValue("cargoType", value, { shouldDirty: true, shouldTouch: true })}
                  value={cargoTypeValue ?? undefined}
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
            {isWheat && (
              <div>
                <Label htmlFor="wheatPercentage">Wheat Percentage</Label>
                <Input
                  id="wheatPercentage"
                  type="number"
                  step="0.01"
                  {...register("wheatPercentage", { valueAsNumber: true })}
                  placeholder="e.g. 12.5"
                  className={errors.wheatPercentage ? "border-red-500" : ""}
                />
                {errors.wheatPercentage && (
                  <p className="text-sm text-red-500 mt-1">{errors.wheatPercentage.message}</p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
              <Select
                onValueChange={(value) =>
                  setValue("unitOfMeasure", value, { shouldDirty: true, shouldTouch: true })
                }
                value={unitOfMeasureValue ?? undefined}
              >
                <SelectTrigger className={errors.unitOfMeasure ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select unit of measure" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OF_MEASURE.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unitOfMeasure && (
                <p className="text-sm text-red-500 mt-1">{errors.unitOfMeasure.message}</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
              <p className="text-sm text-muted-foreground">Capture agreed commercial values.</p>
            </div>
            <div>
              <Label htmlFor="pricePerTon">Price per Ton (USD)</Label>
              <Input
                id="pricePerTon"
                type="number"
                step="0.01"
                {...register("pricePerTon", { valueAsNumber: true })}
                placeholder="e.g. 500.00"
                className={errors.pricePerTon ? "border-red-500" : ""}
              />
              {errors.pricePerTon && (
                <p className="text-sm text-red-500 mt-1">{errors.pricePerTon.message}</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Payment</h3>
              <p className="text-sm text-muted-foreground">Outline currency and settlement method.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="paymentCurrency">Payment Currency</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("paymentCurrency", value, { shouldDirty: true, shouldTouch: true })
                  }
                  value={paymentCurrencyValue ?? undefined}
                >
                  <SelectTrigger className={errors.paymentCurrency ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select payment currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentCurrency && (
                  <p className="text-sm text-red-500 mt-1">{errors.paymentCurrency.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("paymentMethod", value, { shouldDirty: true, shouldTouch: true })
                  }
                  value={paymentMethodValue ?? undefined}
                >
                  <SelectTrigger className={errors.paymentMethod ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && (
                  <p className="text-sm text-red-500 mt-1">{errors.paymentMethod.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Logistics</h3>
              <p className="text-sm text-muted-foreground">Detail how and when the commodity will move.</p>
            </div>
            <div>
              <Label htmlFor="shippingMethod">Shipping Method</Label>
              <Select
                onValueChange={(value) =>
                  setValue("shippingMethod", value, { shouldDirty: true, shouldTouch: true })
                }
                value={shippingMethodValue ?? undefined}
              >
                <SelectTrigger className={errors.shippingMethod ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select shipping method" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_SHIPPING_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.shippingMethod && (
                <p className="text-sm text-red-500 mt-1">{errors.shippingMethod.message}</p>
              )}
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
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Compliance & Review</h3>
              <p className="text-sm text-muted-foreground">Capture governance requirements and internal notes.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="contractTerms">Contract Terms & Conditions</Label>
                <Textarea
                  id="contractTerms"
                  {...register("contractTerms")}
                  rows={4}
                  placeholder="Key terms, payment conditions, delivery terms, etc."
                  maxLength={CONTRACT_NARRATIVE_LIMIT}
                />
                <p className="text-xs text-muted-foreground mt-1">{longNarrativeHelper}</p>
                {errors.contractTerms && (
                  <p className="text-sm text-red-500 mt-1">{errors.contractTerms.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="letterOfGuarantee">Letter of Guarantee</Label>
                <Textarea
                  id="letterOfGuarantee"
                  {...register("letterOfGuarantee")}
                  rows={3}
                  placeholder="Enter letter of guarantee details or requirements"
                  maxLength={LETTER_OF_GUARANTEE_LIMIT}
                  className={errors.letterOfGuarantee ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum {LETTER_OF_GUARANTEE_LIMIT.toLocaleString()} characters
                </p>
                {errors.letterOfGuarantee && (
                  <p className="text-sm text-red-500 mt-1">{errors.letterOfGuarantee.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  {...register("reviewNotes")}
                  rows={3}
                  placeholder="Administrative notes and comments"
                  maxLength={REVIEW_NOTES_LIMIT}
                />
                <p className="text-xs text-muted-foreground mt-1">{longNarrativeHelper}</p>
                {errors.reviewNotes && (
                  <p className="text-sm text-red-500 mt-1">{errors.reviewNotes.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Supporting Documents & Notes</h3>
              <p className="text-sm text-muted-foreground">Upload required files and share any additional context.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Contract Document *</Label>
                <FileUpload
                  accept=".pdf,.doc,.docx"
                  onFileSelect={setSelectedFiles}
                  existingFile={existingFileName}
                  description="PDF, DOC, DOCX up to 10MB (Required)"
                />
                {selectedFiles.length === 0 && !hasExistingFile && (
                  <p className="text-sm text-red-500 mt-1">Contract document is required</p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Additional Notes</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  rows={4}
                  placeholder="Add any extra context, requirements, or considerations"
                  maxLength={CONTRACT_NARRATIVE_LIMIT}
                  className={errors.description ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">{longNarrativeHelper}</p>
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          </section>

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
