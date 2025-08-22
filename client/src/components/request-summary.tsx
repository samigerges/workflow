import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Package, Truck, User, FileText, MapPin, ExternalLink, Building } from "lucide-react";

interface RequestSummaryProps {
  request: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestSummary({ request, isOpen, onClose }: RequestSummaryProps) {
  if (!request) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Contract Request Summary - REQ-{request.id?.toString().padStart(3, '0')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(request.status)}>
              {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
            </Badge>
            <Badge className={getPriorityColor(request.priority)}>
              {request.priority?.charAt(0).toUpperCase() + request.priority?.slice(1)} Priority
            </Badge>
            {request.createdAt && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900">Title</h4>
                <p className="text-gray-700">{request.title}</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900">Description</h4>
                <p className="text-gray-700">{request.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cargo Type:</span>
                    <p className="text-gray-900">{request.cargoType}</p>
                  </div>
                </div>

                {request.supplierName && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">Supplier:</span>
                      <p className="text-gray-900">{request.supplierName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Price per Ton:</span>
                    <p className="text-gray-900">${request.pricePerTon} USD</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Quantity:</span>
                    <p className="text-gray-900">{request.quantity} {request.unitOfMeasure}</p>
                  </div>
                </div>

                {request.requiredDeliveryDate && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">Required Delivery:</span>
                      <p className="text-gray-900">{new Date(request.requiredDeliveryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {request.departmentCode && (
                <div>
                  <h4 className="font-semibold text-gray-900">Department/Project Code</h4>
                  <p className="text-gray-700">{request.departmentCode}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Information */}
          {request.uploadedFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Attached Document</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{request.uploadedFile}</span>
                    <Badge variant="outline">
                      {request.documentStatus || 'Pending Review'}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/uploads/${request.uploadedFile}`;
                      link.target = '_blank';
                      link.click();
                    }}
                    className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    View Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Price per Ton</p>
                  <p className="text-2xl font-bold text-blue-900">${request.pricePerTon}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-green-900">{request.quantity}</p>
                  <p className="text-sm text-green-700">{request.unitOfMeasure}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-600">Estimated Value</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ${(parseFloat(request.pricePerTon) * parseInt(request.quantity)).toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-700">USD</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Created By */}
          {request.createdByUser && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Request Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {request.createdByUser.firstName} {request.createdByUser.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{request.createdByUser.email}</p>
                    <p className="text-sm text-gray-500">
                      Submitted on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}