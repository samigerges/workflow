import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatLcCurrency } from "@/lib/lc";
import type { NormalizedLC } from "@/lib/lc";
import { useAuth } from "@/hooks/useAuth";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X, PlusCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiSupplierAllocation {
  id?: string | number | null;
  supplierId?: string | number | null;
  supplierName?: string | null;
  name?: string | null;
  quantity?: number | string | null;
  allocationQuantity?: number | string | null;
  allocatedQuantity?: number | string | null;
  percentage?: number | string | null;
  allocationPercentage?: number | string | null;
  percent?: number | string | null;
  amount?: number | string | null;
  allocationAmount?: number | string | null;
}

interface AllocationRow {
  id?: string | number;
  supplierId?: string | null;
  supplierName: string;
  quantity: number | "";
  percentage: number | "";
  amount: number | "";
}

interface SupplierAllocationOption {
  contractId: string;
  contractPublicId: string | null;
  sequenceNumber: number;
  supplierName: string;
}

function getContractDisplayId(option: SupplierAllocationOption): string {
  const explicitId = option.contractPublicId?.trim();
  if (explicitId && explicitId.length > 0) {
    return explicitId;
  }

  const normalizedSequence = Number.isFinite(option.sequenceNumber)
    ? Math.max(0, Math.trunc(option.sequenceNumber))
    : 0;

  return `CON-${normalizedSequence.toString().padStart(3, "0")}`;
}

interface SavePayload {
  rows: AllocationRow[];
}

