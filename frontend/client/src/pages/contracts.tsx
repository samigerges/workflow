import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import ContractForm from "@/components/forms/contract-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/ui/status-badge";
import { Plus, FileText, Edit, FileCheck, Trash, Ship, Vote, Eye, MessageSquare, FilePlus2, Loader2 } from "lucide-react";
import DocumentUploadVote from "@/components/ui/document-upload-vote";
import DocumentVoting from "@/components/document-voting";
import { ContractVotingContent, ContractVoteButton } from "@/components/contract-voting";
import ContractSummary from "@/components/contract-summary";
import type { Contract as ContractRecord } from "@/lib/schemas";
import {
  CARGO_TYPES,
  CONTRACT_PAYMENT_METHODS,
  CONTRACT_SHIPPING_METHODS,
} from "@/lib/constants";
import { getOptionLabel } from "@/lib/utils";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";
import { formatLcDate, normalizeLc } from "@/lib/lc";

type ContractWithFile = ContractRecord & {
  fileName?: string | null;
  fileUrl?: string | null;
  uploadedFile?: string | null;
};

const normalizeContract = (contract: any): ContractWithFile => {
  const fileName = contract?.fileName ?? contract?.uploadedFile ?? null;
  const fileUrl = contract?.fileUrl ?? (fileName ? `/uploads/${fileName}` : null);

  return {
    ...contract,
    fileName,
    fileUrl,
    uploadedFile: contract?.uploadedFile ?? fileName ?? null,
  };
};

