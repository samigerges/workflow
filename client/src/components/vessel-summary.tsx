import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Ship, Package, MapPin, FileText, ExternalLink, University, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/ui/status-badge";
import VesselDocuments from "@/components/vessel-documents";

interface VesselSummaryProps {
  vessel: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function VesselSummary({ vessel, isOpen, onClose }: VesselSummaryProps) {
  if (!vessel) return null;

  // Fetch contracts and LCs to get detailed information
  const { data: contracts } = useQuery({
    queryKey: ["/api/contracts"],
    enabled: isOpen && !!vessel.contractId,
  });

  const { data: lcs } = useQuery({
    queryKey: ["/api/letters-of-credit"],
    enabled: isOpen,
  });

  // Fetch vessel-specific LCs and loading ports
  const { data: vesselLCs } = useQuery({
    queryKey: [`/api/vessels/${vessel.id}/letters-of-credit`],
    enabled: isOpen && !!vessel.id,
  });

  // Debug logs for vessel LCs
  console.log("Vessel ID:", vessel.id);
  console.log("Vessel LCs data:", vesselLCs);

  const { data: loadingPorts } = useQuery({
    queryKey: ["/api/vessels", vessel.id, "loading-ports"],
    enabled: isOpen && !!vessel.id,
  });

  const contractsArray = Array.isArray(contracts) ? contracts : [];
  const lcsArray = Array.isArray(lcs) ? lcs : [];
  const vesselLCsArray = Array.isArray(vesselLCs) ? vesselLCs : [];
  const loadingPortsArray = Array.isArray(loadingPorts) ? loadingPorts : [];

  const associatedContract = contractsArray.find((contract: any) => contract.id === vessel.contractId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Ship className="h-5 w-5" />
            <span>Vessel Summary - {vessel.vesselName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center space-x-4">
            <StatusBadge status={vessel.status} type="vessel" />
            {vessel.createdAt && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(vessel.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Basic Vessel Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vessel Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Vessel Name</h4>
                  <p className="text-gray-700">{vessel.vesselName}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Total Quantity:</span>
                    <p className="text-gray-900">{vessel.quantity || 0} tons</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">ETA:</span>
                    <p className="text-gray-900">
                      {vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-500">ETA Time:</span>
                    <p className="text-gray-900">
                      {vessel.eta ? new Date(vessel.eta).toLocaleTimeString() : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Letters of Credit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Letters of Credit</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vesselLCsArray.length > 0 ? (
                <div className="space-y-3">
                  {vesselLCsArray.map((vesselLC: any, index: number) => {
                    const lc = lcsArray.find((l: any) => l.id === vesselLC.lcId);
                    return (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">LC Number:</span>
                            <p className="text-gray-900">{lc?.lcNumber || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Issuing Bank:</span>
                            <p className="text-gray-900">{lc?.issuingBank || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Quantity:</span>
                            <p className="text-gray-900">{vesselLC.quantity} tons</p>
                          </div>
                        </div>
                        {vesselLC.notes && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-500">Notes:</span>
                            <p className="text-gray-700 text-sm">{vesselLC.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No letters of credit assigned to this vessel</p>
              )}
            </CardContent>
          </Card>

          {/* Loading Ports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Loading Ports</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPortsArray.length > 0 ? (
                <div className="space-y-3">
                  {loadingPortsArray.map((port: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Port Name:</span>
                          <p className="text-gray-900">{port.portName}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Country:</span>
                          <p className="text-gray-900">{port.country || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Expected Quantity:</span>
                          <p className="text-gray-900">{port.expectedQuantity} tons</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Status:</span>
                          <Badge variant={port.loadingStatus === 'completed' ? 'default' : 'secondary'}>
                            {port.loadingStatus || 'pending'}
                          </Badge>
                        </div>
                      </div>
                      {port.loadingDate && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-500">Loading Date:</span>
                          <p className="text-gray-700">{new Date(port.loadingDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {port.notes && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-500">Notes:</span>
                          <p className="text-gray-700 text-sm">{port.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No loading ports specified for this vessel</p>
              )}
            </CardContent>
          </Card>

          {/* Port of Discharge */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Port of Discharge</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Destination Port:</span>
                  <p className="text-gray-900">{vessel.portOfDischarge || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Terms & Companies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trade Terms & Service Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-blue-600 text-lg">{vessel.tradeTerms || 'FOB'}</span>
                  <span className="text-sm text-gray-500">
                    ({vessel.tradeTerms === 'CIF' ? 'Cost, Insurance, and Freight' : 'Free On Board'})
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Insurance Company:</span>
                    <p className="text-gray-900">{vessel.insuranceCompany || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Inspection Company:</span>
                    <p className="text-gray-900">{vessel.inspectionCompany || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Shipping Company:</span>
                    <p className="text-gray-900">{vessel.shippingCompany || 'Not specified'}</p>
                  </div>
                </div>

                {/* FOB Costs - only show when trade terms is FOB and costs exist */}
                {vessel.tradeTerms === 'FOB' && (vessel.insuranceCost || vessel.inspectionCost || vessel.shippingCost) && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-3">FOB Additional Costs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-yellow-700">Insurance Cost:</span>
                        <p className="font-medium">${parseFloat(vessel.insuranceCost || 0).toLocaleString()} USD</p>
                      </div>
                      <div>
                        <span className="text-yellow-700">Inspection Cost:</span>
                        <p className="font-medium">${parseFloat(vessel.inspectionCost || 0).toLocaleString()} USD</p>
                      </div>
                      <div>
                        <span className="text-yellow-700">Shipping Cost:</span>
                        <p className="font-medium">${parseFloat(vessel.shippingCost || 0).toLocaleString()} USD</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-yellow-300">
                      <span className="text-yellow-700">Total Additional Costs:</span>
                      <p className="font-bold text-lg text-yellow-900">
                        ${((parseFloat(vessel.insuranceCost || 0)) + (parseFloat(vessel.inspectionCost || 0)) + (parseFloat(vessel.shippingCost || 0))).toLocaleString()} USD
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Associated Contract */}
          {associatedContract && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Associated Contract</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Contract ID</h4>
                    <p className="text-gray-700">CON-{vessel.contractId.toString().padStart(3, '0')}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Supplier</h4>
                    <p className="text-gray-700">{associatedContract.supplierName}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Cargo Type</h4>
                    <p className="text-gray-700">{associatedContract.cargoType}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">Contract Quantity:</span>
                      <p className="text-gray-900">{(associatedContract.quantity || 0).toLocaleString()} tons</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Associated Letters of Credit */}
          {vesselLCs && vesselLCs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <University className="h-5 w-5" />
                  <span>Associated Letters of Credit ({vesselLCs.length})</span>
                </CardTitle>
                {vesselLCs.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-500">Total LC Quantity:</span>
                    <span className="font-semibold text-gray-900">
                      {vesselLCs.reduce((total: number, lc: any) => total + (lc.quantity || 0), 0).toLocaleString()} tons
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vesselLCs.map((vesselLC: any, index: number) => {
                    const lc = lcs.find((l: any) => l.id === vesselLC.lcId);
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">LC Number</h4>
                            <p className="text-gray-700">{lc?.lcNumber || `LC-${vesselLC.lcId}`}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <div>
                              <span className="text-sm font-medium text-gray-500">Assigned Quantity:</span>
                              <p className="text-gray-900">{vesselLC.quantity || 0} tons</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Issuing Bank</h4>
                            <p className="text-gray-700">{lc?.issuingBank || 'Not specified'}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Status</h4>
                            <Badge className={
                              lc?.status === 'issued' ? 'bg-green-100 text-green-800' :
                              lc?.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {lc?.status?.charAt(0).toUpperCase() + lc?.status?.slice(1) || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}



          {/* Shipping Instructions */}
          {vessel.instructionsFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>Instructions Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/files/${vessel.instructionsFile}`;
                      link.target = '_blank';
                      link.click();
                    }}
                    className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    View Instructions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vessel Documents */}
          <VesselDocuments vessel={vessel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}