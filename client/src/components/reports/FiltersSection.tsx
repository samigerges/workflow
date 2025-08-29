import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Download } from "lucide-react";
import type { DateRange } from "@/lib/schemas";

interface FiltersSectionProps {
  dateRange: DateRange;
  selectedSupplier: string | null;
  selectedCountry: string | null;
  availableSuppliers: string[];
  onDateRangeChange: (dateRange: DateRange) => void;
  onSupplierChange: (supplier: string | null) => void;
  onCountryChange: (country: string | null) => void;
  onClearAll: () => void;
  onExport?: () => void;
}

export function FiltersSection({
  dateRange,
  selectedSupplier,
  selectedCountry,
  availableSuppliers,
  onDateRangeChange,
  onSupplierChange,
  onCountryChange,
  onClearAll,
  onExport,
}: FiltersSectionProps) {
  const hasActiveFilters = !!(dateRange.from || dateRange.to || selectedSupplier || selectedCountry);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="from-date">From Date</Label>
            <Input
              id="from-date"
              type="date"
              value={dateRange.from}
              onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-date">To Date</Label>
            <Input
              id="to-date"
              type="date"
              value={dateRange.to}
              onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Filter by Supplier</Label>
            <Select 
              value={selectedSupplier || "all"} 
              onValueChange={(value) => onSupplierChange(value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {availableSuppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClearAll}
              disabled={!hasActiveFilters}
            >
              Clear All
            </Button>
            {onExport && (
              <Button variant="outline" className="flex items-center gap-2" onClick={onExport}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}