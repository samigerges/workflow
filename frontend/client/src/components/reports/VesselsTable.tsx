import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { COUNTRIES } from "@/lib/constants";
import type { VesselWithContract, DateRange } from "@/lib/schemas";
import { SUPPLIER_FILTER_SEPARATOR } from "@/types/reports";

interface VesselsTableProps {
  vesselsWithContractInfo: VesselWithContract[];
  selectedSupplierValue: string | null;
  selectedSupplierLabel: string | null;
  selectedCountry: string | null;
  dateRange: DateRange;
  onSupplierSelect: (supplier: string | null) => void;
  onCountrySelect: (country: string | null) => void;
  onClearFilters: () => void;
  totalVesselsCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  nominated: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  default: "bg-gray-100 text-gray-800"
};

export function VesselsTable({
  vesselsWithContractInfo,
  selectedSupplierValue,
  selectedSupplierLabel,
  selectedCountry,
  dateRange,
  onSupplierSelect,
  onCountrySelect,
  onClearFilters,
  totalVesselsCount,
}: VesselsTableProps) {
  const [, navigate] = useLocation();

  const buildSupplierFilterValue = (vessel: VesselWithContract): string | null => {
    const contractId = vessel.contractReportId ?? null;
    const supplierKey = vessel.supplierName?.trim().toLowerCase() || null;

    if (!contractId || !supplierKey) {
      return null;
    }

    return `${contractId}${SUPPLIER_FILTER_SEPARATOR}${supplierKey}`;
  };

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status] || STATUS_COLORS.default;
    return (
      <Badge variant="outline" className={`${colorClass} border-0`}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="bg-white border border-secondary-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-bold text-secondary-900">
              Vessels Overview
              {(selectedSupplierLabel || selectedCountry) && (
                <span className="text-blue-600 font-normal">
                  {selectedSupplierLabel && ` - Supplier: ${selectedSupplierLabel}`}
                  {selectedCountry && ` - Country: ${selectedCountry}`}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-secondary-600">
              {(selectedSupplierLabel || selectedCountry || dateRange.from || dateRange.to) ?
                `Showing ${vesselsWithContractInfo.length} filtered vessels` :
                `All ${totalVesselsCount} vessels`}
              {(dateRange.from || dateRange.to) && (
                <span className="block text-xs text-blue-600">
                  Date filtered: {dateRange.from && `From ${dateRange.from}`} {dateRange.to && `To ${dateRange.to}`}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Select 
              value={selectedCountry || "all"} 
              onValueChange={(value) => onCountrySelect(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(selectedSupplierLabel || selectedCountry) && (
              <Button variant="outline" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel Name</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Cargo Type</TableHead>
                <TableHead>Country of Origin</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Discharge Port</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vesselsWithContractInfo.map((vessel) => {
                const supplierFilterValue = buildSupplierFilterValue(vessel);
                const isSelected =
                  supplierFilterValue != null && supplierFilterValue === selectedSupplierValue;

                return (
                  <TableRow
                    key={vessel.id}
                    className={isSelected ? 'bg-blue-50' : ''}
                  >
                    <TableCell className="font-medium">{vessel.vesselName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`cursor-pointer ${isSelected ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                        onClick={() => {
                          if (supplierFilterValue) {
                            onSupplierSelect(supplierFilterValue);
                          }
                        }}
                      >
                      {vessel.supplierName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vessel.contractReportId ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-secondary-900">
                          {vessel.contractPublicId ?? `Contract ${vessel.contractReportId.slice(0, 8)}…`}
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0 justify-start"
                          onClick={() => navigate(`/reports/contracts/${vessel.contractReportId}`)}
                        >
                          View journey
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-secondary-500">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{vessel.cargoType}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`cursor-pointer ${vessel.countryOfOrigin === selectedCountry ? 'bg-green-100 text-green-800 border-green-300' : ''}`}
                      onClick={() => onCountrySelect(vessel.countryOfOrigin || null)}
                    >
                      {vessel.countryOfOrigin || 'Not specified'}
                    </Badge>
                  </TableCell>
                  <TableCell>{vessel.quantity?.toLocaleString()} tons</TableCell>
                  <TableCell>{vessel.portOfDischarge || 'Not specified'}</TableCell>
                  <TableCell>{formatDate(vessel.eta || '')}</TableCell>
                  <TableCell>{getStatusBadge(vessel.status || 'pending')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {vesselsWithContractInfo.length === 0 && (
            <div className="text-center py-8">
              <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedSupplierLabel ? `No vessels found for ${selectedSupplierLabel}` : 'No vessels found'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}