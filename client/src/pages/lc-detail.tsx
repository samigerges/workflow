import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import VesselSummary from "@/components/vessel-summary";
import { 
  ArrowLeft,
  University, 
  Ship, 
  Calendar,
  Package,
  DollarSign
} from "lucide-react";

export default function LCDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedVessel, setSelectedVessel] = useState<any>(null);
  const [showVesselDialog, setShowVesselDialog] = useState(false);

  // Fetch LC data
  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery({
    queryKey: ["/api/letters-of-credit"],
    enabled: isAuthenticated,
  });

  // Fetch vessels data
  const { data: vessels = [], isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
  });

  const isLoading = lcsLoading || vesselsLoading;

  // Find the specific LC
  const lcData = useMemo(() => {
    const lcsArray = Array.isArray(lettersOfCredit) ? lettersOfCredit : [];
    return lcsArray.find((lc: any) => lc.id.toString() === id);
  }, [lettersOfCredit, id]);

  // Find vessels associated with this LC
  const lcVessels = useMemo(() => {
    if (!lcData) return [];
    const vesselsArray = Array.isArray(vessels) ? vessels : [];
    return vesselsArray.filter((vessel: any) => 
      lcData.vesselIds && lcData.vesselIds.includes(vessel.id)
    );
  }, [vessels, lcData]);

  // Calculate LC analytics
  const lcAnalytics = useMemo(() => {
    if (!lcData) return null;
    
    const allocatedAmount = lcVessels.reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);
    const totalAmount = lcData.amount || lcData.quantity || 0;
    const remainingAmount = Math.max(0, totalAmount - allocatedAmount);
    const utilizationRate = totalAmount > 0 ? (allocatedAmount / totalAmount) * 100 : 0;

    return {
      id: lcData.id,
      lcNumber: lcData.lcNumber || `LC-${lcData.id}`,
      totalAmount,
      allocatedAmount,
      remainingAmount,
      utilizationRate,
      currency: lcData.currency || 'USD',
      status: lcData.status,
      expiryDate: lcData.expiryDate,
      issuingBank: lcData.issuingBank,
      issueDate: lcData.issueDate,
      duration: lcData.expiryDate && lcData.issueDate 
        ? `${new Date(lcData.issueDate).toLocaleDateString()} - ${new Date(lcData.expiryDate).toLocaleDateString()}`
        : 'N/A'
    };
  }, [lcData, lcVessels]);

  const handleVesselClick = (vessel: any) => {
    setSelectedVessel(vessel);
    setShowVesselDialog(true);
  };

  if (isLoading) {
    return (
      <MainLayout title="LC Details" subtitle="Loading...">
        <div className="p-6">
          <div className="text-center py-8">Loading LC data...</div>
        </div>
      </MainLayout>
    );
  }

  if (!lcAnalytics) {
    return (
      <MainLayout title="LC Details" subtitle="Not Found">
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Letter of Credit not found</p>
            <Button 
              onClick={() => setLocation("/reports")}
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`LC ${lcAnalytics.lcNumber}`} subtitle="Detailed view with associated vessels">
      <div className="p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => setLocation("/reports")}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </div>

        {/* LC Information Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <University className="h-6 w-6 text-blue-600" />
              <span>Letter of Credit Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">LC Number</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{lcAnalytics.lcNumber}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Total Amount</span>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {lcAnalytics.totalAmount.toLocaleString()} {lcAnalytics.currency}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Duration</span>
                </div>
                <p className="text-lg font-semibold text-gray-700">{lcAnalytics.duration}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <University className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Issuing Bank</span>
                </div>
                <p className="text-lg font-semibold text-gray-700">{lcAnalytics.issuingBank || 'N/A'}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Allocated Amount</p>
                <p className="text-2xl font-bold text-blue-700">
                  {lcAnalytics.allocatedAmount.toLocaleString()} {lcAnalytics.currency}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Remaining Amount</p>
                <p className="text-2xl font-bold text-green-700">
                  {lcAnalytics.remainingAmount.toLocaleString()} {lcAnalytics.currency}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Utilization Rate</p>
                <p className="text-2xl font-bold text-purple-700">{lcAnalytics.utilizationRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Associated Vessels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ship className="h-5 w-5 text-blue-600" />
              <span>Associated Vessels ({lcVessels.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lcVessels.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vessel Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Departure Port</TableHead>
                      <TableHead>Arrival Port</TableHead>
                      <TableHead>Cargo Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lcVessels.map((vessel: any) => (
                      <TableRow 
                        key={vessel.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleVesselClick(vessel)}
                      >
                        <TableCell className="font-medium text-blue-600">{vessel.vesselName}</TableCell>
                        <TableCell className="font-semibold">{vessel.quantity?.toLocaleString() || 0} tons</TableCell>
                        <TableCell>
                          <Badge variant={vessel.status === 'delivered' ? 'default' : 'secondary'}>
                            {vessel.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{vessel.departurePort || 'N/A'}</TableCell>
                        <TableCell>{vessel.arrivalPort || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{vessel.cargoType || 'N/A'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Ship className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No vessels associated with this Letter of Credit</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vessel Details Modal */}
        <VesselSummary 
          vessel={selectedVessel}
          isOpen={showVesselDialog}
          onClose={() => setShowVesselDialog(false)}
        />
      </div>
    </MainLayout>
  );
}