import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { 
  FileText, 
  DollarSign, 
  Ship, 
  TrendingUp, 
  Calendar,
  Package,
  MapPin,
  University,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, addMonths, isBefore, isAfter } from "date-fns";

export default function Reports() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState("6months");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch all required data
  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery({
    queryKey: ["/api/letters-of-credit"],
    enabled: isAuthenticated,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  const { data: vessels = [], isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
  });

  const { data: needs = [], isLoading: needsLoading } = useQuery({
    queryKey: ["/api/needs"],
    enabled: isAuthenticated,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/requests"],
    enabled: isAuthenticated,
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ["/api/shipments"],
    enabled: isAuthenticated,
  });

  const isDataLoading = lcsLoading || contractsLoading || vesselsLoading || needsLoading || requestsLoading || shipmentsLoading;

  // Calculate LC Analytics
  const lcAnalytics = useMemo(() => {
    return (lettersOfCredit as any[]).map(lc => {
      // Calculate allocated amount from vessels associated with this LC
      const allocatedVessels = (vessels as any[]).filter(vessel => 
        lc.vesselIds && lc.vesselIds.includes(vessel.id)
      );
      const allocatedAmount = allocatedVessels.reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);
      const totalAmount = lc.amount || lc.quantity || 0;
      const remainingAmount = Math.max(0, totalAmount - allocatedAmount);

      return {
        id: lc.id,
        lcNumber: lc.lcNumber || `LC-${lc.id}`,
        totalAmount,
        allocatedAmount,
        remainingAmount,
        currency: lc.currency || 'USD',
        status: lc.status,
        expiryDate: lc.expiryDate,
        issuingBank: lc.issuingBank
      };
    });
  }, [lettersOfCredit, vessels]);

  // Calculate Contract Analytics
  const contractAnalytics = useMemo(() => {
    return (contracts as any[]).map(contract => {
      // Calculate allocated amount from vessels linked to this contract
      const contractVessels = (vessels as any[]).filter(vessel => vessel.contractId === contract.id);
      const allocatedAmount = contractVessels.reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);
      const totalAmount = contract.quantity || 0;
      const remainingAmount = Math.max(0, totalAmount - allocatedAmount);

      return {
        id: contract.id,
        requestId: contract.requestId,
        supplierName: contract.supplierName,
        totalAmount,
        allocatedAmount,
        remainingAmount,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: contract.status,
        cargoType: contract.cargoType
      };
    });
  }, [contracts, vessels]);

  // Calculate Port Analytics
  const portAnalytics = useMemo(() => {
    const portData: Record<string, { needed: number; received: number; units: string }> = {};

    // Aggregate data from vessels (ports of discharge)
    (vessels as any[]).forEach(vessel => {
      const port = vessel.portOfDischarge || 'Unknown Port';
      const quantity = vessel.quantity || 0;
      const dischargedQuantity = parseFloat(vessel.quantityUnloaded || '0') || 0;

      if (!portData[port]) {
        portData[port] = { needed: 0, received: 0, units: 'tons' };
      }
      portData[port].needed += quantity;
      portData[port].received += dischargedQuantity;
    });

    return Object.entries(portData).map(([port, data]) => ({
      port,
      needed: data.needed,
      received: data.received,
      remaining: Math.max(0, data.needed - data.received),
      completionRate: data.needed > 0 ? (data.received / data.needed) * 100 : 0,
      units: data.units
    }));
  }, [vessels]);

  // Calculate Monthly Category Trends
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM yyyy');

      // Calculate needs for this month
      const monthlyNeeds = (needs as any[]).filter(need => {
        const createdDate = need.createdAt ? parseISO(need.createdAt) : null;
        return createdDate && createdDate >= monthStart && createdDate <= monthEnd;
      });

      // Calculate received quantities for this month
      const monthlyReceived = (shipments as any[]).filter(shipment => {
        const dischargeDate = shipment.dischargeEndDate ? parseISO(shipment.dischargeEndDate) : null;
        return dischargeDate && dischargeDate >= monthStart && dischargeDate <= monthEnd;
      });

      // Group by category
      const categoryData: Record<string, { needed: number; received: number }> = {};

      monthlyNeeds.forEach(need => {
        const category = need.category || 'Other';
        if (!categoryData[category]) categoryData[category] = { needed: 0, received: 0 };
        categoryData[category].needed += need.requiredQuantity || 0;
      });

      monthlyReceived.forEach(shipment => {
        // Map shipment to category based on vessel cargo type
        const vessel = (vessels as any[]).find(v => v.id === shipment.vesselId);
        const category = vessel?.cargoType || 'Other';
        if (!categoryData[category]) categoryData[category] = { needed: 0, received: 0 };
        categoryData[category].received += shipment.quantityUnloaded || 0;
      });

      return {
        month: monthLabel,
        date: month,
        ...categoryData,
        totalNeeded: Object.values(categoryData).reduce((sum, cat) => sum + cat.needed, 0),
        totalReceived: Object.values(categoryData).reduce((sum, cat) => sum + cat.received, 0)
      };
    });
  }, [needs, shipments, vessels]);

  // Calculate Forecasting Data
  const forecastData = useMemo(() => {
    const futureMonths = eachMonthOfInterval({ 
      start: addMonths(new Date(), 1), 
      end: addMonths(new Date(), 6) 
    });

    return futureMonths.map(month => {
      const monthLabel = format(month, 'MMM yyyy');
      
      // Calculate expected deliveries based on active contracts
      const expectedDeliveries = (contracts as any[]).filter(contract => {
        const endDate = contract.endDate ? parseISO(contract.endDate) : null;
        return endDate && 
               endDate >= startOfMonth(month) && 
               endDate <= endOfMonth(month) &&
               contract.status === 'approved';
      }).reduce((sum, contract) => sum + (contract.quantity || 0), 0);

      // Calculate expected arrivals based on vessel ETAs
      const expectedArrivals = (vessels as any[]).filter(vessel => {
        const eta = vessel.eta ? parseISO(vessel.eta) : null;
        return eta && 
               eta >= startOfMonth(month) && 
               eta <= endOfMonth(month) &&
               ['loading', 'in_transit', 'arrived'].includes(vessel.status);
      }).reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);

      return {
        month: monthLabel,
        expectedFromContracts: expectedDeliveries,
        expectedFromVessels: expectedArrivals,
        totalExpected: expectedDeliveries + expectedArrivals
      };
    });
  }, [contracts, vessels]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Reports & Analytics" subtitle="Comprehensive import workflow analytics and forecasting">
      <div className="p-6 space-y-8">
        {/* Page Header with Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Import Analytics Dashboard</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total LCs</CardTitle>
              <University className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lcAnalytics.length}</div>
              <p className="text-xs text-muted-foreground">
                ${lcAnalytics.reduce((sum, lc) => sum + lc.totalAmount, 0).toLocaleString()} total value
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
                {contractAnalytics.reduce((sum, contract) => sum + contract.totalAmount, 0).toLocaleString()} tons total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vessels</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(vessels as any[]).length}</div>
              <p className="text-xs text-muted-foreground">
                {portAnalytics.length} ports involved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {portAnalytics.length > 0 
                  ? Math.round(portAnalytics.reduce((sum, port) => sum + port.completionRate, 0) / portAnalytics.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Average across all ports</p>
            </CardContent>
          </Card>
        </div>

        {/* LC Analytics Section */}
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
            ) : lcAnalytics.length > 0 ? (
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lcAnalytics.map((lc) => {
                      const utilizationRate = lc.totalAmount > 0 ? (lc.allocatedAmount / lc.totalAmount) * 100 : 0;
                      return (
                        <TableRow key={lc.id}>
                          <TableCell className="font-medium">{lc.lcNumber}</TableCell>
                          <TableCell>{lc.issuingBank || 'N/A'}</TableCell>
                          <TableCell>{lc.totalAmount.toLocaleString()} {lc.currency}</TableCell>
                          <TableCell className="text-blue-600">{lc.allocatedAmount.toLocaleString()} {lc.currency}</TableCell>
                          <TableCell className="text-green-600">{lc.remainingAmount.toLocaleString()} {lc.currency}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={utilizationRate} className="w-16" />
                              <span className="text-sm">{utilizationRate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={lc.status === 'issued' ? 'default' : 'secondary'}>
                              {lc.status}
                            </Badge>
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

        {/* Contract Analytics Section */}
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
            ) : contractAnalytics.length > 0 ? (
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
                    {contractAnalytics.map((contract) => {
                      const progressRate = contract.totalAmount > 0 ? (contract.allocatedAmount / contract.totalAmount) * 100 : 0;
                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">CON-{contract.id.toString().padStart(3, '0')}</TableCell>
                          <TableCell>{contract.supplierName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{contract.cargoType}</Badge>
                          </TableCell>
                          <TableCell>{contract.totalAmount.toLocaleString()} tons</TableCell>
                          <TableCell className="text-blue-600">{contract.allocatedAmount.toLocaleString()} tons</TableCell>
                          <TableCell className="text-green-600">{contract.remainingAmount.toLocaleString()} tons</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={progressRate} className="w-16" />
                              <span className="text-sm">{progressRate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={contract.status === 'approved' ? 'default' : 'secondary'}>
                              {contract.status}
                            </Badge>
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

        {/* Port Analysis Section */}
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
            ) : portAnalytics.length > 0 ? (
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
                      {portAnalytics.map((port) => (
                        <TableRow key={port.port}>
                          <TableCell className="font-medium">{port.port}</TableCell>
                          <TableCell>{port.needed.toLocaleString()} {port.units}</TableCell>
                          <TableCell className="text-blue-600">{port.received.toLocaleString()} {port.units}</TableCell>
                          <TableCell className="text-orange-600">{port.remaining.toLocaleString()} {port.units}</TableCell>
                          <TableCell>{port.completionRate.toFixed(1)}%</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={port.completionRate} className="w-20" />
                              <Badge variant={port.completionRate >= 100 ? 'default' : port.completionRate >= 50 ? 'secondary' : 'destructive'}>
                                {port.completionRate >= 100 ? 'Complete' : port.completionRate >= 50 ? 'In Progress' : 'Pending'}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Port Comparison Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={portAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="port" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="needed" fill="#8884d8" name="Needed" />
                      <Bar dataKey="received" fill="#82ca9d" name="Received" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No port data available</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Category Trends */}
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
            ) : monthlyTrends.length > 0 ? (
              <div className="space-y-6">
                {/* Needs vs Received Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="totalNeeded" 
                        stackId="1" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        name="Total Needed"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalReceived" 
                        stackId="2" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        name="Total Received"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Trends Table */}
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
                      {monthlyTrends.map((trend) => {
                        const gap = trend.totalNeeded - trend.totalReceived;
                        const fillRate = trend.totalNeeded > 0 ? (trend.totalReceived / trend.totalNeeded) * 100 : 0;
                        return (
                          <TableRow key={trend.month}>
                            <TableCell className="font-medium">{trend.month}</TableCell>
                            <TableCell>{trend.totalNeeded.toLocaleString()}</TableCell>
                            <TableCell className="text-blue-600">{trend.totalReceived.toLocaleString()}</TableCell>
                            <TableCell className={gap > 0 ? "text-red-600" : "text-green-600"}>
                              {Math.abs(gap).toLocaleString()}
                            </TableCell>
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

        {/* Forecasting Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>6-Month Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="text-center py-8">Loading forecast data...</div>
            ) : forecastData.length > 0 ? (
              <div className="space-y-6">
                {/* Forecast Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="expectedFromContracts" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Expected from Contracts"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expectedFromVessels" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Expected from Vessels"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalExpected" 
                        stroke="#ff7300" 
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        name="Total Expected"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Forecast Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Expected from Contracts</TableHead>
                        <TableHead>Expected from Vessels</TableHead>
                        <TableHead>Total Expected</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecastData.map((forecast) => (
                        <TableRow key={forecast.month}>
                          <TableCell className="font-medium">{forecast.month}</TableCell>
                          <TableCell className="text-blue-600">{forecast.expectedFromContracts.toLocaleString()} tons</TableCell>
                          <TableCell className="text-green-600">{forecast.expectedFromVessels.toLocaleString()} tons</TableCell>
                          <TableCell className="font-semibold">{forecast.totalExpected.toLocaleString()} tons</TableCell>
                          <TableCell>
                            <Badge variant={forecast.expectedFromVessels > 0 ? 'default' : 'secondary'}>
                              {forecast.expectedFromVessels > 0 ? 'High' : 'Medium'}
                            </Badge>
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
      </div>
    </MainLayout>
  );
}