export default function Contracts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { redirectToLogin } = useUnauthorizedRedirect({
    isAuthenticated,
    isLoading,
  });
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
  const [showOpenLcDialog, setShowOpenLcDialog] = useState(false);
  const [contractForOpenLc, setContractForOpenLc] = useState<any>(null);
  const [selectedLcId, setSelectedLcId] = useState("");

  const { data: allContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["/api/contracts"],
    retry: false,
    select: (data: any) => {
      if (!Array.isArray(data)) {
        return data;
      }

      return data.map(normalizeContract);
    },
  });

  // Filter contracts based on calculated status
  const contracts = allContracts && statusFilter !== "all" 
    ? (allContracts as any[]).filter(contract => {
        const dynamicStatus = calculateContractStatus(contract, (vessels as any[]) || []);
        return dynamicStatus === statusFilter;
      })
    : allContracts;

  const { data: requests } = useQuery({
    queryKey: ["/api/requests"],
    retry: false,
  });

  const { data: vessels } = useQuery({
    queryKey: ["/api/vessels"],
    retry: false,
  });

  const {
    data: lettersOfCredit = [],
    isLoading: lettersOfCreditLoading,
  } = useQuery({
    queryKey: ["/api/letters-of-credit", { flow: "UPF_TO_SUPPLIER" }],
    enabled: showOpenLcDialog,
    select: (data: any) => (Array.isArray(data) ? data : []),
  });

  const normalizedLettersOfCredit = useMemo(
    () => (Array.isArray(lettersOfCredit) ? lettersOfCredit.map((entry: any) => normalizeLc(entry)) : []),
    [lettersOfCredit],
  );

  const matchingLettersOfCredit = useMemo(() => {
    if (!contractForOpenLc) {
      return [] as {
        id: string;
        lc: ReturnType<typeof normalizeLc>;
        totalQuantity: number;
        allocatedQuantity: number;
        remainingQuantity: number;
      }[];
    }

    const normalizedCargo = (contractForOpenLc.cargoType ?? "")
      .toString()
      .trim()
      .toLowerCase();

    return normalizedLettersOfCredit
      .map((lc) => {
        const rawId = lc.id ?? lc.number ?? "";
        const id = String(rawId);
        const totalQuantity = Number.isFinite(lc.quantity ?? 0) ? Number(lc.quantity ?? 0) : 0;
        const allocatedQuantity = Number.isFinite(lc.allocatedQuantity ?? 0) ? Number(lc.allocatedQuantity ?? 0) : 0;
        const remainingQuantity = Math.max(totalQuantity - allocatedQuantity, 0);

        return {
          id,
          lc,
          totalQuantity,
          allocatedQuantity,
          remainingQuantity,
        };
      })
      .filter(({ lc, remainingQuantity }) => {
        if (lc.flowKey !== "upf_to_supplier") {
          return false;
        }

        if (remainingQuantity <= 0) {
          return false;
        }

        const lcCargo = (lc.cargoType ?? "").toString().trim().toLowerCase();
        return !normalizedCargo || lcCargo === normalizedCargo;
      })
      .sort((a, b) => {
        if (b.remainingQuantity !== a.remainingQuantity) {
          return b.remainingQuantity - a.remainingQuantity;
        }

        return a.id.localeCompare(b.id);
      });
  }, [contractForOpenLc, normalizedLettersOfCredit]);

  useEffect(() => {
    if (!showOpenLcDialog) {
      setSelectedLcId("");
      return;
    }

    if (matchingLettersOfCredit.length === 0) {
      setSelectedLcId("");
      return;
    }

    setSelectedLcId((current) => {
      if (current && matchingLettersOfCredit.some((item) => item.id === current)) {
        return current;
      }

      return matchingLettersOfCredit[0]?.id ?? "";
    });
  }, [showOpenLcDialog, matchingLettersOfCredit]);

  const handleCloseOpenLcDialog = () => {
    setShowOpenLcDialog(false);
    setContractForOpenLc(null);
    setSelectedLcId("");
  };

  const handleConfirmOpenLc = () => {
    const selected = matchingLettersOfCredit.find((item) => item.id === selectedLcId);

    if (!selected) {
      toast({
        title: "Select a letter of credit",
        description: "Choose a letter of credit to continue.",
        variant: "destructive",
      });
      return;
    }

    const contractIdLabel = contractForOpenLc?.publicId
      ? String(contractForOpenLc.publicId)
      : contractForOpenLc?.id
        ? `CON-${String(contractForOpenLc.id).padStart(3, "0")}`
        : "this contract";

    toast({
      title: "Letter of credit selected",
      description: `${selected.lc.number} is ready to proceed for ${contractIdLabel}.`,
    });

    handleCloseOpenLcDialog();
  };

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
        redirectToLogin();
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
        redirectToLogin();
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
        redirectToLogin();
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  const calculateContractStatus = (contract: any, vessels: any[]) => {
    if (!vessels) return "started";

    const contractVessels = vessels.filter(vessel => vessel.contractId === contract.id);
    const allocatedQuantity = contractVessels.reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);
    
    if (contractVessels.length === 0) {
      return "started";
    } else if (allocatedQuantity >= contract.quantity) {
      return "completed";
    } else {
      return "in progress";
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
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                      <TableHead>Contract ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Cargo Type</TableHead>
                      <TableHead>Country of Origin</TableHead>
                      <TableHead>Quantity (tons)</TableHead>
                      <TableHead>Price per Unit</TableHead>
                      <TableHead>Shipping Method</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(contracts as any[]).map((contract: any) => {
                      const cargoTypeLabel = contract.cargoType
                        ? getOptionLabel(CARGO_TYPES, contract.cargoType)
                        : "-";
                      const countryLabel = contract.countryOfOrigin || "-";
                      const shippingMethodLabel = contract.shippingMethod
                        ? getOptionLabel(CONTRACT_SHIPPING_METHODS, contract.shippingMethod)
                        : "-";
                      const paymentMethodLabel = contract.paymentMethod
                        ? getOptionLabel(CONTRACT_PAYMENT_METHODS, contract.paymentMethod)
                        : "-";

                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.publicId ?? `CON-${contract.id.toString().padStart(3, "0")}`}
                          </TableCell>
                          <TableCell>{contract.supplierName || '-'}</TableCell>
                          <TableCell>{cargoTypeLabel}</TableCell>
                          <TableCell>{countryLabel}</TableCell>
                          <TableCell>
                            {contract.quantity ? contract.quantity.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            {contract.pricePerTon ? `$${Number(contract.pricePerTon).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>{shippingMethodLabel}</TableCell>
                          <TableCell>{paymentMethodLabel}</TableCell>
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

                              <Button
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                onClick={() => {
                                  setContractForOpenLc(contract);
                                  setShowOpenLcDialog(true);
                                }}
                                title="Open letter of credit"
                              >
                                <FilePlus2 size={14} className="mr-1" />
                                Open LC
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
                      );
                    })}
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

          <Dialog open={showOpenLcDialog} onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleCloseOpenLcDialog();
            } else {
              setShowOpenLcDialog(true);
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Letter of Credit</DialogTitle>
              </DialogHeader>

              {contractForOpenLc && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary-600">Contract</p>
                    <div className="mt-2 text-sm text-secondary-600">
                      <div className="font-semibold text-secondary-900">
                        {contractForOpenLc.publicId ?? `CON-${String(contractForOpenLc.id ?? "").padStart(3, "0")}`}
                      </div>
                      <div>
                        Supplier: {contractForOpenLc.supplierName || "—"}
                      </div>
                      <div>
                        Cargo Type: {getOptionLabel(CARGO_TYPES, contractForOpenLc.cargoType) || "—"}
                      </div>
                      <div>
                        Quantity: {contractForOpenLc.quantity ? Number(contractForOpenLc.quantity).toLocaleString() : "—"} tons
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900">Available letters of credit</h4>
                      <p className="text-xs text-secondary-600">
                        Showing UPF → Supplier LCs that match the contract cargo type and still have remaining quantity.
                      </p>
                    </div>

                    {lettersOfCreditLoading ? (
                      <div className="flex items-center justify-center rounded-lg border border-secondary-200 bg-white p-6 text-secondary-600">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading letters of credit…
                      </div>
                    ) : matchingLettersOfCredit.length > 0 ? (
                      <RadioGroup value={selectedLcId} onValueChange={setSelectedLcId} className="space-y-3">
                        {matchingLettersOfCredit.map(({ id, lc, totalQuantity, remainingQuantity }) => (
                          <Label
                            key={id}
                            htmlFor={`lc-option-${id}`}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-secondary-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow"
                          >
                            <RadioGroupItem id={`lc-option-${id}`} value={id} className="mt-1" />
                            <div className="flex flex-1 flex-col gap-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-secondary-900">{lc.number}</p>
                                  <p className="text-xs text-secondary-600">
                                    {lc.supplierName ? `Supplier: ${lc.supplierName}` : "Supplier not specified"}
                                  </p>
                                </div>
                                <StatusBadge status={lc.status} />
                              </div>
                              <div className="grid gap-2 text-xs text-secondary-600 sm:grid-cols-3">
                                <div>
                                  <span className="font-medium text-secondary-800">Total Quantity:</span> {totalQuantity.toLocaleString()} tons
                                </div>
                                <div>
                                  <span className="font-medium text-secondary-800">Remaining:</span> {remainingQuantity.toLocaleString()} tons
                                </div>
                                <div>
                                  <span className="font-medium text-secondary-800">Expiry:</span> {formatLcDate(lc.expiryDate)}
                                </div>
                              </div>
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        No matching letters of credit with remaining quantity are currently available for this contract.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={handleCloseOpenLcDialog}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmOpenLc} disabled={matchingLettersOfCredit.length === 0}>
                  Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
