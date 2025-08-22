import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import StatementOfNeedsForm from "@/components/forms/statement-of-needs-form";
import DocumentVoting from "@/components/document-voting";
import RequestVoting, { RequestVotingContent, RequestVoteButton } from "@/components/request-voting";
import RequestSummary from "@/components/request-summary";
import StatusChangeDropdown from "@/components/ui/status-change-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Edit, Trash, Settings, Vote, Eye, MessageSquare } from "lucide-react";

export default function Requests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusEditingRequest, setStatusEditingRequest] = useState<any>(null);
  const [showVotingDialog, setShowVotingDialog] = useState(false);
  const [votingRequest, setVotingRequest] = useState<any>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryRequest, setSummaryRequest] = useState<any>(null);

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

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/requests", statusFilter !== "all" ? { status: statusFilter } : {}],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Success",
        description: "Request deleted successfully",
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
        description: "Failed to delete request",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PUT", `/api/requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
      setShowStatusDialog(false);
      setStatusEditingRequest(null);
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
        description: "Failed to update request status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout title="Contract Requests" subtitle="Manage statements of needs and contract requests">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-black w-full sm:w-auto">
                  <Plus className="mr-2" size={16} />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Import Request</DialogTitle>
                </DialogHeader>
                <StatementOfNeedsForm 
                  onSuccess={() => setShowCreateDialog(false)}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Request Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Contract Request</DialogTitle>
              </DialogHeader>
              {editingRequest && (
                <StatementOfNeedsForm 
                  request={editingRequest}
                  onSuccess={() => {
                    setShowEditDialog(false);
                    setEditingRequest(null);
                  }}
                  onCancel={() => {
                    setShowEditDialog(false);
                    setEditingRequest(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Change Status Dialog */}
          <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Change Request Status</DialogTitle>
              </DialogHeader>
              {statusEditingRequest && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Current status: <Badge className={getStatusColor(statusEditingRequest?.status ?? "") }>
                        {statusEditingRequest?.status
                          ? statusEditingRequest.status.charAt(0).toUpperCase() + statusEditingRequest.status.slice(1)
                          : "Unknown"}
                      </Badge>
                    </p>
                    <p className="text-sm font-medium">Request: {statusEditingRequest.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">New Status:</label>
                    <Select 
                      onValueChange={(value) => {
                        updateStatusMutation.mutate({ 
                          id: statusEditingRequest.id, 
                          status: value 
                        });
                      }}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowStatusDialog(false);
                        setStatusEditingRequest(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Document Voting Dialog */}
          <Dialog open={showVotingDialog} onOpenChange={setShowVotingDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Document Voting - {votingRequest?.title}</DialogTitle>
              </DialogHeader>
              {votingRequest && (
                <DocumentVoting 
                  entityType="request"
                  entityId={votingRequest.id}
                  allowVoting={(user as any)?.role === 'admin' || (user as any)?.role === 'manager'}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Requests Table */}
          <Card className="bg-white border border-secondary-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-secondary-900">
                Contract Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-secondary-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : requests && Array.isArray(requests) && requests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price per Ton (USD)</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Recommend on Doc</TableHead>
                      <TableHead>Request opinions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(requests) && requests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.title}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.description}
                        </TableCell>
                        <TableCell>
                          {request.supplierName || '-'}
                        </TableCell>
                        <TableCell>
                          {request.quantity} {request.unitOfMeasure}
                        </TableCell>
                        <TableCell>
                          ${parseFloat(request.pricePerTon || request.estimatedValue).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(request.priority ?? "") }>
                            {request.priority
                              ? request.priority.charAt(0).toUpperCase() + request.priority.slice(1)
                              : "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-2">
                            <Badge className={getStatusColor(request.status ?? "") }>
                              {request.status
                                ? request.status.charAt(0).toUpperCase() + request.status.slice(1)
                                : "Unknown"}
                            </Badge>
                            {['admin', 'manager', 'procurement_officer'].includes((user as any)?.role || '') && (
                              <StatusChangeDropdown
                                entityType="request"
                                entityId={request.id}
                                currentStatus={request.status}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.status !== 'applied' ? (
                            <RequestVoteButton 
                              requestId={request.id}
                              currentUserId={(user as any)?.id}
                            />
                          ) : (
                            <span className="text-gray-500 text-sm">Hidden (status: applied)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {request.status !== 'applied' ? (
                              <>
                                {/* View Opinions Button - Shows summary and all votes */}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200">
                                      <MessageSquare size={14} />
                                      <span>View Opinions</span>
                                    </Button>
                                  </DialogTrigger>
                                  
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Import Request Opinions</DialogTitle>
                                    </DialogHeader>
                                    <RequestVotingContent 
                                      requestId={request.id}
                                      currentUserId={(user as any)?.id}
                                    />
                                  </DialogContent>
                                </Dialog>
                              </>
                            ) : (
                              <span className="text-gray-500 text-sm">Hidden (status: applied)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                              onClick={() => {
                                setSummaryRequest(request);
                                setShowSummaryDialog(true);
                              }}
                              title="View request summary"
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => {
                                setEditingRequest(request);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            {((user as any)?.role === 'admin' || (user as any)?.role === 'procurement_officer') && (
                              <Button 
                                size="sm" 
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => {
                                  setStatusEditingRequest(request);
                                  setShowStatusDialog(true);
                                }}
                              >
                                <Settings size={14} />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this request?")) {
                                  deleteMutation.mutate(request.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Delete request"
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
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">No requests found</h3>
                  <p className="mt-2 text-secondary-600">
                    {statusFilter === "all" 
                      ? "Get started by creating your first contract request." 
                      : `No requests with status "${statusFilter}" found.`}
                  </p>
                  <Button 
                    className="mt-4 bg-primary-500 hover:bg-primary-600 text-black"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="mr-2" size={16} />
                    Create New Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Summary Dialog */}
          <RequestSummary 
            request={summaryRequest}
            isOpen={showSummaryDialog}
            onClose={() => {
              setShowSummaryDialog(false);
              setSummaryRequest(null);
            }}
          />
    </MainLayout>
  );
}
