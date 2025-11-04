import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatLcDate } from "@/lib/lc";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CARGO_TYPES } from "@/lib/constants";
import { getOptionLabel } from "@/lib/utils";

interface ContractReference {
  id: string | number;
  publicId?: string | null;
  code?: string | null;
  title?: string | null;
  cargoType?: string | null;
}

interface AvailableLcItem {
  id: string;
  lcNumber: string;
  supplier: string | null;
  product: string | null;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  expiryDate: string | null;
  status: string | null;
  contractId: string | null;
  isSelectable: boolean;
}

const formatQuantity = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
};

const ALL_CARGO_TYPES_VALUE = "all";

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 0;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizeAvailableLc = (raw: any): AvailableLcItem | null => {
  const id = raw?.id ?? raw?.Id ?? "";
  if (!id) {
    return null;
  }

  const lcNumberRaw = raw?.lcNumber ?? raw?.LcNumber ?? "";
  const lcNumber = lcNumberRaw ? String(lcNumberRaw) : `LC-${String(id).slice(-6).toUpperCase()}`;
  const supplier = raw?.supplier ?? raw?.Supplier ?? null;
  const product = raw?.product ?? raw?.Product ?? null;
  const totalQuantity = toNumber(raw?.totalQuantity ?? raw?.TotalQuantity);
  const usedQuantity = toNumber(raw?.usedQuantity ?? raw?.UsedQuantity);
  const remainingQuantity = Math.max(0, toNumber(raw?.remainingQuantity ?? raw?.RemainingQuantity));
  const expiryRaw = raw?.expiryDate ?? raw?.ExpiryDate ?? null;
  const expiryDate = expiryRaw instanceof Date
    ? expiryRaw.toISOString()
    : typeof expiryRaw === "string"
      ? expiryRaw
      : null;

  return {
    id: String(id),
    lcNumber,
    supplier: supplier ?? null,
    product: product ?? null,
    totalQuantity,
    usedQuantity,
    remainingQuantity,
    expiryDate,
    status: "Active",
    contractId: raw?.contractId ?? raw?.ContractId ?? null,
    isSelectable: remainingQuantity > 0,
  } satisfies AvailableLcItem;
};

interface ContractAvailableLcsDialogProps {
  contract: ContractReference | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContractAvailableLcsDialog({
  contract,
  open,
  onOpenChange,
}: ContractAvailableLcsDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedLcId, setSelectedLcId] = useState("");
  const [cargoTypeFilter, setCargoTypeFilter] = useState(ALL_CARGO_TYPES_VALUE);

  const contractId = useMemo(() => {
    if (!contract?.id) return null;
    return String(contract.id);
  }, [contract?.id]);

  useEffect(() => {
    if (!open) {
      setSelectedLcId("");
    }
  }, [open]);

  useEffect(() => {
    setSelectedLcId("");
    setCargoTypeFilter(ALL_CARGO_TYPES_VALUE);
  }, [contractId]);

  useEffect(() => {
    setSelectedLcId("");
  }, [cargoTypeFilter]);

  const lcListQueryKey = useMemo(() => {
    if (!contractId) return null;

    const cargoFilter = cargoTypeFilter === ALL_CARGO_TYPES_VALUE
      ? undefined
      : cargoTypeFilter;

    return [
      "/api/contracts",
      contractId,
      "available-lcs",
      {
        all: true,
        cargoType: cargoFilter,
      },
    ] as const;
  }, [cargoTypeFilter, contractId]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<any>({
    queryKey: lcListQueryKey ?? ["/api/contracts", "available-lcs", "disabled"],
    enabled: open && !!lcListQueryKey,
    placeholderData: keepPreviousData,
  });

  const rawItems = useMemo<unknown[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as unknown[];
    if (Array.isArray((data as any)?.items)) return (data as any).items as unknown[];
    return [];
  }, [data]);

  const normalizedItems = useMemo<AvailableLcItem[]>(() => {
    const mapped: (AvailableLcItem | null)[] = rawItems.map((item) => normalizeAvailableLc(item));
    const filtered = mapped.filter((item): item is AvailableLcItem => item !== null);

    return filtered.sort((a: AvailableLcItem, b: AvailableLcItem) => {
      const remainingDiff = b.remainingQuantity - a.remainingQuantity;
      if (remainingDiff !== 0) {
        return remainingDiff;
      }
      return a.lcNumber.localeCompare(b.lcNumber);
    });
  }, [rawItems]);

  const filteredItems = useMemo(() => {
    if (cargoTypeFilter === ALL_CARGO_TYPES_VALUE) {
      return normalizedItems;
    }

    const normalizedFilter = cargoTypeFilter.toLowerCase();
    return normalizedItems.filter((item) => (item.product ?? "").toLowerCase() === normalizedFilter);
  }, [cargoTypeFilter, normalizedItems]);

  const total = filteredItems.length;
  const selectedOption = filteredItems.find(item => item.id === selectedLcId) ?? null;

  useEffect(() => {
    if (selectedLcId && !filteredItems.some(item => item.id === selectedLcId)) {
      setSelectedLcId("");
    }
  }, [filteredItems, selectedLcId]);

