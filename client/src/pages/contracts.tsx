import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import ContractForm from "@/components/forms/contract-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Edit, FileCheck, Trash, Ship, Vote, Eye, MessageSquare } from "lucide-react";
import DocumentUploadVote from "@/components/ui/document-upload-vote";
import DocumentVoting from "@/components/document-voting";
import { ContractVotingContent, ContractVoteButton } from "@/components/contract-voting";
import ContractSummary from "@/components/contract-summary";
import StatusChangeDropdown from "@/components/ui/status-change-dropdown";

export default function Contracts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDocumentVotingDialog, setShowDocumentVotingDialog] = useState(false);
  const [votingContract, setVotingContract] = useState<any>(null);
  const [showContractVotingDialog, setShowContractVotingDialog] = useState(false);
  const [contractForVoting, setContractForVoting] = useState<any>(null);
  const [showContractSummaryDialog, setShowContractSummaryDialog] = useState(false);
  const [contractForSummary, setContractForSummary] = useState<any>(null);

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

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["/api/contracts", statusFilter !== "all" ? { status: statusFilter } : {}],
    retry: false,
  });

  const { data: requests } = useQuery({
    queryKey: ["/api/requests"],
    retry: false,
  });

  const { data: vessels } = useQuery({
    queryKey: ["/api/vessels"],
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/contracts/${id}`, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract approved successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to approve contract",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/contracts/${id}`, { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract rejected successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to reject contract",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
      mutationFn: async (id: number) => {
        const response = await apiRequest("DELETE", `/api/contracts/${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `${response.status}: ${response.statusText}`);
        }
        return response.json();
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "under_review": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const canModifyContract = (contract: any) => {
    return true; // Allow all users to delete contracts
  };

  const hasVessels = (contractId: number) => {
    return vessels && (vessels as any[]).some((vessel: any) => vessel.contractId === contractId);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Contracts" subtitle="Manage import contracts and approvals">
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
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary-500 hover:bg-primary-600 text-black w-full sm:w-auto">
                    <Plus className="mr-2" size={16} />
                    New Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Contract</DialogTitle>
                  </DialogHeader>
                  <ContractForm 
                    onSuccess={() => setShowCreateDialog(false)}
                    onCancel={() => setShowCreateDialog(false)}
                    requests={(requests as any[]) || []}
                  />
                </DialogContent>
              </Dialog>

              {/* Edit Contract Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Contract</DialogTitle>
                  </DialogHeader>
                  <ContractForm 
                    contract={editingContract}
                    onSuccess={() => {
                      setShowEditDialog(false);
                      setEditingContract(null);
                    }}
                    onCancel={() => {
                      setShowEditDialog(false);
                      setEditingContract(null);
                    }}
                    onDelete={() => {
                      setShowEditDialog(false);
                      setEditingContract(null);
                    }}
                    requests={(requests as any[]) || []}
                  />
                </DialogContent>
              </Dialog>
              
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-black"
                onClick={() => window.location.href = '/vessels'}
              >
                <Ship className="mr-2" size={16} />
                Manage Vessels
              </Button>
            </div>
          </div>

          {/* Contracts Table */}
          <Card className="bg-white border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-secondary-900">
                Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-secondary-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : contracts && (contracts as any[]).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(contracts as any[]).map((contract: any) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          REQ-{contract.requestId.toString().padStart(3, '0')}
                        </TableCell>
                        <TableCell>{contract.supplierName}</TableCell>
                        <TableCell>
                          {contract.quantity ? `${contract.quantity} tons` : '-'}
                        </TableCell>
                        <TableCell>
                          {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-2">
                            <Badge className={getContractStatusColor(contract.status)}>
                              {contract.status?.charAt(0).toUpperCase() + contract.status?.slice(1).replace('_', ' ')}
                            </Badge>
                            <StatusChangeDropdown
                              entityType="contract"
                              entityId={contract.id}
                              currentStatus={contract.status}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {/* Contract Summary Button */}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                              onClick={() => {
                                setContractForSummary(contract);
                                setShowContractSummaryDialog(true);
                              }}
                              title="View contract summary"
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            
                            {/* Edit Button */}
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => {
                                setEditingContract(contract);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit size={14} />
                            </Button>

                            {(user as any)?.role === 'admin' && contract.status === 'under_review' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => approveMutation.mutate(contract.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <FileCheck size={14} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => rejectMutation.mutate(contract.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this contract?")) {
                                  deleteMutation.mutate(contract.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Delete contract"
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
                  <FileText className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">No contracts found</h3>
                  <p className="mt-2 text-secondary-600">
                    {statusFilter === "all" 
                      ? "Get started by creating your first contract." 
                      : `No contracts with status "${statusFilter}" found.`}
                  </p>
                  <Button 
                    className="mt-4 bg-primary-500 hover:bg-primary-600 text-black"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="mr-2" size={16} />
                    Create New Contract
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Voting Dialog */}
          <Dialog open={showDocumentVotingDialog} onOpenChange={setShowDocumentVotingDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Document Voting - Contract {votingContract?.id}
                </DialogTitle>
              </DialogHeader>
              {votingContract && (
                <DocumentVoting 
                  entityType="contract"
                  entityId={votingContract.id}
                  allowVoting={true}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Contract Voting Dialog */}
          <Dialog open={showContractVotingDialog} onOpenChange={setShowContractVotingDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Contract Voting - Contract {contractForVoting?.id}
                </DialogTitle>
              </DialogHeader>
              {contractForVoting && (
                <ContractVotingContent 
                  contractId={contractForVoting.id}
                  currentUserId={(user as any)?.id}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Contract Summary Dialog */}
          <ContractSummary
            contract={contractForSummary}
            isOpen={showContractSummaryDialog}
            onClose={() => {
              setShowContractSummaryDialog(false);
              setContractForSummary(null);
            }}
          />
    </MainLayout>
  );
}
