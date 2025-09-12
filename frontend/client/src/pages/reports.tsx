import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  BarChart3,
  Calendar,
  FileText,
  MapPin,
  Package,
  Ship,
  TrendingUp,
  University,
} from "lucide-react";
import {
  addMonths,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";

// ---------- Types ----------
interface LetterOfCredit {
  id: string | number;
  lcNumber?: string;
  amount?: number; // monetary amount
  quantity?: number; // fallback if data uses quantity instead
  currency?: string;
  status?: string;
  expiryDate?: string; // ISO
  issuingBank?: string;
  vesselIds?: Array<string | number>;
}

interface Contract {
  id: string | number;
  requestId?: string | number;
  supplierName?: string;
  quantity?: number; // tons
  startDate?: string; // ISO
  endDate?: string; // ISO
  status?: string;
  cargoType?: string;
}

interface Vessel {
  id: string | number;
  contractId?: string | number;
  portOfDischarge?: string;
  cargoType?: string;
  quantity?: number; // planned tons
  quantityUnloaded?: string | number; // actual tons (may be string from API)
}

interface Need {
  id: string | number;
  category?: string;
  requiredQuantity?: number;
  createdAt?: string; // ISO
}

interface Shipment {
  id: string | number;
  vesselId?: string | number;
  dischargeEndDate?: string; // ISO
  quantityUnloaded?: number; // tons
}

// ---------- Helpers ----------
const asNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

export default function Reports() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // ---- Filters ----
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("");
  const [selectedPortFilter, setSelectedPortFilter] = useState("");
  const [selectedLCFilter, setSelectedLCFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ---- Data ----
  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery<LetterOfCredit[]>({
    queryKey: ["/api/letters-of-credit"],
    enabled: isAuthenticated,
    queryFn: () => fetcher<LetterOfCredit[]>("/api/letters-of-credit"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
    queryFn: () => fetcher<Contract[]>("/api/contracts"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vessels = [], isLoading: vesselsLoading } = useQuery<Vessel[]>({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
    queryFn: () => fetcher<Vessel[]>("/api/vessels"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: needs = [], isLoading: needsLoading } = useQuery<Need[]>({
    queryKey: ["/api/needs"],
    enabled: isAuthenticated,
    queryFn: () => fetcher<Need[]>("/api/needs"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments"],
    enabled: isAuthenticated,
    queryFn: () => fetcher<Shipment[]>("/api/shipments"),
    staleTime: 5 * 60 * 1000,
  });

  const isDataLoading =
    lcsLoading || contractsLoading || vesselsLoading || needsLoading || shipmentsLoading;

  // ---- Derived filter values ----
  const from = fromDate ? parseISO(fromDate) : null;
  const to = toDate ? parseISO(toDate) : null;

  const selectedLC = useMemo(() => {
    if (!selectedLCFilter || selectedLCFilter === "__ALL__") return null;
    return lettersOfCredit.find((lc) => String(lc.id) === selectedLCFilter) ?? null;
  }, [lettersOfCredit, selectedLCFilter]);

  // Filtered Vessels based on port/date/LC
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      if (selectedPortFilter && selectedPortFilter !== "__ALL__" && v.portOfDischarge !== selectedPortFilter) return false;
      if (selectedLC && !(selectedLC.vesselIds || []).map(String).includes(String(v.id))) return false;
      return true;
    });
  }, [vessels, selectedPortFilter, selectedLC]);

  // Filtered Contracts based on supplier/date
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (selectedSupplierFilter && selectedSupplierFilter !== "__ALL__" && c.supplierName !== selectedSupplierFilter) return false;
      // Date range applies if a contract intersects the window
      if (from || to) {
        const start = c.startDate ? parseISO(c.startDate) : null;
        const end = c.endDate ? parseISO(c.endDate) : null;
        const within = (
          (!from || (end ? end >= from : true)) &&
          (!to || (start ? start <= to : true))
        );
        if (!within) return false;
      }
      return true;
    });
  }, [contracts, selectedSupplierFilter, from, to]);

  // ---------- LC Analytics ----------
  const lcAnalytics = useMemo(() => {
    return lettersOfCredit
      .filter((lc) => (selectedLC ? lc.id === selectedLC.id : true))
      .map((lc) => {
        const allocatedVessels = filteredVessels.filter((v) =>
          (lc.vesselIds || []).map(String).includes(String(v.id))
        );
        const allocatedAmount = allocatedVessels.reduce(
          (sum, v) => sum + asNumber(v.quantity, 0),
          0
        );
        const totalAmount = asNumber(lc.amount ?? lc.quantity, 0);
        const remainingAmount = Math.max(0, totalAmount - allocatedAmount);
        return {
          id: lc.id,
          lcNumber: lc.lcNumber || `LC-${lc.id}`,
          totalAmount,
          allocatedAmount,
          remainingAmount,
          currency: lc.currency || "USD",
          status: lc.status,
          expiryDate: lc.expiryDate,
          issuingBank: lc.issuingBank,
        };
      });
  }, [lettersOfCredit, filteredVessels, selectedLC]);

  // ---------- Contract Analytics ----------
  const contractAnalytics = useMemo(() => {
    return filteredContracts.map((contract) => {
      const contractVessels = filteredVessels.filter(
        (v) => v.contractId === contract.id
      );
      const allocatedAmount = contractVessels.reduce(
        (sum, v) => sum + asNumber(v.quantity, 0),
        0
      );
      const totalAmount = asNumber(contract.quantity, 0);
      const remainingAmount = Math.max(0, totalAmount - allocatedAmount);
      return {
        id: contract.id,
        requestId: contract.requestId,
        supplierName: contract.supplierName ?? "Unknown Supplier",
        totalAmount,
        allocatedAmount,
        remainingAmount,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: contract.status,
        cargoType: contract.cargoType,
      };
    });
  }, [filteredContracts, filteredVessels]);

  // ---------- Supplier Analytics ----------
  const supplierAnalytics = useMemo(() => {
    const supplierMap = new Map<string, { contracted: number; received: number; cargoTypes: Set<string> }>();

    filteredContracts.forEach((c) => {
      const supplier = c.supplierName || "Unknown Supplier";
      const entry = supplierMap.get(supplier) || { contracted: 0, received: 0, cargoTypes: new Set() };
      entry.contracted += asNumber(c.quantity, 0);
      if (c.cargoType) entry.cargoTypes.add(c.cargoType);
      supplierMap.set(supplier, entry);
    });

    filteredVessels.forEach((v) => {
      if (!v.contractId) return;
      const parent = contracts.find((c) => c.id === v.contractId);
      const supplier = parent?.supplierName || "Unknown Supplier";
      const entry = supplierMap.get(supplier) || { contracted: 0, received: 0, cargoTypes: new Set() };
      entry.received += asNumber(v.quantityUnloaded, 0);
      supplierMap.set(supplier, entry);
    });

    return Array.from(supplierMap.entries()).map(([supplier, data]) => ({
      supplier,
      contracted: data.contracted,
      received: data.received,
      remaining: Math.max(0, data.contracted - data.received),
      fulfillmentRate: data.contracted > 0 ? (data.received / data.contracted) * 100 : 0,
      cargoTypes: Array.from(data.cargoTypes).join(", ") || "N/A",
    }));
  }, [filteredContracts, filteredVessels, contracts]);

  const filteredSupplierAnalytics = useMemo(() => {
    if (!selectedSupplierFilter || selectedSupplierFilter === "__ALL__") return supplierAnalytics;
    return supplierAnalytics.filter((s) => s.supplier === selectedSupplierFilter);
  }, [supplierAnalytics, selectedSupplierFilter]);

  // ---------- Port Analytics ----------
  const portAnalytics = useMemo(() => {
    const map = new Map<string, { needed: number; received: number; units: string }>();
    filteredVessels.forEach((v) => {
      const port = v.portOfDischarge || "Unknown Port";
      const entry = map.get(port) || { needed: 0, received: 0, units: "tons" };
      entry.needed += asNumber(v.quantity, 0);
      entry.received += asNumber(v.quantityUnloaded, 0);
      map.set(port, entry);
    });
    return Array.from(map.entries()).map(([port, d]) => ({
      port,
      needed: d.needed,
      received: d.received,
      remaining: Math.max(0, d.needed - d.received),
      completionRate: d.needed > 0 ? (d.received / d.needed) * 100 : 0,
      units: d.units,
    }));
  }, [filteredVessels]);

  // ---------- Monthly Trends (respects date filter) ----------
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, "MMM yyyy");

      const monthlyNeeds = needs.filter((n) => {
        if (!n.createdAt) return false;
        const d = parseISO(n.createdAt);
        return d >= monthStart && d <= monthEnd && (!from || d >= from) && (!to || d <= to);
      });

      const monthlyShipments = shipments.filter((s) => {
        if (!s.dischargeEndDate) return false;
        const d = parseISO(s.dischargeEndDate);
        return d >= monthStart && d <= monthEnd && (!from || d >= from) && (!to || d <= to);
      });

      const cat: Record<string, { needed: number; received: number }> = {};

      monthlyNeeds.forEach((n) => {
        const key = n.category || "Other";
        if (!cat[key]) cat[key] = { needed: 0, received: 0 };
        cat[key].needed += asNumber(n.requiredQuantity, 0);
      });

      monthlyShipments.forEach((s) => {
        const v = filteredVessels.find((vv) => vv.id === s.vesselId);
        const key = v?.cargoType || "Other";
        if (!cat[key]) cat[key] = { needed: 0, received: 0 };
        cat[key].received += asNumber(s.quantityUnloaded, 0);
      });

      return {
        month: monthLabel,
        date: month,
        totalNeeded: Object.values(cat).reduce((a, c) => a + c.needed, 0),
        totalReceived: Object.values(cat).reduce((a, c) => a + c.received, 0),
        ...cat,
      } as any;
    });
  }, [needs, shipments, filteredVessels, from, to]);

  // ---------- 3-Month Forecast (simple heuristic) ----------
  const forecastData = useMemo(() => {
    const futureMonths = eachMonthOfInterval({
      start: addMonths(new Date(), 1),
      end: addMonths(new Date(), 3),
    });

    return futureMonths.map((m) => {
      const label = format(m, "MMM yyyy");
      const expectedContractQuantity = filteredContracts
        .filter((c) => {
          const end = c.endDate ? parseISO(c.endDate) : null;
          return end && end >= startOfMonth(m) && end <= endOfMonth(m);
        })
        .reduce((sum, c) => sum + asNumber(c.quantity, 0), 0);

      return { month: label, expectedContractQuantity };
    });
  }, [filteredContracts]);

  // ---------- Options for filters ----------
  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(contracts.map((c) => c.supplierName).filter(Boolean)))
      .sort() as string[];
  }, [contracts]);

  const uniquePorts = useMemo(() => {
    return Array.from(new Set(vessels.map((v) => v.portOfDischarge).filter(Boolean)))
      .sort() as string[];
  }, [vessels]);

  const uniqueLCs = useMemo(() => {
    return lettersOfCredit.map((lc) => ({ id: lc.id, number: lc.lcNumber || `LC-${lc.id}` }));
  }, [lettersOfCredit]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!isAuthenticated) return null;

  const totalLCValue = lcAnalytics.reduce((s, lc) => s + lc.totalAmount, 0);
  const dischargedTotal = filteredVessels.reduce(
    (acc, v) => acc + asNumber(v.quantityUnloaded, 0),
    0
  );
  const dischargedCount = filteredVessels.filter((v) => asNumber(v.quantityUnloaded, 0) > 0).length;
  const avgContractCompletion = contractAnalytics.length
    ? Math.round(
        contractAnalytics.reduce((sum, c) => {
          const rate = c.totalAmount > 0 ? (c.allocatedAmount / c.totalAmount) * 100 : 0;
          return sum + Math.min(rate, 100);
        }, 0) / contractAnalytics.length
      )
    : 0;

  return (
    <MainLayout title="Reports & Analytics" subtitle="Comprehensive import workflow analytics and forecasting">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Import Analytics Dashboard</h1>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplier-filter">Supplier</Label>
                  <Select value={selectedSupplierFilter} onValueChange={setSelectedSupplierFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All Suppliers</SelectItem>
                      {uniqueSuppliers.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From */}
                <div className="space-y-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>

                {/* To */}
                <div className="space-y-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>

                {/* Port */}
                <div className="space-y-2">
                  <Label htmlFor="port-filter">Port</Label>
                  <Select value={selectedPortFilter} onValueChange={setSelectedPortFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All ports" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All Ports</SelectItem>
                      {uniquePorts.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* LC */}
                <div className="space-y-2">
                  <Label htmlFor="lc-filter">Letter of Credit</Label>
                  <Select value={selectedLCFilter} onValueChange={setSelectedLCFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All LCs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All LCs</SelectItem>
                      {uniqueLCs.map((lc) => (
                        <SelectItem key={String(lc.id)} value={String(lc.id)}>
                          {lc.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => { setSelectedSupplierFilter(""); setSelectedPortFilter(""); setSelectedLCFilter(""); setFromDate(""); setToDate(""); }}>Reset</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total LCs</CardTitle>
              <University className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lcAnalytics.length}</div>
              <p className="text-xs text-muted-foreground">
                {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalLCValue)} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractAnalytics.length}</div>
              <p className="text-xs text-muted-foreground">
                {contractAnalytics.reduce((s, c) => s + c.totalAmount, 0).toLocaleString()} tons total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discharged Quantity</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dischargedTotal.toLocaleString()} tons</div>
              <p className="text-xs text-muted-foreground">From {dischargedCount} discharged vessels</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgContractCompletion}%</div>
              <p className="text-xs text-muted-foreground">Average across all contracts</p>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Supplier Performance Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading supplier data...</div>
            ) : filteredSupplierAnalytics.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Cargo Types</TableHead>
                      <TableHead>Total Contracted</TableHead>
                      <TableHead>Total Received</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Fulfillment Rate</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSupplierAnalytics.map((s) => (
                      <TableRow key={s.supplier}>
                        <TableCell className="font-medium">{s.supplier}</TableCell>
                        <TableCell>
                          <div className="max-w-40">
                            {s.cargoTypes.split(", ").map((t, i) => (
                              <Badge key={i} variant="outline" className="mr-1 mb-1">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-blue-600 font-semibold">{s.contracted.toLocaleString()} tons</TableCell>
                        <TableCell className="text-green-600 font-semibold">{s.received.toLocaleString()} tons</TableCell>
                        <TableCell className="text-orange-600">{s.remaining.toLocaleString()} tons</TableCell>
                        <TableCell>
                          <Badge variant={s.fulfillmentRate >= 100 ? "default" : s.fulfillmentRate >= 75 ? "secondary" : "destructive"}>
                            {s.fulfillmentRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={Math.min(s.fulfillmentRate, 100)} className="w-20" />
                            <span className="text-sm text-muted-foreground">
                              {s.fulfillmentRate >= 100 ? "Complete" : s.fulfillmentRate >= 50 ? "In Progress" : "Behind"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedSupplierFilter ? `No data found for supplier: ${selectedSupplierFilter}` : "No supplier data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* LC Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <University className="h-5 w-5" />
              <span>Letters of Credit Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading LC data...</div>
            ) : lcAnalytics.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LC Number</TableHead>
                      <TableHead>Issuing Bank</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Allocated Amount</TableHead>
                      <TableHead>Remaining Amount</TableHead>
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lcAnalytics.map((lc) => {
                      const utilizationRate = lc.totalAmount > 0 ? (lc.allocatedAmount / lc.totalAmount) * 100 : 0;
                      return (
                        <TableRow
                          key={String(lc.id)}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setLocation(`/lc/${lc.id}`)}
                        >
                          <TableCell className="font-medium text-blue-600">{lc.lcNumber}</TableCell>
                          <TableCell>{lc.issuingBank || "N/A"}</TableCell>
                          <TableCell>
                            {new Intl.NumberFormat(undefined, { style: "currency", currency: lc.currency ?? "USD", maximumFractionDigits: 0 }).format(lc.totalAmount)}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {new Intl.NumberFormat(undefined, { style: "currency", currency: lc.currency ?? "USD", maximumFractionDigits: 0 }).format(lc.allocatedAmount)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {new Intl.NumberFormat(undefined, { style: "currency", currency: lc.currency ?? "USD", maximumFractionDigits: 0 }).format(lc.remainingAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={utilizationRate} className="w-16" />
                              <span className="text-sm">{utilizationRate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No Letters of Credit found</div>
            )}
          </CardContent>
        </Card>

        {/* Contract Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Contract Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading contract data...</div>
            ) : contractAnalytics.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Cargo Type</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Allocated Amount</TableHead>
                      <TableHead>Remaining Amount</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractAnalytics.map((c) => {
                      const progressRate = c.totalAmount > 0 ? (c.allocatedAmount / c.totalAmount) * 100 : 0;
                      return (
                        <TableRow
                          key={String(c.id)}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setLocation(`/contract/${c.id}`)}
                        >
                          <TableCell className="font-medium text-blue-600">{`CON-${String(c.id).padStart(3, "0")}`}</TableCell>
                          <TableCell>{c.supplierName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.cargoType}</Badge>
                          </TableCell>
                          <TableCell>{c.totalAmount.toLocaleString()} tons</TableCell>
                          <TableCell className="text-blue-600">{c.allocatedAmount.toLocaleString()} tons</TableCell>
                          <TableCell className="text-green-600">{c.remainingAmount.toLocaleString()} tons</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={progressRate} className="w-16" />
                              <span className="text-sm">{progressRate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === "approved" ? "default" : "secondary"}>{c.status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No contracts found</div>
            )}
          </CardContent>
        </Card>

        {/* Port Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Port Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading port data...</div>
            ) : portAnalytics.length ? (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Port</TableHead>
                        <TableHead>Total Needed</TableHead>
                        <TableHead>Actual Received</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Completion Rate</TableHead>
                        <TableHead>Visual Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portAnalytics.map((p) => (
                        <TableRow key={p.port}>
                          <TableCell className="font-medium">{p.port}</TableCell>
                          <TableCell>{p.needed.toLocaleString()} {p.units}</TableCell>
                          <TableCell className="text-blue-600">{p.received.toLocaleString()} {p.units}</TableCell>
                          <TableCell className="text-orange-600">{p.remaining.toLocaleString()} {p.units}</TableCell>
                          <TableCell>{p.completionRate.toFixed(1)}%</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={p.completionRate} className="w-20" />
                              <Badge variant={p.completionRate >= 100 ? "default" : p.completionRate >= 50 ? "secondary" : "destructive"}>
                                {p.completionRate >= 100 ? "Complete" : p.completionRate >= 50 ? "In Progress" : "Pending"}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={portAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="port" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="needed" name="Needed" />
                      <Bar dataKey="received" name="Received" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No port data available</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Monthly Category Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading trend data...</div>
            ) : monthlyTrends.length ? (
              <div className="space-y-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="totalNeeded" stackId="1" name="Total Needed" />
                      <Area type="monotone" dataKey="totalReceived" stackId="2" name="Total Received" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Total Needed</TableHead>
                        <TableHead>Total Received</TableHead>
                        <TableHead>Gap</TableHead>
                        <TableHead>Fill Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyTrends.map((t: any) => {
                        const gap = t.totalNeeded - t.totalReceived;
                        const fillRate = t.totalNeeded > 0 ? (t.totalReceived / t.totalNeeded) * 100 : 0;
                        return (
                          <TableRow key={t.month}>
                            <TableCell className="font-medium">{t.month}</TableCell>
                            <TableCell>{t.totalNeeded.toLocaleString()}</TableCell>
                            <TableCell className="text-blue-600">{t.totalReceived.toLocaleString()}</TableCell>
                            <TableCell className={gap > 0 ? "text-red-600" : "text-green-600"}>{Math.abs(gap).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={fillRate} className="w-16" />
                                <span className="text-sm">{fillRate.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No trend data available</div>
            )}
          </CardContent>
        </Card>

        {/* Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>3-Month Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading forecast data...</div>
            ) : forecastData.length ? (
              <div className="space-y-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="expectedContractQuantity" name="Expected Contract Quantity" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Expected Contract Quantity (tons)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecastData.map((f) => (
                        <TableRow key={f.month}>
                          <TableCell className="font-medium">{f.month}</TableCell>
                          <TableCell className="text-blue-600 font-semibold">{f.expectedContractQuantity.toLocaleString()} tons</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No forecast data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