interface LCSupplierAllocationDialogProps {
  lc: NormalizedLC | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeSupplierId(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function normalizeApiAllocation(input: ApiSupplierAllocation): AllocationRow {
  const supplierName =
    (typeof input.supplierName === "string" && input.supplierName) ||
    (typeof input.name === "string" && input.name) ||
    "";

  const quantity =
    parseNumericValue(
      input.quantity ?? input.allocationQuantity ?? input.allocatedQuantity,
    ) ?? "";
  const percentage =
    parseNumericValue(
      input.percentage ?? input.allocationPercentage ?? input.percent,
    ) ?? "";
  const amount =
    parseNumericValue(input.amount ?? input.allocationAmount) ?? "";

  return {
    id: input.id ?? undefined,
    supplierId: normalizeSupplierId(input.supplierId),
    supplierName,
    quantity,
    percentage,
    amount,
  };
}

function normalizeRowForComparison(row: AllocationRow) {
  return {
    id: row.id ?? null,
    supplierId: row.supplierId ? String(row.supplierId) : null,
    supplierName: row.supplierName.trim(),
    quantity: typeof row.quantity === "number" ? Number(row.quantity.toFixed(6)) : null,
    percentage: typeof row.percentage === "number" ? Number(row.percentage.toFixed(6)) : null,
    amount: typeof row.amount === "number" ? Number(row.amount.toFixed(6)) : null,
  };
}

function createEmptyRow(): AllocationRow {
  return {
    supplierId: undefined,
    supplierName: "",
    quantity: "",
    percentage: "",
    amount: "",
  };
}

export default function LCSupplierAllocationDialog({
  lc,
  open,
  onOpenChange,
}: LCSupplierAllocationDialogProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { redirectToLogin } = useUnauthorizedRedirect({ isAuthenticated, isLoading: authLoading });
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<AllocationRow[]>([createEmptyRow()]);

  const lcId = lc?.id ?? null;
  const lcQuantity = typeof lc?.quantity === "number" ? lc?.quantity ?? null : null;

  const allocationsQuery = useQuery<ApiSupplierAllocation[]>({
    queryKey: ["/api/letters-of-credit", lcId ?? "placeholder", "supplier-allocations"],
    enabled: open && Boolean(lcId),
    staleTime: 0,
  });

  const supplierOptionsQuery = useQuery<SupplierAllocationOption[]>({
    queryKey: [
      "/api/letters-of-credit/supplier-allocation-options",
      lcId ? { lcId } : null,
    ],
    enabled: open,
    staleTime: 0,
  });

  const supplierOptions = useMemo<SupplierAllocationOption[]>(() => {
    if (!supplierOptionsQuery.data || supplierOptionsQuery.data.length === 0) {
      return [];
    }

    return supplierOptionsQuery.data.map((option) => ({
      contractId: String(option.contractId),
      contractPublicId: option.contractPublicId ?? null,
      sequenceNumber: Number.isFinite(option.sequenceNumber)
        ? option.sequenceNumber
        : 0,
      supplierName: option.supplierName,
    }));
  }, [supplierOptionsQuery.data]);

  const supplierOptionMap = useMemo(() => {
    const map = new Map<string, SupplierAllocationOption>();
    supplierOptions.forEach((option) => {
      map.set(option.contractId, option);
    });
    return map;
  }, [supplierOptions]);

  const serverRows = useMemo<AllocationRow[]>(() => {
    if (!allocationsQuery.data || allocationsQuery.data.length === 0) {
      return [];
    }

    return allocationsQuery.data.map(normalizeApiAllocation);
  }, [allocationsQuery.data]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setRows([createEmptyRow()]);
  }, [open]);

  const existingTotals = useMemo(() => {
    return serverRows.reduce(
      (acc, row) => {
        const quantity = typeof row.quantity === "number" ? row.quantity : 0;
        const amount = typeof row.amount === "number" ? row.amount : 0;

        return {
          quantity: acc.quantity + quantity,
          amount: acc.amount + amount,
        };
      },
      { quantity: 0, amount: 0 },
    );
  }, [serverRows]);

  const inputTotals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const quantity = typeof row.quantity === "number" ? row.quantity : 0;
        const amount = typeof row.amount === "number" ? row.amount : 0;

        return {
          quantity: acc.quantity + quantity,
          amount: acc.amount + amount,
        };
      },
      { quantity: 0, amount: 0 },
    );
  }, [rows]);

  const combinedTotals = useMemo(
    () => ({
      quantity: existingTotals.quantity + inputTotals.quantity,
      amount: existingTotals.amount + inputTotals.amount,
    }),
    [existingTotals, inputTotals],
  );

  const quantityExceeded =
    typeof lcQuantity === "number" &&
    lcQuantity !== null &&
    combinedTotals.quantity > lcQuantity + 1e-6;

  const hasEmptySupplier = rows.some((row) => {
    if (row.supplierId && row.supplierId.length > 0) {
      return false;
    }

    return row.supplierName.trim().length === 0;
  });

  const validationErrors: string[] = [];

  if (quantityExceeded) {
    validationErrors.push(
      `Total allocated quantity (${combinedTotals.quantity.toLocaleString()}) exceeds LC quantity ${lcQuantity?.toLocaleString() ?? "0"}.`,
    );
  }

  if (hasEmptySupplier) {
    validationErrors.push("Each allocation must include a supplier selection or supplier name.");
  }

  const normalizedCurrent = useMemo(
    () => rows.map(normalizeRowForComparison),
    [rows],
  );
  const normalizedServer = useMemo(
    () => (serverRows.length > 0 ? serverRows.map(normalizeRowForComparison) : [normalizeRowForComparison(createEmptyRow())]),
    [serverRows],
  );

  const isDirty = useMemo(() => {
    if (normalizedCurrent.length !== normalizedServer.length) {
      return true;
    }

    for (let i = 0; i < normalizedCurrent.length; i += 1) {
      const current = normalizedCurrent[i];
      const reference = normalizedServer[i];
      if (JSON.stringify(current) !== JSON.stringify(reference)) {
        return true;
      }
    }

    return false;
  }, [normalizedCurrent, normalizedServer]);

  const mutation = useMutation({
    mutationFn: async ({ rows: nextRows }: SavePayload) => {
      if (!lcId) {
        throw new Error("Missing letter of credit identifier");
      }

      const ensurePayload = (row: AllocationRow) => ({
        supplierId:
          typeof row.supplierId === "string" && row.supplierId.trim().length > 0
            ? row.supplierId.trim()
            : null,
        supplierName: row.supplierName.trim(),
        quantity:
          typeof row.quantity === "number"
            ? row.quantity
            : row.quantity === ""
              ? null
              : parseNumericValue(row.quantity),
        percentage:
          typeof row.percentage === "number"
            ? row.percentage
            : row.percentage === ""
              ? null
              : parseNumericValue(row.percentage),
        amount:
          typeof row.amount === "number"
            ? row.amount
            : row.amount === ""
              ? null
              : parseNumericValue(row.amount),
      });

      for (const row of nextRows) {
        if (row.id !== undefined && row.id !== null) {
          const payload = ensurePayload(row);
          await apiRequest(
            "PUT",
            `/api/letters-of-credit/${lcId}/supplier-allocations/${row.id}`,
            payload,
          );
          continue;
        }

        const payload = ensurePayload(row);
        await apiRequest("POST", `/api/letters-of-credit/${lcId}/supplier-allocations`, payload);
      }
    },
    onSuccess: async () => {
      if (lcId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["/api/letters-of-credit", lcId, "supplier-allocations"],
          }),
          queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] }),
        ]);
      }

      toast({
        title: "Allocations saved",
        description: "Supplier allocations updated successfully.",
      });

      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error instanceof Error && isUnauthorizedError(error)) {
        redirectToLogin();
        return;
      }

      const description =
        error instanceof Error && error.message ? error.message : "Unable to save supplier allocations.";

      toast({
        title: "Allocation update failed",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lcId) {
      toast({
        title: "No letter of credit selected",
        description: "Select a letter of credit to manage supplier allocations.",
        variant: "destructive",
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Fix validation issues",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    const sanitizedRows = rows
      .map((row) => ({
        ...row,
        supplierId: row.supplierId && row.supplierId.length > 0 ? row.supplierId : undefined,
        supplierName: row.supplierName.trim(),
      }))
      .filter((row) => (row.supplierId && row.supplierId.length > 0) || row.supplierName.length > 0);

    mutation.mutate({ rows: sanitizedRows });
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setRows([createEmptyRow()]);
    }
  };

  const allocationsLoading = allocationsQuery.isLoading || allocationsQuery.isFetching;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Supplier allocations</DialogTitle>
          <DialogDescription>
            {lc
              ? `Manage supplier allocations for LC ${lc.number}.`
              : "Select a letter of credit to manage allocations."}
          </DialogDescription>
        </DialogHeader>

        {!lc ? (
          <p className="text-sm text-muted-foreground">
            Choose a letter of credit to configure supplier allocations.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-700">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-xs text-secondary-500">LC Number</span>
                  <span className="font-semibold text-secondary-900">{lc.number}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-secondary-500">Total Quantity</span>
                  <span className="font-semibold text-secondary-900">
                    {typeof lc.quantity === "number"
                      ? lc.quantity.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-secondary-500">Total Amount</span>
                  <span className="font-semibold text-secondary-900">
                    {typeof lc.amount === "number"
                      ? lc.currency
                        ? formatLcCurrency(lc.amount, lc.currency)
                        : lc.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs text-secondary-500">Allocated Quantity</span>
                  <span className={cn("font-semibold", quantityExceeded && "text-destructive")}>
                    {combinedTotals.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-secondary-500">Allocated Amount</span>
                  <span className="font-semibold">
                    {combinedTotals.amount > 0 && lc.currency
                      ? formatLcCurrency(combinedTotals.amount, lc.currency)
                      : combinedTotals.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {(existingTotals.quantity > 0 || existingTotals.amount > 0) && (
                <p className="text-xs text-secondary-500">
                  Includes existing allocations totaling
                  {" "}
                  <span className="font-medium text-secondary-700">
                    {existingTotals.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} units
                  </span>
                  {existingTotals.amount > 0 && (
                    <>
                      {" "}
                      and
                      {" "}
                      <span className="font-medium text-secondary-700">
                        {lc.currency
                          ? formatLcCurrency(existingTotals.amount, lc.currency)
                          : existingTotals.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </>
                  )}
                  .
                </p>
              )}
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Resolve allocation issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {validationErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="max-h-[360px]">
              <div className="pr-4">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Supplier</TableHead>
                      <TableHead className="w-[18%]">Quantity</TableHead>
                      <TableHead className="w-[18%]">Allocation %</TableHead>
                      <TableHead className="w-[18%]">
                        Amount {lc.currency ? `(${lc.currency})` : ""}
                      </TableHead>
                      <TableHead className="w-[6%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const rowId = row.id ?? `new-${index}`;
                      const selectedOption =
                        row.supplierId && row.supplierId.length > 0
                          ? supplierOptionMap.get(String(row.supplierId))
                          : undefined;
                      return (
                        <TableRow key={rowId}>
                          <TableCell>
                            <Label htmlFor={`supplier-${rowId}`} className="sr-only">
                              Supplier contract
                            </Label>
                            <div className="space-y-2">
                              <Select
                                value={row.supplierId ?? ""}
                                onValueChange={(value) => {
                                  setRows((prev) =>
                                    prev.map((current, idx) => {
                                      if (idx !== index) {
                                        return current;
                                      }

                                      if (value.length === 0) {
                                        return {
                                          ...current,
                                          supplierId: undefined,
                                        };
                                      }

                                      const option = supplierOptionMap.get(value);
                                      return {
                                        ...current,
                                        supplierId: value,
                                        supplierName: option?.supplierName ?? current.supplierName,
                                      };
                                    }),
                                  );
                                }}
                                disabled={supplierOptionsQuery.isLoading}
                              >
                                <SelectTrigger id={`supplier-${rowId}`}>
                                  <SelectValue placeholder="Select a contract" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Unassigned</SelectItem>
                                  {supplierOptions.map((option) => (
                                    <SelectItem key={option.contractId} value={option.contractId}>
                                      {`${getContractDisplayId(option)} — ${option.supplierName}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {row.supplierId && row.supplierId.length > 0 ? (
                                <p className="text-xs text-secondary-500">
                                  {selectedOption
                                    ? `${getContractDisplayId(selectedOption)} — ${selectedOption.supplierName}`
                                    : row.supplierName}
                                </p>
                              ) : (
                                <Input
                                  value={row.supplierName}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setRows((prev) =>
                                      prev.map((current, idx) =>
                                        idx === index
                                          ? { ...current, supplierId: undefined, supplierName: value }
                                          : current,
                                      ),
                                    );
                                  }}
                                  placeholder="Supplier name"
                                  autoComplete="off"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Label htmlFor={`quantity-${rowId}`} className="sr-only">
                              Quantity
                            </Label>
                            <Input
                              id={`quantity-${rowId}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.quantity === "" ? "" : row.quantity}
                              onChange={(event) => {
                                const value = event.target.value;
                                setRows((prev) =>
                                  prev.map((current, idx) =>
                                    idx === index
                                      ? {
                                          ...current,
                                          quantity: value === "" ? "" : Number(value),
                                        }
                                      : current,
                                  ),
                                );
                              }}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Label htmlFor={`percentage-${rowId}`} className="sr-only">
                              Allocation percentage
                            </Label>
                            <Input
                              id={`percentage-${rowId}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.percentage === "" ? "" : row.percentage}
                              onChange={(event) => {
                                const value = event.target.value;
                                setRows((prev) =>
                                  prev.map((current, idx) =>
                                    idx === index
                                      ? {
                                          ...current,
                                          percentage: value === "" ? "" : Number(value),
                                        }
                                      : current,
                                  ),
                                );
                              }}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Label htmlFor={`amount-${rowId}`} className="sr-only">
                              Amount
                            </Label>
                            <Input
                              id={`amount-${rowId}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.amount === "" ? "" : row.amount}
                              onChange={(event) => {
                                const value = event.target.value;
                                setRows((prev) =>
                                  prev.map((current, idx) =>
                                    idx === index
                                      ? {
                                          ...current,
                                          amount: value === "" ? "" : Number(value),
                                        }
                                      : current,
                                  ),
                                );
                              }}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setRows((prev) => {
                                  if (prev.length === 1) {
                                    return [createEmptyRow()];
                                  }
                                  return prev.filter((_, idx) => idx !== index);
                                });
                              }}
                              aria-label="Remove allocation"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRows((prev) => [...prev, createEmptyRow()])}
                className="w-full sm:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add allocation
              </Button>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (serverRows.length > 0) {
                      setRows(serverRows);
                    } else {
                      setRows([createEmptyRow()]);
                    }
                  }}
                  disabled={!isDirty || mutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={
                    mutation.isPending ||
                    validationErrors.length > 0 ||
                    rows.every(
                      (row) =>
                        (!row.supplierId || row.supplierId.length === 0) &&
                        row.supplierName.trim().length === 0,
                    )
                  }
                >
                  {mutation.isPending ? "Saving..." : "Save allocations"}
                </Button>
              </div>
            </div>

            {allocationsLoading && (
              <p className="text-xs text-secondary-500">Refreshing supplier allocations…</p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
