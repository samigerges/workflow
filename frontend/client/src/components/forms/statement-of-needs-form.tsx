import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { insertNeedSchema } from "@/lib/schemas";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { NEED_CATEGORIES, NEED_STATUSES, UNITS_OF_MEASURE } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

type StatementOfNeedFormData = z.infer<typeof insertNeedSchema>;

interface StatementOfNeedsFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  need?: StatementOfNeedFormData & { id: string };
}

function toDateInputValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split("T")[0];
}

export default function StatementOfNeedsForm({ onSuccess, onCancel, need }: StatementOfNeedsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StatementOfNeedFormData>({
    resolver: zodResolver(insertNeedSchema),
    defaultValues: need
      ? {
          title: need.title,
          description: need.description ?? "",
          category: need.category,
          requiredQuantity: need.requiredQuantity,
          unitOfMeasure: need.unitOfMeasure,
          fulfillmentStartDate: toDateInputValue(need.fulfillmentStartDate) ?? "",
          fulfillmentEndDate: toDateInputValue(need.fulfillmentEndDate) ?? "",
          departmentCode: need.departmentCode ?? "",
          notes: need.notes ?? "",
          status: need.status ?? "draft",
          maxPricePerUnit: need.maxPricePerUnit ?? undefined,
        }
      : {
          title: "",
          description: "",
          category: NEED_CATEGORIES[0]?.value ?? "other",
          requiredQuantity: 0,
          unitOfMeasure: UNITS_OF_MEASURE[0],
          fulfillmentStartDate: "",
          fulfillmentEndDate: "",
          departmentCode: "",
          notes: "",
          status: "draft",
          maxPricePerUnit: undefined,
        },
  });

  const startDate = watch("fulfillmentStartDate");

  const mutation = useMutation({
    mutationFn: async (payload: StatementOfNeedFormData) => {
      const submitData = {
        ...payload,
        fulfillmentStartDate: payload.fulfillmentStartDate
          ? new Date(payload.fulfillmentStartDate).toISOString()
          : null,
        fulfillmentEndDate: payload.fulfillmentEndDate
          ? new Date(payload.fulfillmentEndDate).toISOString()
          : null,
        departmentCode: payload.departmentCode?.trim() || null,
        description: payload.description?.trim() || null,
        notes: payload.notes?.trim() || null,
      };

      if (need?.id) {
        const response = await apiRequest("PUT", `/api/needs/${need.id}`, submitData);
        return response.json();
      }

      const response = await apiRequest("POST", "/api/needs", submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/needs"] });
      toast({
        title: "Success",
        description: need ? "Need updated successfully" : "Need recorded successfully",
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

      const message = error instanceof Error ? error.message : "Failed to save need";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StatementOfNeedFormData) => {
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="title">Need title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of the need"
                  {...register("title")}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(value) => setValue("category", value as StatementOfNeedFormData["category"])}
                >
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEED_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>}
              </div>

              <div>
                <Label htmlFor="requiredQuantity">Required quantity *</Label>
                <Input
                  id="requiredQuantity"
                  type="number"
                  step="1"
                  {...register("requiredQuantity", { valueAsNumber: true })}
                  className={errors.requiredQuantity ? "border-red-500" : ""}
                />
                {errors.requiredQuantity && (
                  <p className="text-sm text-red-500 mt-1">{errors.requiredQuantity.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="unitOfMeasure">Unit of measure *</Label>
                <Select
                  value={watch("unitOfMeasure")}
                  onValueChange={(value) => setValue("unitOfMeasure", value)}
                >
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
                {errors.unitOfMeasure && (
                  <p className="text-sm text-red-500 mt-1">{errors.unitOfMeasure.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="fulfillmentStartDate">Fulfillment start *</Label>
                <Input
                  id="fulfillmentStartDate"
                  type="date"
                  {...register("fulfillmentStartDate")}
                  className={errors.fulfillmentStartDate ? "border-red-500" : ""}
                />
                {errors.fulfillmentStartDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.fulfillmentStartDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="fulfillmentEndDate">Fulfillment end *</Label>
                <Input
                  id="fulfillmentEndDate"
                  type="date"
                  {...register("fulfillmentEndDate")}
                  min={startDate || undefined}
                  className={errors.fulfillmentEndDate ? "border-red-500" : ""}
                />
                {errors.fulfillmentEndDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.fulfillmentEndDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="departmentCode">Department code</Label>
                <Input id="departmentCode" placeholder="e.g. SUPPLY" {...register("departmentCode")}
                  className={errors.departmentCode ? "border-red-500" : ""}
                />
                {errors.departmentCode && (
                  <p className="text-sm text-red-500 mt-1">{errors.departmentCode.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="maxPricePerUnit">Maximum price per unit</Label>
                <Input
                  id="maxPricePerUnit"
                  type="number"
                  step="0.01"
                  {...register("maxPricePerUnit", { valueAsNumber: true })}
                  className={errors.maxPricePerUnit ? "border-red-500" : ""}
                />
                {errors.maxPricePerUnit && (
                  <p className="text-sm text-red-500 mt-1">{errors.maxPricePerUnit.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) => setValue("status", value as StatementOfNeedFormData["status"])}
                >
                  <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEED_STATUSES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <Label htmlFor="description">Detailed description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Provide context, quality expectations, or logistical considerations"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Internal notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Operational notes or approvals"
                {...register("notes")}
              />
              {errors.notes && <p className="text-sm text-red-500 mt-1">{errors.notes.message}</p>}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {need ? "Update need" : "Record need"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
