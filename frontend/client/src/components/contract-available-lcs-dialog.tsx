import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ContractReference {
  id: string | number;
  publicId?: string | null;
  code?: string | null;
  title?: string | null;
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
}

interface AvailableLcsResponse {
  items: AvailableLcItem[];
  page: number;
  pageSize: number;
  total: number;
}

const formatQuantity = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setPage(1);
      setPageSize(10);
      setSearchInput("");
      setAppliedSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [contract?.id, open]);

  const queryKey = useMemo(
    () => [
      "/api/contracts",
      contract?.id ?? "placeholder",
      "available-lcs",
      {
        page,
        pageSize,
        search: appliedSearch || undefined,
      },
    ] as const,
    [contract?.id, page, pageSize, appliedSearch],
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<AvailableLcsResponse>({
    queryKey,
    enabled: open && Boolean(contract?.id),
    keepPreviousData: true,
  });

  useEffect(() => {
    if (data?.page && data.page !== page) {
      setPage(data.page);
    }
  }, [data?.page, page]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPageSize = data?.pageSize ?? pageSize;
  const currentPage = data?.page ?? page;
  const totalPages = total > 0 ? Math.ceil(total / currentPageSize) : 1;
  const displayTotalPages = total === 0 ? 1 : totalPages;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(rangeStart + items.length - 1, total);

  const contractLabel = contract?.publicId
    ?? contract?.code
    ?? contract?.title
    ?? "selected";

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Available LCs for Contract {contractLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by LC No"
              />
              <Button type="submit" disabled={isFetching}>
                Search
              </Button>
              {(searchInput.length > 0 || appliedSearch.length > 0) && (
                <Button type="button" variant="ghost" onClick={handleClearSearch} disabled={isFetching}>
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-600">Page size</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  const nextSize = Number(value);
                  setPageSize(nextSize);
                  setPage(1);
                }}
                disabled={isFetching}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length > 0 ? (
                      items.map((item) => {
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
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-secondary-600">
                          No available LCs for this contract.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-secondary-600">
                  {total === 0
                    ? "No results"
                    : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={isFetching || currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-secondary-600">
                    Page {currentPage} of {displayTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={isFetching || total === 0 || currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
