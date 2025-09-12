import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, Package, Truck, User, FileText, ExternalLink, Ship, University } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/ui/status-badge";

interface LCSummaryProps {
  lc: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function LCSummary({ lc, isOpen, onClose }: LCSummaryProps) {
  if (!lc) return null;

  // Fetch vessels associated with this LC via the junction table
  const { data: vessels } = useQuery({
    queryKey: ["/api/vessels"],
    enabled: isOpen && !!lc.id,
  });

  // Fetch LC-vessel relationships
  const { data: lcVesselRelations, isLoading: lcVesselRelationsLoading } = useQuery({
    queryKey: [`/api/letters-of-credit/${lc.id}/vessels`],
    enabled: isOpen && !!lc.id,
  });
  
  // Debug logging
  console.log("LC ID:", lc.id);
  console.log("LC vessel relations:", lcVesselRelations);
  console.log("Vessels data:", vessels);

  // Get vessels that are associated with this LC
  const lcVessels = vessels && lcVesselRelations ? 
    (vessels as any[]).filter(vessel => 
      (lcVesselRelations as any[]).some(relation => relation.vesselId === vessel.id)
    ) : [];
  
  // Calculate total vessel quantities and remaining based on the relationship quantities
  const totalVesselQuantity = lcVesselRelations ? 
    (lcVesselRelations as any[]).reduce((sum, relation) => sum + (relation.quantity || 0), 0) : 0;
  const remainingQuantity = (lc.quantity || 0) - totalVesselQuantity;
  
  console.log("LC vessels filtered:", lcVessels);
  console.log("Total vessel quantity:", totalVesselQuantity);
  console.log("Remaining quantity:", remainingQuantity);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'issued': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <University className="h-5 w-5" />
            <span>Letter of Credit Summary - {lc.lcNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(lc.status)}>
              {lc.status?.charAt(0).toUpperCase() + lc.status?.slice(1)}
            </Badge>
            {isExpired(lc.expiryDate) && (
              <Badge className="bg-red-100 text-red-800">
                Expired
              </Badge>
            )}
            {lc.createdAt && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(lc.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">LC Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">LC Number</h4>
                  <p className="text-gray-700">{lc.lcNumber}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Unit Price:</span>
                    <p className="text-gray-900">${parseFloat(lc.unitPrice || 0).toLocaleString()} {lc.currency} per ton</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">Issuing Bank</h4>
                  <p className="text-gray-700">{lc.issuingBank || '-'}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">Advising Bank</h4>
                  <p className="text-gray-700">{lc.advisingBank || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LC Dates */}
          {(lc.issueDate || lc.expiryDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Important Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lc.issueDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Issue Date:</span>
                        <p className="text-gray-900">{new Date(lc.issueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {lc.expiryDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Expiry Date:</span>
                        <p className={`${isExpired(lc.expiryDate) ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(lc.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Terms and Conditions */}
          {lc.termsConditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{lc.termsConditions}</p>
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
                    <div className="text-sm font-medium text-blue-600">LC Quantity</div>
                    <div className="text-xl font-bold text-blue-900">{lc.quantity || 0} tons</div>
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
                {lcVessels.length > 0 ? (
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
                      {lcVessels.map((vessel: any) => {
                        const vesselLCRelation = (lcVesselRelations as any[])?.find(rel => rel.vesselId === vessel.id);
                        return (
                          <TableRow key={vessel.id}>
                            <TableCell className="font-medium">{vessel.vesselName}</TableCell>
                            <TableCell>{vesselLCRelation?.quantity || 0} tons</TableCell>
                            <TableCell>
                              <StatusBadge status={vessel.status} type="vessel" />
                            </TableCell>
                            <TableCell>
                              {vessel.eta ? new Date(vessel.eta).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {vessel.countryOfOrigin} → {vessel.portOfDischarge}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Ship className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p>No vessels nominated for this LC yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document */}
          {lc.uploadedFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uploaded Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>LC Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/files/${lc.uploadedFile}`;
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
        </div>
      </DialogContent>
    </Dialog>
  );
}