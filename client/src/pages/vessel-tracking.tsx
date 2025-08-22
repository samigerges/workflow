import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Ship, Navigation, Clock, Anchor, Globe, Eye } from "lucide-react";

// Simple map component without external dependencies for now
const SimpleMap = ({ vessels, selectedVessel }: { vessels: any[], selectedVessel: any }) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setMapLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-96 bg-blue-50 rounded-lg border-2 border-blue-200 relative overflow-hidden">
      {/* Simple world map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200"></div>
      
      {/* Map grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3B82F6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Map title */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm">
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Vessel Tracking Map</span>
        </div>
      </div>

      {/* Vessel markers */}
      <div className="absolute inset-0">
        {mapLoaded && vessels.map((vessel, index) => {
          const x = 50 + (index * 80) % 250;
          const y = 80 + (index * 60) % 200;
          const isSelected = selectedVessel?.id === vessel.id;
          
          return (
            <div
              key={vessel.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                isSelected ? 'scale-125 z-10' : 'hover:scale-110'
              }`}
              style={{ left: `${x}px`, top: `${y}px` }}
              title={`${vessel.vesselName} - ${vessel.status}`}
            >
              {/* Vessel icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                isSelected 
                  ? 'bg-blue-600 ring-2 ring-blue-300 ring-offset-2' 
                  : vessel.status === 'in_transit' 
                    ? 'bg-yellow-500' 
                    : vessel.status === 'arrived' 
                      ? 'bg-green-500'
                      : 'bg-blue-500'
              }`}>
                <Ship className="h-4 w-4 text-white" />
              </div>
              
              {/* Vessel label */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium shadow-sm whitespace-nowrap">
                {vessel.vesselName}
              </div>

              {/* Animation for in-transit vessels */}
              {vessel.status === 'in_transit' && (
                <div className="absolute -inset-2 rounded-full border-2 border-blue-400 animate-ping opacity-30"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Map legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm">
        <div className="text-xs space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>In Transit</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Arrived</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Other Status</span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-blue-600">Loading vessel positions...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function VesselTracking() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedVessel, setSelectedVessel] = useState<any>(null);

  // Fetch vessels
  const { data: vessels, isLoading } = useQuery({
    queryKey: ["/api/vessels"],
  });

  // Filter vessels based on selected status
  const filteredVessels = vessels ? (vessels as any[]).filter(vessel => 
    selectedStatus === "all" || vessel.status === selectedStatus
  ) : [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'nominated': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'arrived': return 'bg-green-100 text-green-800';
      case 'discharging': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'nominated': return <Navigation className="h-4 w-4" />;
      case 'in_transit': return <Ship className="h-4 w-4" />;
      case 'arrived': return <Anchor className="h-4 w-4" />;
      case 'discharging': return <Clock className="h-4 w-4" />;
      default: return <Ship className="h-4 w-4" />;
    }
  };

  const getETA = (vessel: any) => {
    if (!vessel.eta) return 'TBD';
    const eta = new Date(vessel.eta);
    const now = new Date();
    const diffTime = eta.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `${diffDays} days`;
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Vessel Tracking" subtitle="Real-time vessel location and status">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-secondary-600">Loading vessel tracking data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Vessel Tracking" subtitle="Real-time vessel location and status">
      <div className="space-y-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                <CardTitle>Vessel Status Filter</CardTitle>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vessels</SelectItem>
                    <SelectItem value="nominated">Nominated</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="discharging">Discharging</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-sm">
                  {filteredVessels.length} vessels
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Map and Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredVessels.length}</div>
                <div className="text-sm text-secondary-600">Total Vessels</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredVessels.filter(v => v.status === 'in_transit').length}
                </div>
                <div className="text-sm text-secondary-600">In Transit</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredVessels.filter(v => v.status === 'arrived').length}
                </div>
                <div className="text-sm text-secondary-600">Arrived</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredVessels.filter(v => v.status === 'discharging').length}
                </div>
                <div className="text-sm text-secondary-600">Discharging</div>
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Vessel Locations</CardTitle>
                  <div className="text-sm text-secondary-600">
                    Click on vessels to view details
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SimpleMap vessels={filteredVessels} selectedVessel={selectedVessel} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vessel Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Vessels</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredVessels.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                No vessels found for selected filter
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Trade Terms</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVessels.map((vessel: any) => (
                      <TableRow 
                        key={vessel.id} 
                        className={selectedVessel?.id === vessel.id ? 'bg-primary-50' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(vessel.status)}
                            <span>{vessel.vesselName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vessel.status)}>
                            {vessel.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{vessel.cargoType}</TableCell>
                        <TableCell>{vessel.quantity?.toLocaleString()} tons</TableCell>
                        <TableCell>{vessel.portOfDischarge}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getETA(vessel)}</span>
                            {vessel.eta && (
                              <span className="text-xs text-secondary-600">
                                {new Date(vessel.eta).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vessel.tradeTerms}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVessel(
                              selectedVessel?.id === vessel.id ? null : vessel
                            )}
                            className="flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Vessel Details */}
        {selectedVessel && (
          <Card className="border-primary-200 bg-primary-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary-900">
                  Vessel Details - {selectedVessel.vesselName}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedVessel(null)}
                  className="text-primary-600 hover:text-primary-800"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-secondary-900 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Status:</span>
                      <Badge className={getStatusColor(selectedVessel.status)}>
                        {selectedVessel.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Cargo Type:</span>
                      <span className="font-medium">{selectedVessel.cargoType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Quantity:</span>
                      <span className="font-medium">{selectedVessel.quantity?.toLocaleString()} tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Trade Terms:</span>
                      <Badge variant="outline">{selectedVessel.tradeTerms}</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-secondary-900 mb-3">Schedule</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">ETA:</span>
                      <div className="text-right">
                        <span className="font-medium">{getETA(selectedVessel)}</span>
                        {selectedVessel.eta && (
                          <div className="text-xs text-secondary-500">
                            {new Date(selectedVessel.eta).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Arrival Date:</span>
                      <span className="font-medium">
                        {selectedVessel.arrivalDate ? new Date(selectedVessel.arrivalDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Discharge Start:</span>
                      <span className="font-medium">
                        {selectedVessel.dischargeStartDate ? new Date(selectedVessel.dischargeStartDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Discharge End:</span>
                      <span className="font-medium">
                        {selectedVessel.dischargeEndDate ? new Date(selectedVessel.dischargeEndDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-secondary-900 mb-3">Service Providers</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Destination:</span>
                      <span className="font-medium">{selectedVessel.portOfDischarge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Shipping:</span>
                      <span className="font-medium">{selectedVessel.shippingCompany || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Insurance:</span>
                      <span className="font-medium">{selectedVessel.insuranceCompany || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Inspection:</span>
                      <span className="font-medium">{selectedVessel.inspectionCompany || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}