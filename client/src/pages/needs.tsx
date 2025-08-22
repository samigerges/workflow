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
import { format } from "date-fns";
import type { Need } from "@shared/schema";

export default function Needs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Filter needs based on status
  const filteredNeeds = needs.filter((need: Need) => {
    if (statusFilter === "all") return true;
    return need.status === statusFilter;
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

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
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

  return (
    <MainLayout title="Needs Management" subtitle="Capture and track requirements that drive import requests">
      <div className="p-6 space-y-6">
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

        {/* Enhanced Stats Cards with Cargo Quantities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Required Quantity Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Required</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {needs.reduce((sum, need) => sum + (need.requiredQuantity || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {needs.length} needs
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Units: {Array.from(new Set(needs.map(n => n.unitOfMeasure).filter(Boolean))).join(', ') || 'Various'}
              </div>
            </CardContent>
          </Card>
          
          {/* Active Quantities Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cargo</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {needs
                  .filter((need: Need) => need.status === 'active')
                  .reduce((sum, need) => sum + (need.requiredQuantity || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {needs.filter((need: Need) => need.status === 'active').length} active needs
              </p>
              <div className="mt-2">
                <div className="w-full bg-green-100 dark:bg-green-900/20 rounded-full h-1.5">
                  <div 
                    className="bg-green-600 h-1.5 rounded-full transition-all" 
                    style={{ 
                      width: `${needs.length > 0 ? (needs.filter(n => n.status === 'active').length / needs.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* In Progress Quantities Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {needs
                  .filter((need: Need) => need.status === 'in_progress')
                  .reduce((sum, need) => sum + (need.requiredQuantity || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {needs.filter((need: Need) => need.status === 'in_progress').length} in progress
              </p>
              <div className="mt-2">
                <div className="w-full bg-blue-100 dark:bg-blue-900/20 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all" 
                    style={{ 
                      width: `${needs.length > 0 ? (needs.filter(n => n.status === 'in_progress').length / needs.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Fulfilled vs Required Progress Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fulfillment Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {needs.reduce((sum, need) => sum + (need.actualQuantityReceived || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                of {needs.reduce((sum, need) => sum + (need.requiredQuantity || 0), 0).toLocaleString()} required
              </p>
              <div className="mt-2">
                <div className="w-full bg-purple-100 dark:bg-purple-900/20 rounded-full h-1.5">
                  <div 
                    className="bg-purple-600 h-1.5 rounded-full transition-all" 
                    style={{ 
                      width: `${(() => {
                        const totalRequired = needs.reduce((sum, need) => sum + (need.requiredQuantity || 0), 0);
                        const totalReceived = needs.reduce((sum, need) => sum + (need.actualQuantityReceived || 0), 0);
                        return totalRequired > 0 ? (totalReceived / totalRequired) * 100 : 0;
                      })()}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  {(() => {
                    const totalRequired = needs.reduce((sum, need) => sum + (need.requiredQuantity || 0), 0);
                    const totalReceived = needs.reduce((sum, need) => sum + (need.actualQuantityReceived || 0), 0);
                    return totalRequired > 0 ? Math.round((totalReceived / totalRequired) * 100) : 0;
                  })()}% completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cargo Categories Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Cargo Categories Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(
                needs.reduce((acc: Record<string, { count: number; quantity: number; unit: string; received: number }>, need) => {
                  const category = need.category || 'Uncategorized';
                  const unit = need.unitOfMeasure || '';
                  if (!acc[category]) {
                    acc[category] = { count: 0, quantity: 0, unit: unit, received: 0 };
                  }
                  acc[category].count++;
                  acc[category].quantity += need.requiredQuantity || 0;
                  acc[category].received += need.actualQuantityReceived || 0;
                  return acc;
                }, {})
              ).map(([category, data]) => (
                <div key={category} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium capitalize">{category}</h3>
                    <Badge variant="outline">{data.count} needs</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Required:</span>
                      <span className="font-medium">
                        {data.quantity.toLocaleString()} {data.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Received:</span>
                      <span className="font-medium text-green-600">
                        {data.received.toLocaleString()} {data.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all" 
                        style={{ 
                          width: `${data.quantity > 0 ? (data.received / data.quantity) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {data.quantity > 0 ? Math.round((data.received / data.quantity) * 100) : 0}% fulfilled
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                    <TableHead>Priority</TableHead>
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
                        <Badge variant={getPriorityBadgeVariant(need.priority)}>
                          {need.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(need.status)}>
                          {need.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(need.fulfillmentStartDate), 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">to</div>
                          <div>{format(new Date(need.fulfillmentEndDate), 'MMM dd, yyyy')}</div>
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
                                defaultValues={need}
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