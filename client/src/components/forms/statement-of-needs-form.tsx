import { useState } from "react";
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
import { UNITS_OF_MEASURE, CARGO_TYPES, COUNTRIES } from "@/lib/constants";
import { Upload, FileText } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "lc", label: "Letter of Credit (LC)" },
  { value: "At sight", label: "At sight" }
]
 

const SHIPPING_METHODS = [
  { value: "fob", label: "FOB" },
  { value: "cif", label: "CIF" },
  { value: "c&f", label: "C&F" },
];

const requestFormSchema = insertRequestSchema
  .extend({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    pricePerTon: z.number().positive("Price per ton must be positive"),
    quantity: z.number().int().positive("Quantity must be a positive integer"),
    supplierName: z.string().min(1, "Supplier name is required"),
    title: z.string().min(1, "Title is required"),
    countryOfOrigin: z.string().optional(),
    paymentMethod: z.string().optional(),
    shippingMethod: z.string().optional(),
  })
  .omit({ createdBy: true, uploadedFile: true });

// Only log schema in development
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("insertRequestSchema:", insertRequestSchema);
}

type RequestFormData = z.infer<typeof requestFormSchema>;

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
    formState: { errors },
    setValue,
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
      title: request?.title ?? "",
      priority: request?.priority ?? "medium",
      status: request?.status ?? "pending",
      uploadedFile: request?.uploadedFile ?? "",
      paymentMethod: request?.paymentMethod ?? undefined,
      shippingMethod: request?.shippingMethod ?? undefined,
    } : {
      priority: "medium",
      status: "pending",
      uploadedFile: "",
      title: ""
    }
  });

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
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
        status: saveAsDraft ? "draft" : (request ? request.status : "pending"),
        pricePerTon: payload.pricePerTon !== undefined ? String(payload.pricePerTon) : undefined,
        quantity: typeof payload.quantity === "string" ? parseInt(payload.quantity, 10) : payload.quantity,
        uploadedFile: request?.uploadedFile || ""
      };

      // Clean undefined fields (optional)
      Object.keys(submitData).forEach((k) => {
        if (submitData[k] === undefined) delete submitData[k];
      });

      const url = request ? `/api/requests/${request.id}` : "/api/requests";
      const method = request ? "PUT" : "POST";

      // Primary create/update
      const requestResult = await apiRequest(method, url, submitData);

      // If there's a file selected, upload it and update the request's uploadedFile field
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("entityType", "request");
        // prefer the id returned by the create call, fallback to existing request id
        formData.append("entityId", String((requestResult as any)?.id ?? request?.id ?? ""));

        // assume apiRequest returns parsed JSON (adjust if your apiRequest returns Response)
        const uploadResult = await apiRequest("POST", "/api/upload-document", formData);

        // uploadResult may contain fileName; fallback to selectedFile.name
        const fileName = uploadResult?.fileName || selectedFile.name;

        if (fileName) {
          await apiRequest("PUT", url, { uploadedFile: fileName });
        }
      }

      return requestResult;
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
          window.location.href = "/api/login";
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" onInvalid={() => {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log("Form validation failed");
          }
        }}>
          <div>
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Brief title for this import request"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <Label htmlFor="priority">Priority Level *</Label>
              <Controller
                control={control}
                name="priority"
                defaultValue={(request && request.priority) || "medium"}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.priority ? "border-red-500" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priority && (
                <p className="text-sm text-red-500 mt-1">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={4}
              placeholder="Detailed description of goods, specifications, and requirements"
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

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
              <Label htmlFor="pricePerTon">Price per unit (USD) *</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

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
              <Label htmlFor="countryOfOrigin">Country of Origin</Label>
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
          </div>

          {/* New row: Payment Method + Shipping Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
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
                      {PAYMENT_METHODS.map((pm) => (
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

            <div>
              <Label htmlFor="shippingMethod">Shipping Method</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
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
              <Label htmlFor="endDate">End Date</Label>
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
            <div class="mt-4">
            <label for="currency" class="block text-sm font-medium text-gray-700 mb-1">
              Payment Currency
            </label>
            <select id="currency" name="currency" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="USD">USD - US Dollar</option>
              <option value="EGP">EGP - Egyptian Pound</option>
              <option value="AED">AED - Emirati Dirham</option>
            </select>
          </div>
            
          </div>

          {/* Document Upload Section */}
          <div className="border-t pt-6">
            <Label htmlFor="documentUpload" className="text-base font-semibold">Contract Request Document *</Label>
            <p className="text-sm text-secondary-600 mb-4">
              Upload the contract request document (PDF, DOC, DOCX - Max 10MB)
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
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
                </div>
                {(selectedFile || request?.uploadedFile) && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <FileText size={16} />
                    <span className="text-sm">{selectedFile?.name || request?.uploadedFile}</span>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="flex items-center space-x-2 text-sm text-secondary-600">
                  <Upload size={14} />
                  <span>Document will be uploaded with request and sent for approval</span>
                </div>
              )}

              {/* Show existing uploaded document for editing */}
              {request?.uploadedFile && !selectedFile && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Current Document</p>
                      <p className="text-sm text-blue-700">{request.uploadedFile}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Upload a new file above to replace this document
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
              onClick={handleSaveAsDraft}
              disabled={createMutation.isLoading}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              className="bg-primary-500 hover:bg-primary-600 text-black border-2 border-primary-700 hover:border-primary-800"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
