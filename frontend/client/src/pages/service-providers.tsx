import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Plus, Eye, Pencil, Trash, FilePlus2, Loader2 } from "lucide-react";

import MainLayout from "@/components/layout/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { SERVICE_PROVIDER_TYPES } from "@/lib/constants";
import ServiceProviderForm from "@/components/forms/service-provider-form";
import ServiceProviderPriceForm from "@/components/forms/service-provider-price-form";
import type { ServiceProvider, ServiceProviderQuote } from "@/types/service-provider";

interface QuoteSummary {
  provider: ServiceProvider;
  quote: ServiceProviderQuote;
  timestamp: number;
}

function getTypeLabel(type: string | undefined, t: (key: string) => string) {
  if (!type) return t("serviceProviders.types.other");
  const found = SERVICE_PROVIDER_TYPES.find((option) => option.value === type);
  return found ? t(found.labelKey) : type;
}

function getQuoteTimestamp(quote: ServiceProviderQuote) {
  const candidates = [quote.validUntil, quote.validFrom, quote.updatedAt, quote.createdAt];
  const timestamps = candidates
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    })
    .filter((time) => time > 0);

  if (timestamps.length === 0) {
    return 0;
  }

  return Math.max(...timestamps);
}

function getProviderAveragePrice(provider: ServiceProvider) {
  if (typeof provider.averagePrice === "number" && !Number.isNaN(provider.averagePrice)) {
    return provider.averagePrice;
  }

  const quotes = provider.quotes ?? [];
  if (!quotes.length) {
    return null;
  }

  const sum = quotes.reduce((total, quote) => total + Number(quote.price ?? 0), 0);
  return quotes.length ? sum / quotes.length : null;
}

function formatDateValue(value: string | number | null | undefined, pattern = "PP") {
  if (value === null || value === undefined) {
    return null;
  }

  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return format(date, pattern);
}

