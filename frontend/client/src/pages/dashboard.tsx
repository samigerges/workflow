import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import WorkflowProgress from "@/components/ui/workflow-progress";
import LCSummary from "@/components/lc-summary";
import ContractSummary from "@/components/contract-summary";
import { 
  FileText, 
  Ship, 
  University, 
  CheckCircle, 
  Box,
  Leaf,
  Microchip,
  Plus
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedLC, setSelectedLC] = useState<any>(null);
  const [showLCSummary, setShowLCSummary] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showContractSummary, setShowContractSummary] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["/api/contracts", { limit: 3 }],
    retry: false,
    refetchInterval: 30000,
  });

  const { data: upcomingVessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels", { status: "in_transit", limit: 3 }],
    retry: false,
    refetchInterval: 30000,
  });

  const { data: contracts } = useQuery({
    queryKey: ["/api/contracts"],
    retry: false,
    refetchInterval: 30000,
  });

  const { data: lettersOfCredit } = useQuery({
    queryKey: ["/api/letters-of-credit"],
    retry: false,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Dashboard" subtitle="Welcome back, manage your import operations">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200/50 shadow-medium card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">Active Requests</p>
                    <p className="text-3xl font-bold text-secondary-900 mt-2">
                      {(recentContracts as any[])?.length || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-colored">
                    <FileText className="text-white" size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200/50 shadow-medium card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">Active Contracts</p>
                    <p className="text-3xl font-bold text-secondary-900 mt-2">
                      {(contracts as any[])?.filter((c: any) => c.status === 'approved').length || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-colored">
                    <CheckCircle className="text-white" size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200/50 shadow-medium card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">Active LCs</p>
                    <p className="text-3xl font-bold text-secondary-900 mt-2">
                      {(lettersOfCredit as any[])?.filter((lc: any) => lc.status === 'issued').length || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-colored">
                    <University className="text-white" size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200/50 shadow-medium card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">Ships in Transit</p>
                    <p className="text-3xl font-bold text-secondary-900 mt-2">
                      {(upcomingVessels as any[])?.length || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-colored">
                    <Ship className="text-white" size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200/50 shadow-medium card-hover overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-secondary-50 to-white border-b border-secondary-100/50">
                <CardTitle className="text-xl font-bold text-secondary-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <span>Recent Contracts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-secondary-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (recentContracts as any[]) && (recentContracts as any[]).length > 0 ? (
                  <div className="space-y-3">
                    {(recentContracts as any[]).slice(0, 3).map((contract: any) => (
                      <div 
                        key={contract.id} 
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-secondary-50/30 rounded-xl cursor-pointer hover:shadow-soft transition-all duration-200 card-hover border border-secondary-100/50"
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowContractSummary(true);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-secondary-900 text-base">CON-{contract.id.toString().padStart(3, '0')}</p>
                            <p className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                              {parseFloat(contract.quantity || 0).toLocaleString()} tons
                            </p>
                          </div>
                          <p className="text-sm text-secondary-600 font-medium">{contract.supplierName}</p>
                        </div>
                        <span className="status-badge text-green-700 bg-green-100 border-green-200">{contract.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-secondary-500 text-center py-8">No recent contracts</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200/50 shadow-medium card-hover overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-secondary-50 to-white border-b border-secondary-100/50">
                <CardTitle className="text-xl font-bold text-secondary-900 flex items-center space-x-2">
                  <University className="w-5 h-5 text-purple-600" />
                  <span>Letters of Credit</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(lettersOfCredit as any[]) && (lettersOfCredit as any[]).length > 0 ? (
                  <div className="space-y-3">
                    {(lettersOfCredit as any[]).map((lc: any) => (
                      <div 
                        key={lc.id}
                        className="w-full p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl border border-purple-200/50 cursor-pointer hover:shadow-medium transition-all duration-200 card-hover"
                        onClick={() => {
                          setSelectedLC(lc);
                          setShowLCSummary(true);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <University className="text-white" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-purple-900">{lc.lcNumber}</span>
                              <span className="text-sm font-bold text-purple-700 bg-purple-200 px-2 py-1 rounded-lg">
                                {parseFloat(lc.quantity || 0).toLocaleString()} tons
                              </span>
                            </div>
                            <span className="text-sm text-purple-700 font-medium truncate block">
                              {lc.issuingBank}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                      <University className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-secondary-600 text-base font-medium mb-4">No Letters of Credit available</p>
                    <Button 
                      className="btn-primary-gradient px-6 py-2 text-sm font-semibold rounded-xl"
                      onClick={() => window.location.href = '/letters-credit'}
                    >
                      <Plus className="mr-2" size={16} />
                      Create LC
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* LC Summary Dialog */}
          <LCSummary
            lc={selectedLC}
            isOpen={showLCSummary}
            onClose={() => {
              setShowLCSummary(false);
              setSelectedLC(null);
            }}
          />

          {/* Contract Summary Dialog */}
          <ContractSummary
            contract={selectedContract}
            isOpen={showContractSummary}
            onClose={() => {
              setShowContractSummary(false);
              setSelectedContract(null);
            }}
          />
    </MainLayout>
  );
}
