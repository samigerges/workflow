import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Ship, TrendingUp, Users, Filter, Calendar, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/constants";
// Define status colors for vessel status badges
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  nominated: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  default: "bg-gray-100 text-gray-800"
};



export default function Reports() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Fetch data
  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  const { data: vessels = [] } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["/api/requests"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Helper function to filter data by date range
  const filterByDateRange = (data: any[], dateField: string) => {
    if (!dateRange.from && !dateRange.to) return data;
    
    return data.filter((item: any) => {
      const itemDate = new Date(item[dateField]);
      const fromDate = dateRange.from ? new Date(dateRange.from) : null;
      const toDate = dateRange.to ? new Date(dateRange.to) : null;
      
      if (fromDate && toDate) {
        return itemDate >= fromDate && itemDate <= toDate;
      } else if (fromDate) {
        return itemDate >= fromDate;
      } else if (toDate) {
        return itemDate <= toDate;
      }
      return true;
    });
  };

  // Apply date filtering to contracts and vessels
  const filteredContracts = filterByDateRange(contracts as any[], 'createdAt');
  const filteredVesselsForDateRange = filterByDateRange(vessels as any[], 'createdAt');

  // Process suppliers data for chart using filtered contracts
  const suppliersData = filteredContracts.reduce((acc: any[], contract: any) => {
    const supplierName = contract.supplierName || 'Unknown Supplier';
    const existing = acc.find(item => item.supplier === supplierName);
    
    if (existing) {
      existing.contracts += 1;
      existing.quantity += contract.quantity || 0;
      existing.vessels += filteredVesselsForDateRange.filter((v: any) => v.contractId === contract.id).length;
    } else {
      acc.push({
        supplier: supplierName,
        vessels: filteredVesselsForDateRange.filter((v: any) => v.contractId === contract.id).length,
        quantity: contract.quantity || 0,
        contracts: 1
      });
    }
    
    return acc;
  }, []);

  // Get supplier-specific data when a supplier is selected
  const selectedSupplierData = selectedSupplier 
    ? suppliersData.find(s => s.supplier === selectedSupplier) 
    : null;

  // Calculate quantity metrics
  const calculateQuantityMetrics = (contracts: any[], vessels: any[]) => {
    const totalContracted = contracts.reduce((sum: number, contract: any) => sum + (contract.quantity || 0), 0);
    
    // Calculate arrived quantity from discharged vessel quantities
    const arrivedQuantity = vessels.reduce((sum: number, vessel: any) => {
      return sum + (vessel.dischargedQuantity || 0);
    }, 0);
    
    const remainingQuantity = totalContracted - arrivedQuantity;
    
    return {
      totalContracted,
      arrivedQuantity,
      remainingQuantity
    };
  };

  // Get metrics for selected supplier or all
  const relevantContracts = selectedSupplier 
    ? filteredContracts.filter((c: any) => c.supplierName === selectedSupplier)
    : filteredContracts;

  const relevantVessels = selectedSupplier
    ? filteredVesselsForDateRange.filter((vessel: any) => {
        const contract = filteredContracts.find((c: any) => c.id === vessel.contractId);
        return contract?.supplierName === selectedSupplier;
      })
    : filteredVesselsForDateRange;

  const quantityMetrics = calculateQuantityMetrics(relevantContracts, relevantVessels);

  // Calculate totals (either for selected supplier or all)
  const displayTotals = {
    totalSuppliers: selectedSupplierData ? 1 : suppliersData.length,
    totalVessels: selectedSupplierData ? selectedSupplierData.vessels : filteredVesselsForDateRange.length,
    totalContracts: selectedSupplierData ? selectedSupplierData.contracts : filteredContracts.length,
    totalContracted: quantityMetrics.totalContracted || 0,
    arrivedQuantity: quantityMetrics.arrivedQuantity || 0,
    remainingQuantity: quantityMetrics.remainingQuantity || 0
  };

  // Filter vessels by selected supplier, country, and date range
  const filteredVessels = filteredVesselsForDateRange.filter((vessel: any) => {
    const contract = filteredContracts.find((c: any) => c.id === vessel.contractId);
    
    const supplierMatch = selectedSupplier ? contract?.supplierName === selectedSupplier : true;
    const countryMatch = selectedCountry ? vessel.countryOfOrigin === selectedCountry : true;
    
    return supplierMatch && countryMatch;
  });

  // Get unique suppliers for the dropdown
  const availableSuppliers = Array.from(new Set(filteredContracts.map((c: any) => c.supplierName).filter(Boolean)));

  // Prepare vessels data with contract information
  const vesselsWithContractInfo = filteredVessels.map((vessel: any) => {
    const contract = filteredContracts.find((c: any) => c.id === vessel.contractId);
    return {
      ...vessel,
      supplierName: contract?.supplierName || 'Unknown',
      contractQuantity: contract?.quantity || 0,
    };
  });

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
    <MainLayout title="Reports" subtitle="Comprehensive reports and analytics with date filtering">
      <div className="p-6 space-y-6">
        {/* Filters Section */}
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
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Filter by Supplier</Label>
                <Select value={selectedSupplier || "all"} onValueChange={(value) => setSelectedSupplier(value === "all" ? null : value)}>
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
                  onClick={() => {
                    setDateRange({ from: "", to: "" });
                    setSelectedSupplier(null);
                    setSelectedCountry(null);
                  }}
                  disabled={!dateRange.from && !dateRange.to && !selectedSupplier && !selectedCountry}
                >
                  Clear All
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className={`bg-white border ${selectedSupplier ? 'border-blue-200 bg-blue-50/30' : 'border-secondary-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Contracted</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {displayTotals.totalContracted.toLocaleString()} tons
                    </p>
                    {selectedSupplier && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        for {selectedSupplier}
                      </p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${selectedSupplier ? 'bg-blue-200' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                    <Package className={`${selectedSupplier ? 'text-blue-700' : 'text-blue-600'}`} size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-white border ${selectedSupplier ? 'border-green-200 bg-green-50/30' : 'border-secondary-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Quantity Discharged</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {displayTotals.arrivedQuantity.toLocaleString()} tons
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {displayTotals.totalContracted > 0 ? 
                        `${((displayTotals.arrivedQuantity / displayTotals.totalContracted) * 100).toFixed(1)}% discharged` : 
                        'No contracts yet'
                      }
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${selectedSupplier ? 'bg-green-200' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                    <Ship className={`${selectedSupplier ? 'text-green-700' : 'text-green-600'}`} size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-white border ${selectedSupplier ? 'border-orange-200 bg-orange-50/30' : 'border-secondary-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Remaining to Arrive</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {displayTotals.remainingQuantity.toLocaleString()} tons
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      {displayTotals.totalContracted > 0 ? 
                        `${((displayTotals.remainingQuantity / displayTotals.totalContracted) * 100).toFixed(1)}% pending` : 
                        'No pending deliveries'
                      }
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${selectedSupplier ? 'bg-orange-200' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                    <TrendingUp className={`${selectedSupplier ? 'text-orange-700' : 'text-orange-600'}`} size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-white border ${selectedSupplier ? 'border-purple-200 bg-purple-50/30' : 'border-secondary-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">
                      {selectedSupplier ? 'Active Vessels' : 'Total Suppliers'}
                    </p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {selectedSupplier ? displayTotals.totalVessels : displayTotals.totalSuppliers}
                    </p>
                    {selectedSupplier ? (
                      <p className="text-xs text-purple-600 mt-1">
                        vessels in operation
                      </p>
                    ) : (
                      <p className="text-xs text-purple-600 mt-1">
                        active suppliers
                      </p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${selectedSupplier ? 'bg-purple-200' : 'bg-purple-100'} rounded-lg flex items-center justify-center`}>
                    {selectedSupplier ? (
                      <Ship className={`${selectedSupplier ? 'text-purple-700' : 'text-purple-600'}`} size={20} />
                    ) : (
                      <Users className={`${selectedSupplier ? 'text-purple-700' : 'text-purple-600'}`} size={20} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Vessels Table */}
          <Card className="bg-white border border-secondary-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold text-secondary-900">
                    Vessels Overview
                    {(selectedSupplier || selectedCountry) && (
                      <span className="text-blue-600 font-normal">
                        {selectedSupplier && ` - Supplier: ${selectedSupplier}`}
                        {selectedCountry && ` - Country: ${selectedCountry}`}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-secondary-600">
                    {(selectedSupplier || selectedCountry || dateRange.from || dateRange.to) ? 
                      `Showing ${filteredVessels.length} filtered vessels` : 
                      `All ${filteredVesselsForDateRange.length} vessels`}
                    {(dateRange.from || dateRange.to) && (
                      <span className="block text-xs text-blue-600">
                        Date filtered: {dateRange.from && `From ${dateRange.from}`} {dateRange.to && `To ${dateRange.to}`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCountry || "all"} onValueChange={(value) => setSelectedCountry(value === "all" ? null : value)}>
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
                  {(selectedSupplier || selectedCountry) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSupplier(null);
                        setSelectedCountry(null);
                      }}
                    >
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
                      <TableHead>Cargo Type</TableHead>
                      <TableHead>Country of Origin</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Discharge Port</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselsWithContractInfo.map((vessel: any) => (
                      <TableRow 
                        key={vessel.id}
                        className={selectedSupplier && vessel.supplierName === selectedSupplier ? 'bg-blue-50' : ''}
                      >
                        <TableCell className="font-medium">{vessel.vesselName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`cursor-pointer ${vessel.supplierName === selectedSupplier ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                            onClick={() => setSelectedSupplier(vessel.supplierName)}
                          >
                            {vessel.supplierName}
                          </Badge>
                        </TableCell>
                        <TableCell>{vessel.cargoType}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`cursor-pointer ${vessel.countryOfOrigin === selectedCountry ? 'bg-green-100 text-green-800 border-green-300' : ''}`}
                            onClick={() => setSelectedCountry(vessel.countryOfOrigin)}
                          >
                            {vessel.countryOfOrigin || 'Not specified'}
                          </Badge>
                        </TableCell>
                        <TableCell>{vessel.quantity?.toLocaleString()} tons</TableCell>
                        <TableCell>{vessel.portOfDischarge || 'Not specified'}</TableCell>
                        <TableCell>{formatDate(vessel.eta)}</TableCell>
                        <TableCell>{getStatusBadge(vessel.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {vesselsWithContractInfo.length === 0 && (
                  <div className="text-center py-8">
                    <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {selectedSupplier ? `No vessels found for ${selectedSupplier}` : 'No vessels found'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
      </div>
    </MainLayout>
  );
}