import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ComposedChart,
  ReferenceLine,
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
import { normalizeLc, formatLcCurrency } from "@/lib/lc";

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
  publicId?: string;
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
  id: string;
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
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

const CATEGORY_SERIES_LIMIT = 4;
const CATEGORY_COLORS = ["#2563eb", "#f97316", "#16a34a", "#0ea5e9", "#a855f7", "#f43f5e"];
const MONTHLY_TREND_SERIES_LABELS: Record<"needed" | "received", string> = {
  needed: "Needed",
  received: "Received",
};

const createCategoryId = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "category";

const withOpacity = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const [activeTab, setActiveTab] = useState("overview");
  const [monthlyTrendChartType, setMonthlyTrendChartType] = useState<"area" | "bar">(
    "area",
  );
  const [forecastChartType, setForecastChartType] = useState<"line" | "bar">("line");
  const [monthlyTrendSeries, setMonthlyTrendSeries] =
    useState<"needed" | "received">("needed");

  // ---- Data ----
  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery<LetterOfCredit[]>({
    queryKey: ["/api/letters-of-credit"],
    enabled: isAuthenticated,
    queryFn: () => fetcher<LetterOfCredit[]>("/api/letters-of-credit"),
    staleTime: 5 * 60 * 1000,
  });

  const normalizedLcEntries = useMemo(
    () =>
      lettersOfCredit.map((lc) => ({
        raw: lc,
        normalized: normalizeLc(lc),
      })),
    [lettersOfCredit],
  );

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

  const selectedLcEntry = useMemo(() => {
    if (!selectedLCFilter || selectedLCFilter === "__ALL__") return null;
    return (
      normalizedLcEntries.find((entry) => {
        const entryId = entry.raw?.id ?? entry.normalized.id;
        if (entryId === null || entryId === undefined) return false;
        return String(entryId) === selectedLCFilter;
      }) ?? null
    );
  }, [normalizedLcEntries, selectedLCFilter]);

  const selectedLcRaw = selectedLcEntry?.raw ?? null;
  const selectedLcId = selectedLcEntry
    ? (() => {
        const idValue = selectedLcEntry.raw?.id ?? selectedLcEntry.normalized.id;
        return idValue === null || idValue === undefined ? null : String(idValue);
      })()
    : null;

  // Filtered Vessels based on port/date/LC
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      if (selectedPortFilter && selectedPortFilter !== "__ALL__") {
        const vesselPort = v.portOfDischarge?.trim() || "Unknown Port";
        if (vesselPort !== selectedPortFilter) {
          return false;
        }
      }

      if (
        selectedLcRaw &&
        !(selectedLcRaw.vesselIds || []).map(String).includes(String(v.id))
      ) {
        return false;
      }

      return true;
    });
  }, [vessels, selectedPortFilter, selectedLcRaw]);

  // Filtered Contracts based on supplier/date
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (selectedSupplierFilter && selectedSupplierFilter !== "__ALL__") {
        const supplierName = c.supplierName?.trim() || "Unknown Supplier";
        if (supplierName !== selectedSupplierFilter) return false;
      }
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
    return normalizedLcEntries
      .filter(({ raw, normalized }) => {
        if (!selectedLcId) return true;
        const entryId = raw?.id ?? normalized.id;
        if (entryId === null || entryId === undefined) return false;
        return String(entryId) === selectedLcId;
      })
      .map(({ raw, normalized }) => {
        const allocatedVessels = filteredVessels.filter((v) =>
          (raw?.vesselIds || []).map(String).includes(String(v.id)),
        );
        const allocatedQuantity = allocatedVessels.reduce(
          (sum, v) => sum + asNumber(v.quantity, 0),
          0,
        );
        const normalizedQuantity =
          typeof normalized.quantity === "number" && Number.isFinite(normalized.quantity)
            ? normalized.quantity
            : null;
        const fallbackQuantity = asNumber(raw?.quantity, 0);
        const totalQuantity = normalizedQuantity ?? fallbackQuantity;

        const pricePerUnit =
          typeof normalized.pricePerUnit === "number" && Number.isFinite(normalized.pricePerUnit)
            ? normalized.pricePerUnit
            : normalized.amount && totalQuantity > 0
            ? normalized.amount / totalQuantity
            : null;

        const totalPrice =
          normalized.amount ?? (pricePerUnit !== null ? pricePerUnit * totalQuantity : null);

        const remainingQuantity = Math.max(0, totalQuantity - allocatedQuantity);
        return {
          id: normalized.id ?? raw?.id,
          lcNumber: normalized.number,
          totalQuantity,
          allocatedQuantity,
          remainingQuantity,
          totalPrice,
          pricePerUnit,
          currency: normalized.currency ?? "USD",
          status: normalized.status,
          expiryDate: normalized.expiryDate,
          issuingBank: normalized.issuingBank,
        };
      });
  }, [normalizedLcEntries, filteredVessels, selectedLcId]);

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
        publicId: contract.publicId,
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

  const tonnageSeriesNames = ["Needed", "Received", "Remaining"] as const;
  const isTonnageSeries = (name: string) =>
    tonnageSeriesNames.includes(name as (typeof tonnageSeriesNames)[number]);

  const formatTonnageValue = (value: number | string) => {
    const numericValue = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(numericValue)) return value;
    return `${numericValue.toLocaleString()} tons`;
  };

  const formatPercentValue = (value: number | string) => {
    const numericValue = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(numericValue)) return value;
    return `${numericValue.toFixed(1)}%`;
  };

  const portTooltipFormatter = (value: number | string, name: string) => {
    if (isTonnageSeries(name)) {
      return [formatTonnageValue(value), name];
    }
    if (name === "Completion Rate") {
      return [formatPercentValue(value), name];
    }
    return [value, name];
  };

  const portLegendFormatter = (value: string) => {
    if (isTonnageSeries(value)) {
      return `${value} (tons)`;
    }
    if (value === "Completion Rate") {
      return "Completion Rate (%)";
    }
    return value;
  };

  // ---------- Monthly Trends (respects date filter) ----------
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    const categoryTotals = new Map<string, number>();

    const monthlyRaw = months.map((month) => {
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

      const categories = new Map<string, { needed: number; received: number }>();

      monthlyNeeds.forEach((n) => {
        const key = n.category && n.category.trim() ? n.category : "Other";
        const current = categories.get(key) || { needed: 0, received: 0 };
        const needed = asNumber(n.requiredQuantity, 0);
        current.needed += needed;
        categories.set(key, current);
        categoryTotals.set(key, (categoryTotals.get(key) || 0) + needed);
      });

      monthlyShipments.forEach((s) => {
        const v = filteredVessels.find((vv) => vv.id === s.vesselId);
        const key = v?.cargoType && v.cargoType.trim() ? v.cargoType : "Other";
        const current = categories.get(key) || { needed: 0, received: 0 };
        const received = asNumber(s.quantityUnloaded, 0);
        current.received += received;
        categories.set(key, current);
      });

      return { month, monthLabel, categories };
    });

    const rankedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
    const retainedCategories = rankedCategories.slice(0, CATEGORY_SERIES_LIMIT);
    const retainedCategorySet = new Set(retainedCategories);

    return monthlyRaw.map(({ month, monthLabel, categories }) => {
      const neededByCategory: Record<string, number> = {};
      const receivedByCategory: Record<string, number> = {};
      let otherNeeded = 0;
      let otherReceived = 0;

      categories.forEach(({ needed, received }, category) => {
        if (retainedCategorySet.has(category)) {
          neededByCategory[category] = needed;
          receivedByCategory[category] = received;
        } else {
          otherNeeded += needed;
          otherReceived += received;
        }
      });

      if (otherNeeded > 0 || otherReceived > 0) {
        neededByCategory.Other = otherNeeded;
        receivedByCategory.Other = otherReceived;
      }

      const totalNeeded = Object.values(neededByCategory).reduce((sum, value) => sum + value, 0);
      const totalReceived = Object.values(receivedByCategory).reduce((sum, value) => sum + value, 0);

      const dominantCategoryEntry = Object.entries(neededByCategory)
        .sort((a, b) => b[1] - a[1])[0];

      const flattened: Record<string, number> = {};
      Object.entries(neededByCategory).forEach(([category, value]) => {
        const id = createCategoryId(category);
        flattened[`needed::${id}`] = value;
      });
      Object.entries(receivedByCategory).forEach(([category, value]) => {
        const id = createCategoryId(category);
        flattened[`received::${id}`] = value;
      });

      return {
        month: monthLabel,
        date: month,
        totalNeeded,
        totalReceived,
        neededByCategory,
        receivedByCategory,
        dominantCategory: dominantCategoryEntry?.[0] || "—",
        ...flattened,
      };
    });
  }, [needs, shipments, filteredVessels, from, to]);

  const monthlyTrendCategories = useMemo(() => {
    const totals = new Map<string, number>();

    monthlyTrends.forEach((trend) => {
      Object.entries(trend.neededByCategory || {}).forEach(([category, value]) => {
        totals.set(category, (totals.get(category) || 0) + value);
      });
    });

    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    const limited = sorted.slice(0, CATEGORY_SERIES_LIMIT);
    const otherEntry = sorted.find(([category]) => category === "Other");

    if (otherEntry && !limited.some(([category]) => category === "Other")) {
      limited.push(otherEntry);
    }

    return limited.map(([category]) => ({
      id: createCategoryId(category),
      label: category,
    }));
  }, [monthlyTrends]);

  const monthlyTrendCategoryLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    monthlyTrendCategories.forEach(({ id, label }) => {
      lookup.set(id, label);
    });
    return lookup;
  }, [monthlyTrendCategories]);

  const formatMonthlyTrendTooltip = useCallback(
    (rawValue: number | string, dataKey: string) => {
      const [series, id] = dataKey.split("::");
      const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue) || 0;
      const categoryLabel = monthlyTrendCategoryLookup.get(id) || id;
      const resolvedSeries = series === "needed" || series === "received" ? series : monthlyTrendSeries;
      const metricLabel = MONTHLY_TREND_SERIES_LABELS[resolvedSeries];

      return [numericValue.toLocaleString(), `${categoryLabel} (${metricLabel})`];
    },
    [monthlyTrendCategoryLookup, monthlyTrendSeries],
  );

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
    const suppliers = new Set<string>();
    let hasFallback = false;

    contracts.forEach((contract) => {
      const name = contract.supplierName?.trim();
      if (name) {
        suppliers.add(name);
      } else {
        hasFallback = true;
      }
    });

    if (hasFallback) {
      suppliers.add("Unknown Supplier");
    }

    return Array.from(suppliers).sort();
  }, [contracts]);

  const uniquePorts = useMemo(() => {
    const ports = new Set<string>();
    let hasFallback = false;

    vessels.forEach((vessel) => {
      const port = vessel.portOfDischarge?.trim();
      if (port) {
        ports.add(port);
      } else {
        hasFallback = true;
      }
    });

    if (hasFallback) {
      ports.add("Unknown Port");
    }

    return Array.from(ports).sort();
  }, [vessels]);

  const uniqueLCs = useMemo(() => {
    const uniqueById = new Map<string, { id: string | number; number: string }>();

    normalizedLcEntries.forEach(({ raw, normalized }) => {
      const idValue = raw?.id ?? normalized.id;
      if (idValue === null || idValue === undefined) return;

      const idKey = String(idValue);
      if (uniqueById.has(idKey)) return;

      const lcNumber = normalized.number ?? (typeof raw?.lcNumber === "string" ? raw.lcNumber : String(idValue));
      uniqueById.set(idKey, { id: idValue, number: lcNumber });
    });

    return Array.from(uniqueById.values());
  }, [normalizedLcEntries]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!isAuthenticated) return null;

  const totalLCValue = lcAnalytics.reduce((s, lc) => s + (lc.totalPrice ?? 0), 0);
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

  const reportTabs = [
    {
      value: "overview" as const,
      label: "Overview",
      icon: BarChart3,
      metric: filteredVessels.length.toLocaleString(),
      description: "Active vessels monitored",
    },
    {
      value: "contracts" as const,
      label: "Contracts",
      icon: FileText,
      metric: contractAnalytics.length.toLocaleString(),
      description: "Contracts under analysis",
    },
    {
      value: "lcs" as const,
      label: "LCs",
      icon: University,
      metric: lcAnalytics.length.toLocaleString(),
      description: "Letters of credit tracked",
    },
    {
      value: "future" as const,
      label: "Future",
      icon: Calendar,
      metric: forecastData.length.toLocaleString(),
      description: "Upcoming months forecasted",
    },
  ];

  return (
    <MainLayout title="Reports & Analytics" subtitle="Comprehensive import workflow analytics and forecasting">
      <div className="p-6 space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Import Analytics Dashboard</h1>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>

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

              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedSupplierFilter("");
                    setSelectedPortFilter("");
                    setSelectedLCFilter("");
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="w-full overflow-x-auto">
            <TabsList className="flex w-full min-w-max flex-nowrap gap-3 bg-transparent p-0">
              {reportTabs.map(({ value, label, icon: Icon, metric, description }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="min-w-[220px] flex-shrink-0 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-md"
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-semibold leading-none">{metric}</div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total LCs</CardTitle>
                  <University className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lcAnalytics.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(totalLCValue)} total value
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
                                {s.cargoTypes.split(', ').map((t, i) => (
                                  <Badge key={i} variant="outline" className="mr-1 mb-1">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-blue-600 font-semibold">
                              {s.contracted.toLocaleString()} tons
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              {s.received.toLocaleString()} tons
                            </TableCell>
                            <TableCell className="text-orange-600">
                              {s.remaining.toLocaleString()} tons
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  s.fulfillmentRate >= 100
                                    ? 'default'
                                    : s.fulfillmentRate >= 75
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {s.fulfillmentRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={Math.min(s.fulfillmentRate, 100)} className="w-20" />
                                <span className="text-sm text-muted-foreground">
                                  {s.fulfillmentRate >= 100
                                    ? 'Complete'
                                    : s.fulfillmentRate >= 50
                                    ? 'In Progress'
                                    : 'Behind'}
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
                    {selectedSupplierFilter
                      ? `No data found for supplier: ${selectedSupplierFilter}`
                      : 'No supplier data available'}
                  </div>
                )}
              </CardContent>
            </Card>

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
                              <TableCell>
                                {p.needed.toLocaleString()} {p.units}
                              </TableCell>
                              <TableCell className="text-blue-600">
                                {p.received.toLocaleString()} {p.units}
                              </TableCell>
                              <TableCell className="text-orange-600">
                                {p.remaining.toLocaleString()} {p.units}
                              </TableCell>
                              <TableCell>{p.completionRate.toFixed(1)}%</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Progress value={p.completionRate} className="w-20" />
                                  <Badge
                                    variant={
                                      p.completionRate >= 100
                                        ? 'default'
                                        : p.completionRate >= 50
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                  >
                                    {p.completionRate >= 100
                                      ? 'Complete'
                                      : p.completionRate >= 50
                                      ? 'In Progress'
                                      : 'Pending'}
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
                        <ComposedChart data={portAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="port" />
                          <YAxis
                            yAxisId="left"
                            tickFormatter={(value) =>
                              typeof value === "number" ? value.toLocaleString() : value
                            }
                            label={{ value: "Tonnage (tons)", angle: -90, position: "insideLeft" }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${value}%`}
                            label={{ value: "Completion (%)", angle: -90, position: "insideRight" }}
                          />
                          <Tooltip
                            formatter={portTooltipFormatter}
                            labelFormatter={(label) => `Port: ${label}`}
                          />
                          <Legend formatter={portLegendFormatter} />
                          <Bar
                            yAxisId="left"
                            dataKey="needed"
                            name="Needed"
                            stackId="tonnage"
                            fill="#bfdbfe"
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="received"
                            name="Received"
                            stackId="tonnage"
                            fill="#2563eb"
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="remaining"
                            name="Remaining"
                            stackId="tonnage"
                            fill="#f97316"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="completionRate"
                            name="Completion Rate"
                            stroke="#0ea5e9"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <ReferenceLine
                            yAxisId="right"
                            y={100}
                            stroke="#16a34a"
                            strokeDasharray="4 4"
                            label={{ value: "100%", position: "right", fill: "#16a34a" }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No port data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Contract Analytics</span>
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
                          <TableHead>Total Quantity</TableHead>
                          <TableHead>Allocated</TableHead>
                          <TableHead>Remaining</TableHead>
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
                              className="cursor-pointer"
                              onClick={() => {
                                if (c.requestId) {
                                  setLocation(`/requests/${c.requestId}`);
                                }
                              }}
                            >
                              <TableCell className="font-medium text-blue-600">
                                {c.publicId ?? `CON-${String(c.id).padStart(3, '0')}`}
                              </TableCell>
                              <TableCell>{c.supplierName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{c.cargoType}</Badge>
                              </TableCell>
                              <TableCell>{c.totalAmount.toLocaleString()} tons</TableCell>
                              <TableCell className="text-blue-600">
                                {c.allocatedAmount.toLocaleString()} tons
                              </TableCell>
                              <TableCell className="text-green-600">
                                {c.remainingAmount.toLocaleString()} tons
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Progress value={progressRate} className="w-16" />
                                  <span className="text-sm">{progressRate.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={c.status === 'approved' ? 'default' : 'secondary'}>{c.status}</Badge>
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
          </TabsContent>

          <TabsContent value="lcs" className="space-y-8">
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
                          <TableHead>Price per Unit</TableHead>
                          <TableHead>Total Quantity</TableHead>
                          <TableHead>Allocated Quantity</TableHead>
                          <TableHead>Remaining Quantity</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Utilization</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lcAnalytics.map((lc) => (
                          <TableRow key={lc.id}>
                            <TableCell className="font-medium">{lc.number || lc.id || 'LC'}</TableCell>
                            <TableCell>{lc.issuingBank || 'Unknown'}</TableCell>
                            <TableCell>
                              {lc.pricePerUnit !== null
                                ? formatLcCurrency(lc.pricePerUnit, lc.currency)
                                : 'N/A'}
                            </TableCell>
                            <TableCell>{lc.totalQuantity.toLocaleString()} tons</TableCell>
                            <TableCell className="text-blue-600">
                              {lc.allocatedQuantity.toLocaleString()} tons
                            </TableCell>
                            <TableCell className="text-green-600">
                              {lc.remainingQuantity.toLocaleString()} tons
                            </TableCell>
                            <TableCell>
                              {lc.totalPrice !== null
                                ? formatLcCurrency(lc.totalPrice, lc.currency)
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={lc.utilizationRate} className="w-16" />
                                <span className="text-sm">{lc.utilizationRate.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No letters of credit found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="future" className="space-y-8">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Monthly Category Trends</span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="monthly-trend-series"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Series
                    </Label>
                    <Select
                      value={monthlyTrendSeries}
                      onValueChange={(value) =>
                        setMonthlyTrendSeries(value as "needed" | "received")
                      }
                    >
                      <SelectTrigger id="monthly-trend-series" className="w-[160px]">
                        <SelectValue placeholder="Select series" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="needed">Needed</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="monthly-trend-chart-type"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Chart Type
                    </Label>
                    <Select
                      value={monthlyTrendChartType}
                      onValueChange={(value) =>
                        setMonthlyTrendChartType(value as "area" | "bar")
                      }
                    >
                      <SelectTrigger id="monthly-trend-chart-type" className="w-[140px]">
                        <SelectValue placeholder="Select chart" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="text-center py-8">Loading trend data...</div>
                ) : monthlyTrends.length ? (
                  <div className="space-y-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        {monthlyTrendChartType === "area" ? (
                          <AreaChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                              formatter={(value, dataKey) =>
                                formatMonthlyTrendTooltip(value as number | string, dataKey as string)
                              }
                            />
                            <Legend />
                            {monthlyTrendCategories.map((category, index) => {
                              const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                              const dataKey = `${monthlyTrendSeries}::${category.id}`;
                              const metricLabel = MONTHLY_TREND_SERIES_LABELS[monthlyTrendSeries];
                              return (
                                <Area
                                  key={`${dataKey}-area`}
                                  type="monotone"
                                  dataKey={dataKey}
                                  stackId={monthlyTrendSeries}
                                  name={`${category.label} (${metricLabel})`}
                                  stroke={color}
                                  fill={withOpacity(color, 0.35)}
                                />
                              );
                            })}
                          </AreaChart>
                        ) : (
                          <BarChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                              formatter={(value, dataKey) =>
                                formatMonthlyTrendTooltip(value as number | string, dataKey as string)
                              }
                            />
                            <Legend />
                            {monthlyTrendCategories.map((category, index) => {
                              const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                              const dataKey = `${monthlyTrendSeries}::${category.id}`;
                              const metricLabel = MONTHLY_TREND_SERIES_LABELS[monthlyTrendSeries];
                              return (
                                <Bar
                                  key={`${dataKey}-bar`}
                                  dataKey={dataKey}
                                  name={`${category.label} (${metricLabel})`}
                                  fill={withOpacity(color, 0.85)}
                                  stroke={color}
                                  stackId={monthlyTrendSeries}
                                />
                              );
                            })}
                          </BarChart>
                        )}
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
                            <TableHead>Dominant Category</TableHead>
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
                                <TableCell className="text-blue-600">
                                  {t.totalReceived.toLocaleString()}
                                </TableCell>
                                <TableCell className={gap > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {Math.abs(gap).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={fillRate} className="w-16" />
                                    <span className="text-sm">{fillRate.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>{t.dominantCategory}</TableCell>
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

            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>3-Month Forecast</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label
                    htmlFor="forecast-chart-type"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Chart Type
                  </Label>
                  <Select
                    value={forecastChartType}
                    onValueChange={(value) =>
                      setForecastChartType(value as "line" | "bar")
                    }
                  >
                    <SelectTrigger id="forecast-chart-type" className="w-[140px]">
                      <SelectValue placeholder="Select chart" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="text-center py-8">Loading forecast data...</div>
                ) : forecastData.length ? (
                  <div className="space-y-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        {forecastChartType === "line" ? (
                          <LineChart data={forecastData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="expectedContractQuantity"
                              name="Expected Contract Quantity"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot
                            />
                          </LineChart>
                        ) : (
                          <BarChart data={forecastData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="expectedContractQuantity"
                              name="Expected Contract Quantity"
                              fill="#6366f1"
                            />
                          </BarChart>
                        )}
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
                              <TableCell className="text-blue-600 font-semibold">
                                {f.expectedContractQuantity.toLocaleString()} tons
                              </TableCell>
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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
