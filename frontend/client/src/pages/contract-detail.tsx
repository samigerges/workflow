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
  FileText, 
  Ship, 
  Calendar,
  Package,
  Building,
  User
} from "lucide-react";

export default function ContractDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedVessel, setSelectedVessel] = useState<any>(null);
  const [showVesselDialog, setShowVesselDialog] = useState(false);

  // Fetch contract data
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  // Fetch vessels data
  const { data: vessels = [], isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isAuthenticated,
  });

  const isLoading = contractsLoading || vesselsLoading;

  // Find the specific contract
  const contractData = useMemo(() => {
    const contractsArray = Array.isArray(contracts) ? contracts : [];
    return contractsArray.find((contract: any) => contract.id.toString() === id);
  }, [contracts, id]);

  // Find vessels associated with this contract
  const contractVessels = useMemo(() => {
    if (!contractData) return [];
    const vesselsArray = Array.isArray(vessels) ? vessels : [];
    return vesselsArray.filter((vessel: any) => vessel.contractId === contractData.id);
  }, [vessels, contractData]);

  // Calculate contract analytics
  const contractAnalytics = useMemo(() => {
    if (!contractData) return null;
    
    const allocatedAmount = contractVessels.reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);
    const totalAmount = contractData.quantity || 0;
    const remainingAmount = Math.max(0, totalAmount - allocatedAmount);
    const progressRate = totalAmount > 0 ? (allocatedAmount / totalAmount) * 100 : 0;

    // Calculate dynamic status based on vessel allocations
    let status = 'started';
    if (allocatedAmount === 0) {
      status = 'started';
    } else if (allocatedAmount < totalAmount) {
      status = 'in progress';
    } else if (allocatedAmount >= totalAmount) {
      status = 'completed';
    }

    return {
      id: contractData.id,
      contractId: `CON-${contractData.id.toString().padStart(3, '0')}`,
      supplierName: contractData.supplierName || 'N/A',
      totalAmount,
      allocatedAmount,
      remainingAmount,
      progressRate,
      status,
      cargoType: contractData.cargoType,
      createdAt: contractData.createdAt,
      contractDate: contractData.contractDate,
      deliveryDate: contractData.deliveryDate,
      duration: contractData.deliveryDate && contractData.contractDate 
        ? `${new Date(contractData.contractDate).toLocaleDateString()} - ${new Date(contractData.deliveryDate).toLocaleDateString()}`
        : contractData.createdAt 
          ? `From ${new Date(contractData.createdAt).toLocaleDateString()}`
          : 'N/A'
    };
  }, [contractData, contractVessels]);

  const handleVesselClick = (vessel: any) => {
    setSelectedVessel(vessel);
    setShowVesselDialog(true);
  };

  if (isLoading) {
    return (
      <MainLayout title="Contract Details" subtitle="Loading...">
        <div className="p-6">
          <div className="text-center py-8">Loading contract data...</div>
        </div>
      </MainLayout>
    );
  }

  if (!contractAnalytics) {
    return (
      <MainLayout title="Contract Details" subtitle="Not Found">
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Contract not found</p>
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
    <MainLayout title={`Contract ${contractAnalytics.contractId}`} subtitle="Detailed view with associated vessels">
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

        {/* Contract Information Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <span>Contract Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Contract ID</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{contractAnalytics.contractId}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Supplier Name</span>
                </div>
                <p className="text-xl font-bold text-blue-600">{contractAnalytics.supplierName}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Total Quantity</span>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {contractAnalytics.totalAmount.toLocaleString()} tons
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Duration</span>
                </div>
                <p className="text-lg font-semibold text-gray-700">{contractAnalytics.duration}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Allocated Quantity</p>
                <p className="text-2xl font-bold text-blue-700">
                  {contractAnalytics.allocatedAmount.toLocaleString()} tons
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Remaining Quantity</p>
                <p className="text-2xl font-bold text-green-700">
                  {contractAnalytics.remainingAmount.toLocaleString()} tons
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Progress Rate</p>
                <p className="text-2xl font-bold text-purple-700">{contractAnalytics.progressRate.toFixed(1)}%</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Status</p>
                <p className="text-lg font-bold text-orange-700 capitalize">{contractAnalytics.status}</p>
              </div>
            </div>

            {contractAnalytics.cargoType && (
              <div className="mt-4">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {contractAnalytics.cargoType}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Associated Vessels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ship className="h-5 w-5 text-blue-600" />
              <span>Associated Vessels ({contractVessels.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractVessels.length > 0 ? (
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
                    {contractVessels.map((vessel: any) => (
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
                <p>No vessels associated with this contract</p>
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