  const contractLabel = contract?.publicId
    ?? contract?.code
    ?? contract?.title
    ?? "selected";

  const cargoFilterDescription = cargoTypeFilter === ALL_CARGO_TYPES_VALUE
    ? "all cargo types"
    : `${getOptionLabel(CARGO_TYPES, cargoTypeFilter)} cargo`;

  const attachMutation = useMutation({
    mutationFn: async (letterOfCreditId: string) => {
      if (!contractId) {
        throw new Error("Contract identifier is missing.");
      }

      await apiRequest("POST", `/api/contracts/${contractId}/letter-of-credit-link`, {
        letterOfCreditId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Letter of Credit Linked",
        description: "The letter of credit was added to the contract successfully.",
      });
      setSelectedLcId("");
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] });
      if (lcListQueryKey) {
        queryClient.invalidateQueries({ queryKey: lcListQueryKey });
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to link the letter of credit.";
      toast({
        title: "Link failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleAttach = () => {
    if (!selectedLcId || attachMutation.isPending) {
      return;
    }
    attachMutation.mutate(selectedLcId);
  };

  const isAttachDisabled =
    !selectedLcId ||
    attachMutation.isPending ||
    !contractId ||
    (selectedOption ? !selectedOption.isSelectable : false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Available LCs for Contract {contractLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="availableLcCargoFilter">Filter by cargo type</Label>
            <Select
              value={cargoTypeFilter}
              onValueChange={(value) => setCargoTypeFilter(value)}
              disabled={isLoading || !contractId}
            >
              <SelectTrigger id="availableLcCargoFilter" className="w-full">
                <SelectValue placeholder="Choose cargo type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CARGO_TYPES_VALUE}>All cargo types</SelectItem>
                {CARGO_TYPES.map((cargo) => (
                  <SelectItem key={cargo.value} value={cargo.value}>
                    {cargo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-600">
              Showing letters of credit for {cargoFilterDescription.toLowerCase()}.
            </p>
          </div>

          {filteredItems.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="availableLcSelect">Select Letter of Credit</Label>
                <Select
                  value={selectedLcId}
                  onValueChange={(value) => setSelectedLcId(value)}
                  disabled={attachMutation.isPending}
                >
                  <SelectTrigger id="availableLcSelect" className="w-full">
                    <SelectValue placeholder="Choose an LC number" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredItems.map((item) => (
                      <SelectItem key={item.id} value={item.id} disabled={!item.isSelectable}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{item.lcNumber}</span>
                          <span className="text-xs text-secondary-600">
                            Remaining {formatQuantity(item.remainingQuantity)} • Supplier {item.supplier ?? "—"}
                          </span>
                          {!item.isSelectable && (
                            <span className="text-xs text-red-600">
                              {item.remainingQuantity <= 0
                                ? "No remaining quantity"
                                : "Unavailable"}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOption && (
                  <p className="text-xs text-secondary-600">
                    Selected LC has {formatQuantity(selectedOption.remainingQuantity)} remaining out of {" "}
                    {formatQuantity(selectedOption.totalQuantity)} total.
                  </p>
                )}
              </div>
              <Button
                type="button"
                className="sm:w-auto"
                onClick={handleAttach}
                disabled={isAttachDisabled}
              >
                {attachMutation.isPending ? "Linking..." : "Add to Contract"}
              </Button>
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load available LCs</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Something went wrong. Please try again."}
              </AlertDescription>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => refetch()} size="sm">
                  Retry
                </Button>
              </div>
            </Alert>
          )}

          {isLoading ? (
            <div className="py-16 text-center text-secondary-600">Loading available LCs…</div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-secondary-600">
                {total === 0
                  ? "No available LCs match the selected criteria."
                  : `${total.toLocaleString()} LCs match the selected criteria.`}
              </div>
              <div className="overflow-x-auto rounded-lg border border-secondary-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LC No</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Used Qty</TableHead>
                      <TableHead>Remaining Qty</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Linked Contract</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => {
                        const expiryTime = item.expiryDate ? new Date(item.expiryDate).getTime() : Number.NaN;
                        const expired = Number.isFinite(expiryTime) && expiryTime < Date.now();
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.lcNumber}</TableCell>
                            <TableCell>{item.supplier ?? "—"}</TableCell>
                            <TableCell>{item.product ?? "—"}</TableCell>
                            <TableCell>{formatQuantity(item.totalQuantity)}</TableCell>
                            <TableCell>{formatQuantity(item.usedQuantity)}</TableCell>
                            <TableCell className={item.remainingQuantity <= 0 ? "text-red-600 font-medium" : ""}>
                              {formatQuantity(item.remainingQuantity)}
                            </TableCell>
                            <TableCell className={expired ? "text-red-600 font-medium" : ""}>
                              {formatLcDate(item.expiryDate)}
                            </TableCell>
                            <TableCell className={!item.isSelectable ? "text-amber-700" : ""}>
                              {item.status ?? "—"}
                            </TableCell>
                            <TableCell className={item.contractId && (!contractId || item.contractId !== contractId)
                              ? "text-red-600"
                              : ""}
                            >
                              {item.contractId ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-secondary-600">
                          No available LCs for the selected cargo type.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
