import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, Package, Truck, User, FileText, ExternalLink, Ship } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/ui/status-badge";

interface ContractSummaryProps {
  contract: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractSummary({ contract, isOpen, onClose }: ContractSummaryProps) {
  if (!contract) return null;

  // Fetch vessels associated with this contract
  const { data: vessels } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isOpen && !!contract.id,
  });

  // Filter vessels for this contract
  const contractVessels = vessels ? (vessels as any[]).filter(vessel => vessel.contractId === contract.id) : [];
  
  // Calculate total vessel quantities and remaining
  const totalVesselQuantity = contractVessels.reduce((sum, vessel) => sum + (vessel.quantity || 0), 0);
  const remainingQuantity = (contract.quantity || 0) - totalVesselQuantity;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Contract Summary - CON-{contract.id?.toString().padStart(3, '0')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(contract.status)}>
              {contract.status?.charAt(0).toUpperCase() + contract.status?.slice(1)}
            </Badge>
            {contract.createdAt && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(contract.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900">Supplier</h4>
                <p className="text-gray-700">{contract.supplierName}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                

                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cargo Type:</span>
                    <p className="text-gray-900">{contract.cargoType}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Quantity:</span>
                    <p className="text-gray-900">{contract.quantity} tons</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Incoterms:</span>
                    <p className="text-gray-900">{contract.incoterms}</p>
                  </div>
                </div>
              </div>

              {contract.contractTerms && (
                <div>
                  <h4 className="font-semibold text-gray-900">Contract Terms</h4>
                  <p className="text-gray-700">{contract.contractTerms}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Document */}
          {contract.uploadedFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Contract Document</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{contract.uploadedFile}</span>
                    <Badge variant="outline">
                      {contract.documentStatus || 'Active'}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/uploads/${contract.uploadedFile}`;
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

          {/* Contract Dates */}
          {(contract.startDate || contract.endDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contract.startDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Import Start Date:</span>
                        <p className="text-gray-900">{new Date(contract.startDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {contract.endDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Import End Date:</span>
                        <p className="text-gray-900">{new Date(contract.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Created By */}
          {contract.createdByUser && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Created By</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {contract.createdByUser.firstName} {contract.createdByUser.lastName}
                  </span>
                  <Badge variant="outline">{contract.createdByUser.role}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Associated Vessels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Ship className="h-5 w-5" />
                <span>Associated Vessels</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Contract Quantity</div>
                    <div className="text-xl font-bold text-blue-900">{contract.quantity || 0} tons</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Allocated</div>
                    <div className="text-xl font-bold text-green-900">{totalVesselQuantity} tons</div>
                  </div>
                  <div className={`p-4 rounded-lg ${remainingQuantity > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <div className={`text-sm font-medium ${remainingQuantity > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      Remaining
                    </div>
                    <div className={`text-xl font-bold ${remainingQuantity > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
                      {remainingQuantity} tons
                    </div>
                  </div>
                </div>

                {/* Vessels Table */}
                {contractVessels.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vessel Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ETA</TableHead>
                        <TableHead>Route</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractVessels.map((vessel: any) => (
                        <TableRow key={vessel.id}>
                          <TableCell className="font-medium">{vessel.vesselName}</TableCell>
                          <TableCell>{vessel.quantity || 0} tons</TableCell>
                          <TableCell>
                            <StatusBadge status={vessel.status} type="vessel" />
                          </TableCell>
                          <TableCell>
                            {vessel.eta ? new Date(vessel.eta).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {vessel.portOfLoading} → {vessel.portOfDischarge}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Ship className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p>No vessels nominated for this contract yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review Notes */}
          {contract.reviewNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{contract.reviewNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}