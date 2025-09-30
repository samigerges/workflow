import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CURRENCIES } from "@/lib/constants";
import type { ServiceProvider } from "@/types/service-provider";

const createPriceSchema = (t: TFunction) =>
  z
    .object({
      price: z
        .coerce
        .number({ invalid_type_error: t("serviceProviders.priceForm.validation.price") })
        .positive(t("serviceProviders.priceForm.validation.pricePositive")),
      currency: z
        .string({ required_error: t("serviceProviders.priceForm.validation.currency") })
        .min(1, t("serviceProviders.priceForm.validation.currency")),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine(
      (data) => {
        if (!data.validFrom || !data.validUntil) {
          return true;
        }

        const start = new Date(data.validFrom);
        const end = new Date(data.validUntil);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return true;
        }

        return start.getTime() <= end.getTime();
      },
      {
        message: t("serviceProviders.priceForm.validation.dateRange"),
        path: ["validUntil"],
      },
    );

type ServiceProviderPriceFormValues = z.infer<ReturnType<typeof createPriceSchema>>;

interface ServiceProviderPriceFormProps {
  provider: ServiceProvider;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function normalizeString(value?: string | null) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function ServiceProviderPriceForm({ provider, onSuccess, onCancel }: ServiceProviderPriceFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formSchema = useMemo(() => createPriceSchema(t), [t]);

  const form = useForm<ServiceProviderPriceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: "" as unknown as number,
      currency: provider.currency ?? provider.latestQuote?.currency ?? "",
      validFrom: "",
      validUntil: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceProviderPriceFormValues) => {
      const payload = {
        price: values.price,
        currency: values.currency,
        validFrom: normalizeString(values.validFrom),
        validUntil: normalizeString(values.validUntil),
        notes: normalizeString(values.notes),
      };

      await apiRequest("POST", `/api/service-providers/${provider.id}/prices`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-providers"] });
      toast({
        title: t("common.success"),
        description: t("serviceProviders.priceForm.createSuccess"),
      });
      onSuccess?.();
      form.reset({
        price: "" as unknown as number,
        currency: provider.currency ?? provider.latestQuote?.currency ?? "",
        validFrom: "",
        validUntil: "",
        notes: "",
      });
    },
    onError: (error: unknown) => {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: t("auth.sessionExpiredTitle"),
          description: t("auth.sessionExpiredDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      const description = error instanceof Error ? error.message : t("serviceProviders.priceForm.error");
      toast({
        title: t("common.error"),
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: ServiceProviderPriceFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.priceForm.labels.price")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={t("serviceProviders.priceForm.placeholders.price")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.priceForm.labels.currency")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("serviceProviders.priceForm.placeholders.currency")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.priceForm.labels.validFrom")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.priceForm.labels.validUntil")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("serviceProviders.priceForm.labels.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("serviceProviders.priceForm.placeholders.notes")}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={mutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {t("serviceProviders.priceForm.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
