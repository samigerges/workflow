import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertRequestSchema } from "@/lib/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  UNITS_OF_MEASURE,
  CARGO_TYPES,
  COUNTRIES,
  CURRENCIES,
  CONTRACT_PAYMENT_METHODS
} from "@/lib/constants";
import { Upload, FileText } from "lucide-react";

const SHIPPING_METHODS = [
  { value: "fob", label: "FOB" },
  { value: "cif", label: "CIF" },
  { value: "c&f", label: "C&F" },
];

// Use the backend request schema so all fields persist on submit
const requestFormSchema = insertRequestSchema;

// Only log schema in development
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("insertRequestSchema:", insertRequestSchema);
}

type RequestFormData = z.infer<typeof insertRequestSchema>;

interface StatementOfNeedsFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  request?: any; // For editing existing requests
}

export default function StatementOfNeedsForm({ onSuccess, onCancel, request }: StatementOfNeedsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
    control
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: request ? {
      // safely parse numeric fields
      ...request,
      startDate: request?.startDate ? new Date(request.startDate).toISOString().split("T")[0] : undefined,
      endDate: request?.endDate ? new Date(request.endDate).toISOString().split("T")[0] : undefined,
      pricePerTon: request?.pricePerTon ? Number(request.pricePerTon) :
                    request?.estimatedValue ? Number(request.estimatedValue) : undefined,
      quantity: request?.quantity ? Number(request.quantity) : undefined,
      priority: request?.priority ?? "medium",
      status: request?.status ?? "pending",
      uploadedFile: request?.uploadedFile ?? "",
      paymentMethod: request?.paymentMethod ?? undefined,
      paymentCurrency: request?.paymentCurrency ?? request?.currency ?? undefined,
      shippingMethod: request?.shippingMethod ?? undefined,
      letterOfGuarantee: request?.letterOfGuarantee ?? "",
      wheatPercentage: request?.wheatPercentage ?? undefined,
    } : {
      priority: "medium",
      status: "pending",
      uploadedFile: "",
      letterOfGuarantee: "",
      paymentCurrency: undefined,
      wheatPercentage: undefined
    }
  });

  const cargoTypeValue = watch("cargoType");
  const isWheat = (cargoTypeValue ?? "").toLowerCase() === "wheat";

  useEffect(() => {
    if (!isWheat) {
      setValue("wheatPercentage", undefined, { shouldValidate: true });
    }
  }, [isWheat, setValue]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      // payload may include internal flag _saveAsDraft
      const saveAsDraft = Boolean(payload?._saveAsDraft);
      if (payload?._saveAsDraft) {
        delete payload._saveAsDraft;
      }

      // Validate that file is selected for new requests (only when not saving as draft)
      if (!saveAsDraft && !selectedFile && !request?.uploadedFile) {
        setFileError("Import request document is required");
        throw new Error("Import request document is required");
      }
      setFileError("");

      // Build submit data
      const submitData: any = {
        ...payload,
        startDate: payload.startDate
          ? new Date(payload.startDate).toISOString()
          : null,
        endDate: payload.endDate
          ? new Date(payload.endDate).toISOString()
          : null,
        status: saveAsDraft ? "draft" : request ? request.status : "pending",
        pricePerTon: payload.pricePerTon,
        quantity:
          typeof payload.quantity === "string"
            ? parseInt(payload.quantity, 10)
            : payload.quantity,
        uploadedFile: request?.uploadedFile || "",
      };

      // Clean undefined fields (optional)
      Object.keys(submitData).forEach((k) => {
        if (submitData[k] === undefined) delete submitData[k];
      });

      const url = request ? `/api/requests/${request.id}` : "/api/requests";
      const method = request ? "PUT" : "POST";

      // Primary create/update
      const requestResult = await apiRequest(method, url, submitData);
      const requestData = await requestResult.json();
      const requestId = request?.id ?? requestData?.id;

      // If there's a file selected, upload it and update the request's uploadedFile field
      if (selectedFile && requestId) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("entityType", "request");
        formData.append("entityId", String(requestId));
        const documentTitle =
          typeof payload?.description === "string" && payload.description.trim()
            ? payload.description.trim().slice(0, 200)
            : selectedFile.name;
        formData.append("title", documentTitle);

        const uploadResponse = await apiRequest("POST", "/api/documents/upload", formData);
        const uploadResult = await uploadResponse.json();

        const fileName = uploadResult?.fileName || selectedFile.name;

        if (fileName) {
          await apiRequest("PUT", `/api/requests/${requestId}`, { uploadedFile: fileName });
        }
      }

      return requestData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: request
          ? "Request updated successfully"
          : "Request submitted successfully",
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
        description: request ? "Failed to update request" : "Failed to create request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    // send data directly to mutation
    createMutation.mutate(data as any);
  };

  const handleSaveAsDraft = () => {
    // get synchronous values from the form and add internal flag
    const values = getValues();
    createMutation.mutate({ ...values, _saveAsDraft: true } as any);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Invalid file type. Please upload a PDF, DOC, or DOCX file");
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOC, or DOCX file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File too large (max 10MB)");
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setFileError("");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" onInvalid={() => {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log("Form validation failed");
          }
        }}>
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="cargoType">Cargo Type *</Label>
                <Controller
                  control={control}
                  name="cargoType"
                  defaultValue={request?.cargoType ?? undefined}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.cargoType ? "border-red-500" : ""}>
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
                  )}
                />
                {errors.cargoType && (
                  <p className="text-sm text-red-500 mt-1">{errors.cargoType.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                  placeholder="e.g. 500"
                  className={errors.quantity ? "border-red-500" : ""}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
                <Controller
                  control={control}
                  name="unitOfMeasure"
                  defaultValue={request?.unitOfMeasure ?? undefined}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.unitOfMeasure ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.unitOfMeasure && (
                  <p className="text-sm text-red-500 mt-1">{errors.unitOfMeasure.message}</p>
                )}
              </div>
              {isWheat && (
                <div>
                  <Label htmlFor="wheatPercentage">Wheat Percentage *</Label>
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
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  {...register("supplierName")}
                  placeholder="Name of the supplier"
                  className={errors.supplierName ? "border-red-500" : ""}
                />
                {errors.supplierName && (
                  <p className="text-sm text-red-500 mt-1">{errors.supplierName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="countryOfOrigin">Country of Origin *</Label>
                <Controller
                  control={control}
                  name="countryOfOrigin"
                  defaultValue={request?.countryOfOrigin ?? undefined}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.countryOfOrigin ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select country of origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.countryOfOrigin && (
                  <p className="text-sm text-red-500 mt-1">{errors.countryOfOrigin.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pricePerTon">Price per unit *</Label>
                <Input
                  id="pricePerTon"
                  type="number"
                  step="0.01"
                  {...register("pricePerTon", { valueAsNumber: true })}
                  placeholder="e.g. 500"
                  className={errors.pricePerTon ? "border-red-500" : ""}
                />
                {errors.pricePerTon && (
                  <p className="text-sm text-red-500 mt-1">{errors.pricePerTon.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="paymentCurrency">Payment Currency *</Label>
                <Controller
                  control={control}
                  name="paymentCurrency"
                  defaultValue={request?.paymentCurrency ?? request?.currency ?? undefined}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
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
                  )}
                />
                {errors.paymentCurrency && (
                  <p className="text-sm text-red-500 mt-1">{errors.paymentCurrency.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Controller
                  control={control}
                  name="paymentMethod"
                  defaultValue={request?.paymentMethod ?? undefined}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.paymentMethod ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_PAYMENT_METHODS.map((pm) => (
                          <SelectItem key={pm.value} value={pm.value}>
                            {pm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.paymentMethod && (
                  <p className="text-sm text-red-500 mt-1">{errors.paymentMethod.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                  placeholder="Select start date"
                  className={errors.startDate ? "border-red-500" : ""}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate")}
                  placeholder="Select end date"
                  className={errors.endDate ? "border-red-500" : ""}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="shippingMethod">Shipping Method *</Label>
                <Controller
                  control={control}
                  name="shippingMethod"
                  defaultValue={request?.shippingMethod ?? undefined}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.shippingMethod ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select shipping method" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPPING_METHODS.map((sm) => (
                          <SelectItem key={sm.value} value={sm.value}>
                            {sm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.shippingMethod && (
                  <p className="text-sm text-red-500 mt-1">{errors.shippingMethod.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="letterOfGuarantee">Letter of Guarantee *</Label>
                <Textarea
                  id="letterOfGuarantee"
                  {...register("letterOfGuarantee")}
                  rows={3}
                  placeholder="Provide the letter of guarantee requirements"
                  className={errors.letterOfGuarantee ? "border-red-500" : ""}
                />
                {errors.letterOfGuarantee && (
                  <p className="text-sm text-red-500 mt-1">{errors.letterOfGuarantee.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <Label htmlFor="documentUpload">Contract Request Document *</Label>
                  <Input
                    id="documentUpload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className={`cursor-pointer ${fileError ? "border-red-500" : ""}`}
                  />
                  {fileError && (
                    <p className="text-sm text-red-500 mt-1">{fileError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, or DOCX files up to 10MB.
                  </p>
                </div>
                {(selectedFile || request?.uploadedFile) && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <FileText size={16} />
                    <span className="text-sm">{selectedFile?.name || request?.uploadedFile}</span>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Upload size={14} />
                  <span>Document will be uploaded with the request for approval.</span>
                </div>
              )}

              {request?.uploadedFile && !selectedFile && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Current Document</p>
                      <p className="text-sm text-blue-700">{request.uploadedFile}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Upload a new file above to replace this document.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <div>
              <Label htmlFor="description">Additional Notes *</Label>
              <Textarea
                id="description"
                {...register("description")}
                rows={4}
                placeholder="Add context, requirements, or special handling details"
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>
          </section>

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveAsDraft}
              disabled={createMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              className="bg-primary-500 hover:bg-primary-600 text-black border-2 border-primary-700 hover:border-primary-800"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
