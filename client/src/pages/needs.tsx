import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import NeedsForm from "@/components/forms/needs-form";
import StatusChangeDropdown from "@/components/ui/status-change-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash, Settings, Eye, Calendar, Package, TrendingUp } from "lucide-react";
import { format, isValid } from "date-fns";
import type { Need } from "@/lib/schemas";

export default function Needs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNeed, setEditingNeed] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusEditingNeed, setStatusEditingNeed] = useState<any>(null);

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

  // Fetch needs
  const { data: needs = [], isLoading: needsLoading, error } = useQuery<Need[]>({
    queryKey: ['/api/needs'],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Session Expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Create need mutation
  const createNeedMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/needs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/needs'] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Need created successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error("Error creating need:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create need",
        variant: "destructive",
      });
    },
  });

  // Update need mutation
  const updateNeedMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/needs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/needs'] });
      setShowEditDialog(false);
      setEditingNeed(null);
      toast({
        title: "Success",
        description: "Need updated successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update need",
        variant: "destructive",
      });
    },
  });

  // Update need status mutation
  const updateNeedStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest('PATCH', `/api/needs/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/needs'] });
      setShowStatusDialog(false);
      setStatusEditingNeed(null);
      toast({
        title: "Success",
        description: "Need status updated successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update need status",
        variant: "destructive",
      });
    },
  });

  // Delete need mutation
  const deleteNeedMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/needs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/needs'] });
      toast({
        title: "Success",
        description: "Need deleted successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete need",
        variant: "destructive",
      });
    },
  });

  // Filter needs based on category
  const filteredNeeds = needs.filter((need: Need) => {
    if (categoryFilter === "all") return true;
    return need.category === categoryFilter;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "in_progress": return "secondary";
      case "fulfilled": return "secondary";
      case "expired": return "destructive";
      case "cancelled": return "destructive";
      default: return "default";
    }
  };


  if (isLoading || needsLoading) {
    return (
      <MainLayout title="Needs Management" subtitle="Loading...">
        <div className="p-6">
          <div className="text-center">Loading needs...</div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <MainLayout title="Needs Management" subtitle="Not authenticated">
        <div></div>
      </MainLayout>
    );
  }

  // Calculate category summaries
  const categoryStats = needs.reduce((acc, need) => {
    const category = need.category || 'Other';
    if (!acc[category]) {
      acc[category] = {
        totalNeeded: 0,
        totalReceived: 0,
        unitOfMeasure: need.unitOfMeasure || 'units'
      };
    }
    acc[category].totalNeeded += need.requiredQuantity || 0;
    acc[category].totalReceived += parseFloat((need as any).actualQuantityReceived || '0') || 0;
    return acc;
  }, {} as Record<string, { totalNeeded: number; totalReceived: number; unitOfMeasure: string }>);

  return (
    <MainLayout title="Needs Management" subtitle="Capture and track requirements that drive import requests">
      <div className="p-6 space-y-6">
        {/* Category Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(categoryStats).map(([category, stats]) => {
            const completionPercentage = stats.totalNeeded > 0 ? (stats.totalReceived / stats.totalNeeded) * 100 : 0;
            return (
              <Card key={category} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="capitalize">{category}</span>
                    <Package className="h-5 w-5 text-gray-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Needed:</span>
                      <span className="font-semibold">{stats.totalNeeded.toLocaleString()} {stats.unitOfMeasure}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Received:</span>
                      <span className="font-semibold text-green-600">{stats.totalReceived.toLocaleString()} {stats.unitOfMeasure}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-semibold text-orange-600">{Math.max(0, stats.totalNeeded - stats.totalReceived).toLocaleString()} {stats.unitOfMeasure}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{completionPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(completionPercentage, 100)} className="h-2" />
                  </div>
                  <Badge 
                    variant={completionPercentage >= 100 ? "default" : completionPercentage >= 50 ? "secondary" : "destructive"}
                    className="w-full justify-center"
                  >
                    {completionPercentage >= 100 ? "Complete" : completionPercentage >= 50 ? "In Progress" : "Pending"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Need
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Need</DialogTitle>
              </DialogHeader>
              <NeedsForm
                onSubmit={(data: any) => createNeedMutation.mutate(data)}
                isLoading={createNeedMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>


        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="category-filter">Filter by Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(needs.map(need => need.category).filter(Boolean)))
                      .sort()
                      .map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Needs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Needs ({filteredNeeds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fulfillment Period</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNeeds.map((need: Need) => (
                    <TableRow key={need.id}>
                      <TableCell className="font-medium">{need.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{need.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {need.requiredQuantity} {need.unitOfMeasure}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={parseFloat(need.progressPercentage)} className="w-16" />
                          <div className="text-xs text-muted-foreground">
                            {need.actualQuantityReceived}/{need.requiredQuantity}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(need.status)}>
                          {need.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {(() => {
                              const start = need.fulfillmentStartDate
                                ? new Date(need.fulfillmentStartDate)
                                : null;
                              return start && isValid(start)
                                ? format(start, 'MMM dd, yyyy')
                                : 'N/A';
                            })()}
                          </div>
                          <div className="text-muted-foreground">to</div>
                          <div>
                            {(() => {
                              const end = need.fulfillmentEndDate
                                ? new Date(need.fulfillmentEndDate)
                                : null;
                              return end && isValid(end)
                                ? format(end, 'MMM dd, yyyy')
                                : 'N/A';
                            })()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Need Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div><strong>Description:</strong> {need.description}</div>
                                <div><strong>Category:</strong> {need.category}</div>
                                <div><strong>Required Quantity:</strong> {need.requiredQuantity} {need.unitOfMeasure}</div>
                                <div><strong>Max Price per Unit:</strong> ${need.maxPricePerUnit}</div>
                                <div><strong>Department:</strong> {need.departmentCode}</div>
                                <div><strong>Progress:</strong> {need.progressPercentage}%</div>
                                {need.notes && <div><strong>Notes:</strong> {need.notes}</div>}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showEditDialog && editingNeed?.id === need.id} 
                                  onOpenChange={(open) => {
                                    setShowEditDialog(open);
                                    if (!open) setEditingNeed(null);
                                  }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingNeed(need)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Need</DialogTitle>
                              </DialogHeader>
                                <NeedsForm
                                  defaultValues={need as any}
                                  onSubmit={(data: any) => updateNeedMutation.mutate({ id: need.id, data })}
                                  isLoading={updateNeedMutation.isPending}
                                />
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showStatusDialog && statusEditingNeed?.id === need.id}
                                  onOpenChange={(open) => {
                                    setShowStatusDialog(open);
                                    if (!open) setStatusEditingNeed(null);
                                  }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setStatusEditingNeed(need)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Change Need Status</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Label>Change Status</Label>
                                <Select
                                  value={need.status}
                                  onValueChange={(status) => updateNeedStatusMutation.mutate({ id: need.id, status })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this need?')) {
                                deleteNeedMutation.mutate(need.id);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}