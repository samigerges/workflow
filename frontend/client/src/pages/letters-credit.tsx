import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import LetterOfCreditForm from "@/components/forms/letter-of-credit-form";
import LCSummary from "@/components/lc-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, University, Edit, Download, Eye, Trash } from "lucide-react";

export default function LettersCredit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingLC, setEditingLC] = useState<any>(null);
  const [viewingLC, setViewingLC] = useState<any>(null);

  // Delete LC mutation
  const deleteLCMutation = useMutation({
      mutationFn: async (lcId: number) => {
        const response = await apiRequest("DELETE", `/api/letters-of-credit/${lcId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `${response.status}: ${response.statusText}`);
        }
        return response.json();
      },
    onSuccess: () => {
      // Remove all LC-related queries from cache completely
      queryClient.removeQueries({ queryKey: ["/api/letters-of-credit"] });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "/api/letters-of-credit" });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Success",
        description: "Letter of Credit deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete Letter of Credit",
        variant: "destructive",
      });
    },
  });

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

  const { data: lettersOfCredit = [], isLoading: lcsLoading } = useQuery({
    queryKey: ["/api/letters-of-credit", statusFilter !== "all" ? { status: statusFilter } : {}],
    retry: false,
  });

  // Ensure lettersOfCredit is an array
  const lcArray = Array.isArray(lettersOfCredit) ? lettersOfCredit : [];

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: false,
  });

  // Ensure contracts is an array
  const contractsArray = Array.isArray(contracts) ? contracts : [];

  const { data: vessels = [] } = useQuery({
    queryKey: ["/api/vessels"],
    retry: false,
  });

  // Ensure vessels is an array
  const vesselsArray = Array.isArray(vessels) ? vessels : [];


  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "issued": return "bg-green-100 text-green-800";
      case "expired": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Letters of Credit" subtitle="Manage financial instruments and LC processing">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-black w-full sm:w-auto">
                  <Plus className="mr-2" size={16} />
                  New LC
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Letter of Credit</DialogTitle>
                  </DialogHeader>
                  <LetterOfCreditForm 
                    onSuccess={() => setShowCreateDialog(false)}
                    onCancel={() => setShowCreateDialog(false)}
                    contracts={contractsArray}
                    requests={[]}
                  />
                </DialogContent>
              </Dialog>
          </div>

          {/* Edit LC Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Letter of Credit</DialogTitle>
              </DialogHeader>
              {editingLC && (
                <LetterOfCreditForm 
                  lc={editingLC}
                  onSuccess={() => {
                    setShowEditDialog(false);
                    setEditingLC(null);
                  }}
                  onCancel={() => {
                    setShowEditDialog(false);
                    setEditingLC(null);
                  }}
                  contracts={contractsArray}
                  requests={[]}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* View LC Summary Dialog */}
          <LCSummary
            lc={viewingLC}
            isOpen={showViewDialog}
            onClose={() => {
              setShowViewDialog(false);
              setViewingLC(null);
            }}
          />

          {/* LC Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Issued LCs</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {lcArray.filter((lc: any) => lc.status === 'issued').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <University className="text-green-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Available Quantity</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {(() => {
                        // Calculate total remaining quantity across all LCs
                        const totalRemainingQuantity = lcArray.reduce((sum: number, lc: any) => sum + (parseInt(lc.remainingQuantity) || 0), 0);
                        return totalRemainingQuantity.toLocaleString();
                      })()} tons
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <University className="text-blue-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Allocated Quantity</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {(() => {
                        // Calculate total allocated quantity across all LCs
                        const totalAllocatedQuantity = lcArray.reduce((sum: number, lc: any) => sum + (parseInt(lc.allocatedQuantity) || 0), 0);
                        return totalAllocatedQuantity.toLocaleString();
                      })()} tons
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <University className="text-purple-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-secondary-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Expiring Soon (5 Days)</p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {lcArray.filter((lc: any) => {
                        const daysUntilExpiry = Math.ceil((new Date(lc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntilExpiry <= 5 && daysUntilExpiry > 0;
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <University className="text-orange-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Letters of Credit Table */}
          <Card className="bg-white border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-secondary-900">
                Letters of Credit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lcsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-secondary-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : lcArray.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LC Number</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Allocated</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Issuing Bank</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lcArray.map((lc: any) => (
                      <TableRow key={lc.id} className={isExpired(lc.expiryDate) ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{lc.lcNumber}</TableCell>
                        <TableCell>
                          ${parseFloat(lc.unitPrice || lc.amount || 0).toLocaleString()} {lc.currency}
                        </TableCell>
                        <TableCell>{lc.quantity || 0} tons</TableCell>
                        <TableCell className="text-orange-600 font-medium">{lc.allocatedQuantity || 0} tons</TableCell>
                        <TableCell className="text-green-600 font-medium">{lc.remainingQuantity || 0} tons</TableCell>
                        <TableCell>{lc.issuingBank}</TableCell>
                        <TableCell>
                          {new Date(lc.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className={isExpired(lc.expiryDate) ? "text-red-600 font-medium" : ""}>
                          {new Date(lc.expiryDate).toLocaleDateString()}
                          {isExpired(lc.expiryDate) && (
                            <div className="text-xs text-red-500">Expired</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={lc.status} 
                            onValueChange={(newStatus) => {
                              const formData = new FormData();
                              formData.append('status', newStatus);
                              
                                apiRequest('PUT', `/api/letters-of-credit/${lc.id}`, formData).then(response => {
                                  if (response.ok) {
                                    queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                                    toast({
                                      title: "Success",
                                      description: "LC status updated successfully",
                                    });
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update LC status",
                                      variant: "destructive",
                                    });
                                  }
                                });
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="issued">Issued</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                              onClick={() => {
                                setViewingLC(lc);
                                setShowViewDialog(true);
                              }}
                              title="View LC summary"
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => {
                                setEditingLC(lc);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this Letter of Credit?")) {
                                  deleteLCMutation.mutate(lc.id);
                                }
                              }}
                              disabled={deleteLCMutation.isPending}
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <University className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">No letters of credit found</h3>
                  <p className="mt-2 text-secondary-600">
                    {statusFilter === "all" 
                      ? "Get started by creating your first letter of credit." 
                      : `No LCs with status "${statusFilter}" found.`}
                  </p>
                  {user && ['admin', 'finance_officer'].includes((user as any)?.role) ? (
                    <Button 
                      className="mt-4 bg-primary-500 hover:bg-primary-600 text-white"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="mr-2" size={16} />
                      Create New LC
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
    </MainLayout>
  );
}
