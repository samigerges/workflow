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
import { SERVICE_PROVIDER_TYPES, CURRENCIES } from "@/lib/constants";
import type { ServiceProvider } from "@/types/service-provider";

const createServiceProviderSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t("serviceProviders.form.validation.nameRequired") })
      .min(1, t("serviceProviders.form.validation.nameRequired")),
    type: z
      .string({ required_error: t("serviceProviders.form.validation.typeRequired") })
      .min(1, t("serviceProviders.form.validation.typeRequired")),
    contactName: z.string().optional(),
    contactEmail: z
      .string()
      .email(t("serviceProviders.form.validation.email"))
      .or(z.literal(""))
      .optional(),
    contactPhone: z.string().optional(),
    website: z
      .string()
      .url(t("serviceProviders.form.validation.website"))
      .or(z.literal(""))
      .optional(),
    currency: z.string().optional(),
    services: z.string().optional(),
    notes: z.string().optional(),
    address: z.string().optional(),
  });

type ServiceProviderFormValues = z.infer<ReturnType<typeof createServiceProviderSchema>>;

interface ServiceProviderFormProps {
  provider?: ServiceProvider | null;
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

function parseServices(value?: string) {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : undefined;
}

export default function ServiceProviderForm({ provider, onSuccess, onCancel }: ServiceProviderFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formSchema = useMemo(() => createServiceProviderSchema(t), [t]);

  const form = useForm<ServiceProviderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: provider?.name ?? "",
      type: provider?.type ?? "",
      contactName: provider?.contactName ?? "",
      contactEmail: provider?.contactEmail ?? "",
      contactPhone: provider?.contactPhone ?? "",
      website: provider?.website ?? "",
      currency: provider?.currency ?? "",
      services: provider?.services?.join(", ") ?? "",
      notes: provider?.notes ?? "",
      address: provider?.address ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceProviderFormValues) => {
      const payload = {
        name: values.name.trim(),
        type: values.type,
        contactName: normalizeString(values.contactName),
        contactEmail: normalizeString(values.contactEmail),
        contactPhone: normalizeString(values.contactPhone),
        website: normalizeString(values.website),
        currency: normalizeString(values.currency),
        services: parseServices(values.services),
        notes: normalizeString(values.notes),
        address: normalizeString(values.address),
      };

      const endpoint = provider ? `/api/service-providers/${provider.id}` : "/api/service-providers";
      const method = provider ? "PUT" : "POST";

      await apiRequest(method, endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-providers"] });
      toast({
        title: t("common.success"),
        description: provider
          ? t("serviceProviders.form.updateSuccess")
          : t("serviceProviders.form.createSuccess"),
      });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: t("auth.sessionExpiredTitle"),
          description: t("auth.sessionExpiredDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }

      const description = error instanceof Error ? error.message : t("serviceProviders.form.error");
      toast({
        title: t("common.error"),
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: ServiceProviderFormValues) => {
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("serviceProviders.form.placeholders.name")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.type")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("serviceProviders.form.placeholders.type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_PROVIDER_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
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
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.contactName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("serviceProviders.form.placeholders.contactName")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.contactEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("serviceProviders.form.placeholders.contactEmail")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.contactPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("serviceProviders.form.placeholders.contactPhone")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.website")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("serviceProviders.form.placeholders.website")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.currency")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("serviceProviders.form.placeholders.currency")} />
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceProviders.form.labels.address")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("serviceProviders.form.placeholders.address")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="services"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("serviceProviders.form.labels.services")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("serviceProviders.form.placeholders.services")}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("serviceProviders.form.helpers.services")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("serviceProviders.form.labels.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("serviceProviders.form.placeholders.notes")}
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
                {provider
                  ? t("serviceProviders.form.submitUpdate")
                  : t("serviceProviders.form.submitCreate")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