export default function ServiceProviders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeType, setActiveType] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProviderId, setEditProviderId] = useState<number | null>(null);
  const [viewProviderId, setViewProviderId] = useState<number | null>(null);
  const [priceProviderId, setPriceProviderId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t("auth.sessionExpiredTitle"),
        description: t("auth.sessionExpiredDescription"),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [authLoading, isAuthenticated, toast, t]);

  const {
    data: providers = [],
    isLoading: providersLoading,
    error: providersError,
  } = useQuery<ServiceProvider[]>({
    queryKey: ["/api/service-providers"],
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!providersError) return;
    if (providersError instanceof Error && isUnauthorizedError(providersError)) {
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

    toast({
      title: t("common.error"),
      description:
        providersError instanceof Error
          ? providersError.message
          : t("serviceProviders.notifications.loadError"),
      variant: "destructive",
    });
  }, [providersError, toast, t]);

  const editingProvider = useMemo(
    () => providers.find((provider) => provider.id === editProviderId) ?? null,
    [providers, editProviderId],
  );

  const viewingProvider = useMemo(
    () => providers.find((provider) => provider.id === viewProviderId) ?? null,
    [providers, viewProviderId],
  );

  const priceProvider = useMemo(
    () => providers.find((provider) => provider.id === priceProviderId) ?? null,
    [providers, priceProviderId],
  );

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    providers.forEach((provider) => {
      if (provider.type) {
        types.add(provider.type);
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [providers]);

  useEffect(() => {
    if (!availableTypes.includes(activeType)) {
      setActiveType("all");
    }
  }, [availableTypes, activeType]);

  const providersByType = useMemo(() => {
    const map = new Map<string, ServiceProvider[]>();
    providers.forEach((provider) => {
      const key = provider.type || "other";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(provider);
    });
    return map;
  }, [providers]);

  const providersForActiveType = useMemo(() => {
    if (activeType === "all") {
      return providers;
    }
    return providersByType.get(activeType) ?? [];
  }, [activeType, providers, providersByType]);

  const summary = useMemo(() => {
    const quotes: QuoteSummary[] = [];
    providersForActiveType.forEach((provider) => {
      if (provider.latestQuote) {
        quotes.push({
          provider,
          quote: provider.latestQuote,
          timestamp: getQuoteTimestamp(provider.latestQuote),
        });
      }
    });

    const totalProviders = providersForActiveType.length;
    const currencies = new Set<string>();
    let totalPrice = 0;

    quotes.forEach((item) => {
      currencies.add(item.quote.currency);
      totalPrice += Number(item.quote.price ?? 0);
    });

    const averagePrice = quotes.length > 0 ? totalPrice / quotes.length : null;
    const latestQuote = quotes.reduce<QuoteSummary | null>((current, item) => {
      if (!current || item.timestamp > current.timestamp) {
        return item;
      }
      return current;
    }, null);

    return {
      totalProviders,
      averagePrice,
      currencies,
      latestQuote,
    };
  }, [providersForActiveType]);

  const latestSummaryDate = summary.latestQuote
    ? formatDateValue(summary.latestQuote.timestamp, "PPP")
    : null;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/service-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-providers"] });
      toast({
        title: t("common.success"),
        description: t("serviceProviders.notifications.deleteSuccess"),
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
          window.location.href = "/login";
        }, 500);
        return;
      }

      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("serviceProviders.notifications.deleteError"),
        variant: "destructive",
      });
    },
  });

  const handleDelete = (provider: ServiceProvider) => {
    const confirmation = window.confirm(
      t("serviceProviders.actions.confirmDelete", { name: provider.name }),
    );
    if (!confirmation) {
      return;
    }

    deleteMutation.mutate(provider.id);
  };

  if (authLoading || providersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title={t("serviceProviders.title")} subtitle={t("serviceProviders.subtitle")}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">
            {t("serviceProviders.heading", { count: providers.length })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("serviceProviders.description")}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-500 text-black hover:bg-primary-600">
              <Plus className="h-4 w-4 mr-2" />
              {t("serviceProviders.actions.addProvider")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("serviceProviders.form.titleCreate")}</DialogTitle>
            </DialogHeader>
            <ServiceProviderForm
              onSuccess={() => setIsCreateOpen(false)}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeType} onValueChange={setActiveType} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
          {availableTypes.map((type) => (
            <TabsTrigger key={type} value={type} className="px-4 py-2 data-[state=active]:bg-primary-100">
              {type === "all" ? t("serviceProviders.tabs.all") : getTypeLabel(type, t)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeType} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("serviceProviders.summary.total")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-secondary-900">
                  {summary.totalProviders}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("serviceProviders.summary.averagePrice")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-secondary-900">
                  {summary.averagePrice !== null
                    ? `${
                        summary.currencies.size === 1
                          ? `${Array.from(summary.currencies)[0]} `
                          : summary.currencies.size > 1
                          ? `${t("serviceProviders.summary.mixedCurrency")} `
                          : ""
                      }${summary.averagePrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : t("serviceProviders.summary.noQuotes")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("serviceProviders.summary.latestQuote")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.latestQuote ? (
                  <div className="space-y-1 text-sm">
                    <div className="text-lg font-semibold text-secondary-900">
                      {`${summary.latestQuote.quote.currency ? `${summary.latestQuote.quote.currency} ` : ""}${Number(
                        summary.latestQuote.quote.price ?? 0,
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                    </div>
                    <div className="text-muted-foreground">
                      {summary.latestQuote.provider.name}
                    </div>
                    {latestSummaryDate && (
                      <div className="text-xs text-muted-foreground">{latestSummaryDate}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-secondary-500 text-sm">
                    {t("serviceProviders.summary.noQuotes")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {providersForActiveType.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t("serviceProviders.emptyState")}
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("serviceProviders.table.provider")}</TableHead>
                      <TableHead>{t("serviceProviders.table.contact")}</TableHead>
                      <TableHead>{t("serviceProviders.table.latestQuote")}</TableHead>
                      <TableHead>{t("serviceProviders.table.averagePrice")}</TableHead>
                      <TableHead className="text-right">
                        {t("serviceProviders.table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providersForActiveType.map((provider) => {
                      const latestQuote = provider.latestQuote;
                      const averagePrice = getProviderAveragePrice(provider);
                      const latestQuoteTimestamp = latestQuote
                        ? getQuoteTimestamp(latestQuote)
                        : null;
                      const latestQuoteDate = formatDateValue(latestQuoteTimestamp);
                      const providerCurrency =
                        provider.currency ??
                        latestQuote?.currency ??
                        provider.quotes?.[0]?.currency ??
                        undefined;
                      return (
                        <TableRow key={provider.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-secondary-900">{provider.name}</span>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary">{getTypeLabel(provider.type, t)}</Badge>
                                {providerCurrency && (
                                  <Badge variant="outline">{providerCurrency}</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              {provider.contactName && <span>{provider.contactName}</span>}
                              {provider.contactEmail && (
                                <span className="text-muted-foreground">{provider.contactEmail}</span>
                              )}
                              {provider.contactPhone && (
                                <span className="text-muted-foreground">{provider.contactPhone}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {latestQuote ? (
                              <div className="text-sm">
                                <div>
                                  {`${latestQuote.currency ? `${latestQuote.currency} ` : ""}${Number(
                                    latestQuote.price ?? 0,
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`}
                                </div>
                                {latestQuoteDate && (
                                  <div className="text-xs text-muted-foreground">
                                    {latestQuoteDate}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {t("serviceProviders.summary.noQuotes")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {averagePrice !== null ? (
                              <span className="text-sm">
                                {`${providerCurrency ? `${providerCurrency} ` : ""}${averagePrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {t("serviceProviders.summary.noQuotes")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewProviderId(provider.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditProviderId(provider.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDelete(provider)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingProvider)} onOpenChange={(open) => !open && setEditProviderId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("serviceProviders.form.titleEdit")}</DialogTitle>
          </DialogHeader>
          {editingProvider && (
            <ServiceProviderForm
              provider={editingProvider}
              onSuccess={() => setEditProviderId(null)}
              onCancel={() => setEditProviderId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewingProvider)}
        onOpenChange={(open) => {
          if (!open) {
            setViewProviderId(null);
            setPriceProviderId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("serviceProviders.details.title")}</DialogTitle>
          </DialogHeader>
          {viewingProvider && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{getTypeLabel(viewingProvider.type, t)}</Badge>
                {viewingProvider.currency && (
                  <Badge variant="outline">{viewingProvider.currency}</Badge>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {t("serviceProviders.details.contactSection")}
                  </h4>
                  <dl className="mt-2 space-y-1 text-sm">
                    {viewingProvider.contactName && (
                      <div>
                        <dt className="font-medium text-secondary-900">
                          {t("serviceProviders.form.labels.contactName")}
                        </dt>
                        <dd>{viewingProvider.contactName}</dd>
                      </div>
                    )}
                    {viewingProvider.contactEmail && (
                      <div>
                        <dt className="font-medium text-secondary-900">
                          {t("serviceProviders.form.labels.contactEmail")}
                        </dt>
                        <dd>{viewingProvider.contactEmail}</dd>
                      </div>
                    )}
                    {viewingProvider.contactPhone && (
                      <div>
                        <dt className="font-medium text-secondary-900">
                          {t("serviceProviders.form.labels.contactPhone")}
                        </dt>
                        <dd>{viewingProvider.contactPhone}</dd>
                      </div>
                    )}
                    {viewingProvider.address && (
                      <div>
                        <dt className="font-medium text-secondary-900">
                          {t("serviceProviders.form.labels.address")}
                        </dt>
                        <dd>{viewingProvider.address}</dd>
                      </div>
                    )}
                    {viewingProvider.website && (
                      <div>
                        <dt className="font-medium text-secondary-900">
                          {t("serviceProviders.form.labels.website")}
                        </dt>
                        <dd>{viewingProvider.website}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {t("serviceProviders.details.servicesSection")}
                  </h4>
                  {viewingProvider.services && viewingProvider.services.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {viewingProvider.services.map((service) => (
                        <Badge key={service} variant="outline">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("serviceProviders.details.noServices")}
                    </p>
                  )}
                  {viewingProvider.notes && (
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-muted-foreground">
                        {t("serviceProviders.form.labels.notes")}
                      </h5>
                      <p className="mt-1 text-sm text-secondary-700 whitespace-pre-wrap">
                        {viewingProvider.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {t("serviceProviders.details.quotesSection")}
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => setPriceProviderId(viewingProvider.id)}
                    className="bg-primary-500 text-black hover:bg-primary-600"
                  >
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    {t("serviceProviders.actions.addQuote")}
                  </Button>
                </div>
                <div className="mt-3">
                  {viewingProvider.quotes && viewingProvider.quotes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("serviceProviders.priceForm.labels.price")}</TableHead>
                          <TableHead>{t("serviceProviders.priceForm.labels.currency")}</TableHead>
                          <TableHead>{t("serviceProviders.priceForm.labels.validFrom")}</TableHead>
                          <TableHead>{t("serviceProviders.priceForm.labels.validUntil")}</TableHead>
                          <TableHead>{t("serviceProviders.priceForm.labels.notes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingProvider.quotes.map((quote) => {
                          return (
                            <TableRow key={quote.id}>
                              <TableCell>
                                {Number(quote.price ?? 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell>{quote.currency}</TableCell>
                          <TableCell>
                                {formatDateValue(quote.validFrom) ?? "—"}
                              </TableCell>
                              <TableCell>
                                {formatDateValue(quote.validUntil) ?? "—"}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {quote.notes ? (
                                  <span className="line-clamp-3 text-sm text-secondary-700">
                                    {quote.notes}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("serviceProviders.details.noQuotes")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(priceProvider)} onOpenChange={(open) => !open && setPriceProviderId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("serviceProviders.priceForm.title")}</DialogTitle>
          </DialogHeader>
          {priceProvider && (
            <ServiceProviderPriceForm
              provider={priceProvider}
              onSuccess={() => setPriceProviderId(null)}
              onCancel={() => setPriceProviderId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
