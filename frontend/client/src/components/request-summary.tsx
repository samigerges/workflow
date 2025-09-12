import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Package, Truck, User, FileText, MapPin, ExternalLink, Building, MessageSquare, CheckCircle, XCircle } from "lucide-react";

interface RequestSummaryProps {
  request: any;
  isOpen: boolean;
  onClose: () => void;
}

interface RequestVote {
  id: number;
  requestId: number;
  userId: string;
  vote: 'yes' | 'no';
  comment?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  lc: "Letter of Credit (LC)",
  "lc_sight": "LC at Sight",
  "lc_usance": "LC Usance",
  tt: "Telegraphic Transfer (TT)",
  cash: "Cash",
  credit: "Credit",
};

const SHIPPING_LABELS: Record<string, string> = {
  fob: "FOB",
  cif: "CIF",
  cnf: "CNF",
  air: "Air Freight",
  sea: "Sea Freight",
  "door_to_door": "Door-to-door",
  roro: "Roll-on / Roll-off",
};

// Map department keys to badge colors
const DEPARTMENT_COLORS: Record<string, string> = {
  supply_chain: "bg-yellow-100 text-yellow-800",
  finance: "bg-green-100 text-green-800",
  legal: "bg-red-100 text-red-800",
  Colnel_Wael: "bg-blue-100 text-blue-800",
  General_Hazem: "bg-purple-100 text-purple-800",
  default: "bg-gray-100 text-gray-800",
};

function formatDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function formatNumber(value: any) {
  if (value === undefined || value === null || value === "") return "-";
  const n = Number(value);
  return isNaN(n) ? String(value) : n.toLocaleString();
}

export default function RequestSummary({ request, isOpen, onClose }: RequestSummaryProps) {
  if (!request) return null;

  // Fetch votes for this request
  const { data: votesData } = useQuery({
    queryKey: [`/api/requests/${request.id}/votes`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/requests/${request.id}/votes`);
      return response.json();
    },
    enabled: isOpen && !!request.id, // Only fetch when dialog is open and request has an ID
    staleTime: 0,
  });

  const votes: RequestVote[] = votesData || [];

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pricePerTonNum = Number(request.pricePerTon) || 0;
  const quantityNum = Number(request.quantity) || 0;
  const estimatedValue = pricePerTonNum * quantityNum;

  const paymentLabel = request.paymentMethod ? (PAYMENT_LABELS[request.paymentMethod] ?? request.paymentMethod) : null;
  const shippingLabel = request.shippingMethod ? (SHIPPING_LABELS[request.shippingMethod] ?? request.shippingMethod) : null;

  // Determine current department: look for common fields, else fall back to status
  const deptKey = (request.currentDepartment || request.department || request.departmentKey || request.status || "").toString().toLowerCase();
  const deptLabel = request.currentDepartment || request.department || request.status || 'Unknown';
  const deptColor = DEPARTMENT_COLORS[deptKey] ?? DEPARTMENT_COLORS.default;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Contract Request Summary - REQ-{String(request.id ?? '').padStart(3, '0')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Top row: Current Department, Priority, Created date, + Payment & Shipping */}
          <div className="flex items-center flex-wrap gap-3">
            <Badge className={deptColor}>
              {deptLabel ? String(deptLabel).charAt(0).toUpperCase() + String(deptLabel).slice(1) : 'Unknown'}
            </Badge>

            <Badge className={getPriorityColor(request.priority)}>
              {request.priority ? request.priority.charAt(0).toUpperCase() + request.priority.slice(1) : 'N/A'} Priority
            </Badge>

            {request.createdAt && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {formatDate(request.createdAt)}</span>
              </div>
            )}

            {/* NEW: Payment Method (compact) */}
            {paymentLabel && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md border border-gray-200 bg-white">
                <DollarSign className="h-4 w-4 text-gray-600" />
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Payment</div>
                  <div className="text-sm text-gray-900">{paymentLabel}</div>
                </div>
              </div>
            )}

            {/* NEW: Shipping Method (compact) */}
            {shippingLabel && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md border border-gray-200 bg-white">
                <Truck className="h-4 w-4 text-gray-600" />
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Shipping</div>
                  <div className="text-sm text-gray-900">{shippingLabel}</div>
                </div>
              </div>
            )}
          </div>

          {/* Basic Information - now shows all fields from the form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Grid of all form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cargo Type */}
                <div className="flex items-start space-x-3">
                  <Package className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Cargo Type</p>
                    <p className="text-gray-900">{request.cargoType ?? "-"}</p>
                  </div>
                </div>

                {/* Supplier */}
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Supplier</p>
                    <p className="text-gray-900">{request.supplierName ?? "-"}</p>
                  </div>
                </div>

                {/* Country of Origin */}
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Country of Origin</p>
                    <p className="text-gray-900">{request.countryOfOrigin ?? "-"}</p>
                  </div>
                </div>

                {/* Unit of Measure */}
                <div className="flex items-start space-x-3">
                  <Truck className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Unit of Measure</p>
                    <p className="text-gray-900">{request.unitOfMeasure ?? "-"}</p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-start space-x-3">
                  <Truck className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="text-gray-900">{formatNumber(request.quantity)} {request.unitOfMeasure ? "" : ""}</p>
                  </div>
                </div>

                {/* Price per unit */}
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Price per Unit (USD)</p>
                    <p className="text-gray-900">{request.pricePerTon ? `$${formatNumber(request.pricePerTon)}` : "-"}</p>
                  </div>
                </div>

                {/* Start Date */}
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-gray-900">{formatDate(request.startDate)}</p>
                  </div>
                </div>

                {/* End Date */}
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="text-gray-900">{formatDate(request.endDate)}</p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="text-gray-900">{paymentLabel ?? "-"}</p>
                  </div>
                </div>

                {/* Shipping Method */}
                <div className="flex items-start space-x-3">
                  <Truck className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Shipping Method</p>
                    <p className="text-gray-900">{shippingLabel ?? "-"}</p>
                  </div>
                </div>


                {/* Document Status */}
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Document Status</p>
                    <p className="text-gray-900">{request.documentStatus ?? "-"}</p>
                  </div>
                </div>

                {/* Any other common fields (fallback display) */}
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Reference / Other</p>
                    <p className="text-gray-900">{request.referenceNumber ?? request.externalRef ?? "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Information (kept for visual separation) */}
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
                      link.rel = 'noopener noreferrer';
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
                  <p className="text-2xl font-bold text-blue-900">${pricePerTonNum.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-green-900">{quantityNum}</p>
                  <p className="text-sm text-green-700">{request.unitOfMeasure || ''}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-600">Estimated Value</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ${estimatedValue.toLocaleString()}
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
                      Submitted on {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opinions Section */}
          {votes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Request Opinions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Opinion Statistics */}
                <div className="flex items-center space-x-6 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Approved: {votes.filter((vote: RequestVote) => vote.vote === 'yes').length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Rejected: {votes.filter((vote: RequestVote) => vote.vote === 'no').length}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Opinions: {votes.length}</span>
                  </div>
                </div>

                {/* All Opinions */}
                <div className="space-y-4">
                  <h4 className="font-medium">All Opinions:</h4>
                  {votes.map((vote: RequestVote) => (
                    <div key={vote.id} className="border-l-4 border-gray-200 pl-4 py-2">
                      <div className="flex items-center space-x-2 mb-1">
                        {vote.vote === 'yes' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          {vote.user?.firstName} {vote.user?.lastName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {vote.vote === 'yes' ? 'approved' : 'rejected'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(vote.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {vote.comment && (
                        <p className="text-gray-700 text-sm ml-6">{vote.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
