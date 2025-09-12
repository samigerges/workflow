import { CheckCircle, Circle, Ship, Navigation, Anchor, Clock, Package, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Define vessel stages with their properties
export const VESSEL_STAGES = [
  {
    id: 'nominated',
    title: 'Nominated',
    description: 'Vessel selected for cargo',
    icon: Navigation,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    textColor: 'text-blue-800'
  },
  {
    id: 'in_transit',
    title: 'In Transit',
    description: 'En route to destination',
    icon: Ship,
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-100',
    textColor: 'text-yellow-800'
  },
  {
    id: 'arrived',
    title: 'Arrived',
    description: 'Reached destination port',
    icon: Anchor,
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-800'
  },
  {
    id: 'discharging',
    title: 'Discharging',
    description: 'Cargo being unloaded',
    icon: Package,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100',
    textColor: 'text-purple-800'
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'Process finished',
    icon: CheckCircle,
    color: 'bg-gray-500',
    lightColor: 'bg-gray-100',
    textColor: 'text-gray-800'
  }
];

interface VesselStepperProps {
  selectedVessel: any;
  vessels: any[];
  onClose: () => void;
}

export default function VesselStepper({ selectedVessel, vessels, onClose }: VesselStepperProps) {
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

  const getETA = (vessel: any) => {
    if (!vessel.eta) return 'TBD';
    const eta = new Date(vessel.eta);
    const now = new Date();
    const diffTime = eta.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const getCurrentStageIndex = (vessel: any) => {
    if (!vessel || !vessel.status) return 0;
    const stageIndex = VESSEL_STAGES.findIndex(stage => stage.id === vessel.status.toLowerCase());
    return stageIndex >= 0 ? stageIndex : 0;
  };

  const getStageStatus = (stageIndex: number, currentStageIndex: number) => {
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'pending';
  };

  const currentStageIndex = selectedVessel ? getCurrentStageIndex(selectedVessel) : 0;

  return (
    <Card className="border-primary-200 bg-primary-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary-900">
            Vessel Details - {selectedVessel.vesselName}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-primary-600 hover:text-primary-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Import Progress */}
        <div className="bg-white rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-6 text-center">Import Progress</h4>

          {/* Centered stepper row */}
          <div className="relative pb-20 md:pb-24">
            <div className="max-w-5xl mx-auto">
              <ol className="flex items-center justify-center gap-0">
                {VESSEL_STAGES.map((stage, index) => {
                  const Icon = stage.icon;
                  const status = getStageStatus(index, currentStageIndex);
                  const isLast = index === VESSEL_STAGES.length - 1;
                  const isCurrent = status === 'current';

                  const nodeClasses = `
                    z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300
                    ${status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : isCurrent
                        ? `${stage.color} border-white ring-4 ring-blue-200`
                        : 'bg-white border-gray-300'
                    }
                  `;

                  // Deeper label offset for current stage to avoid ring/icon overlap
                  const labelOffsetClass = isCurrent ? '-bottom-20 md:-bottom-24' : '-bottom-14 md:-bottom-16';

                  return (
                    <li key={stage.id} className="relative flex items-center">
                      {/* Node + label wrapper (relative so label centers under node) */}
                      <div className="relative flex items-center justify-center">
                        <div className={nodeClasses}>
                          <Icon className={`${(status === 'completed' || isCurrent) ? 'text-white' : 'text-gray-400'} w-6 h-6`} />
                        </div>

                        {/* Label centered under the node */}
                        <div
                          className={`absolute ${labelOffsetClass} left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none`}
                        >
                          <h3
                            className={`text-sm font-semibold mb-1 transition-colors
                              ${isCurrent ? 'text-blue-900' : status === 'completed' ? 'text-green-900' : 'text-gray-700'}`}
                          >
                            {stage.title}
                          </h3>
                          <p
                            className={`text-[11px] leading-tight transition-colors
                              ${isCurrent ? 'text-blue-700' : status === 'completed' ? 'text-green-700' : 'text-gray-500'}`}
                          >
                            {stage.description}
                          </p>
                          {isCurrent && (
                            <Badge className={`${stage.lightColor} ${stage.textColor} border-0 mt-2 text-[10px]`}>
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Connector AFTER this node (only between steps; fixed width keeps the whole stepper centered) */}
                      {!isLast && (
                        <div
                          className="relative h-0.5 mx-3 rounded-full bg-gray-200 overflow-hidden w-16 sm:w-20 md:w-24 lg:w-32"
                          aria-hidden
                        >
                          <div
                            className={`absolute inset-y-0 left-0 bg-blue-500 transition-all duration-500 ${index < currentStageIndex ? 'w-full' : 'w-0'}`}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mt-2 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(((currentStageIndex + 1) / VESSEL_STAGES.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500">
              Stage {currentStageIndex + 1} of {VESSEL_STAGES.length} - {VESSEL_STAGES[currentStageIndex]?.title}
            </div>
          </div>
        </div>

        {/* Detailed Vessel Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge className={getStatusColor(selectedVessel.status)}>
                  {selectedVessel.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cargo Type:</span>
                <span className="font-medium">{selectedVessel.cargoType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{selectedVessel.quantity?.toLocaleString()} tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Origin:</span>
                <span className="font-medium">{selectedVessel.countryOfOrigin || 'TBD'}</span>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Schedule</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ETA:</span>
                <div className="text-right">
                  <span className="font-medium">{getETA(selectedVessel)}</span>
                  {selectedVessel.eta && (
                    <div className="text-xs text-gray-500">
                      {new Date(selectedVessel.eta).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Arrival Date:</span>
                <span className="font-medium">
                  {selectedVessel.arrivalDate ? new Date(selectedVessel.arrivalDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discharge Start:</span>
                <span className="font-medium">
                  {selectedVessel.dischargeStartDate ? new Date(selectedVessel.dischargeStartDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discharge End:</span>
                <span className="font-medium">
                  {selectedVessel.dischargeEndDate ? new Date(selectedVessel.dischargeEndDate).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Service Providers */}
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Service Providers</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Destination:</span>
                <span className="font-medium">{selectedVessel.portOfDischarge}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">{selectedVessel.shippingCompany || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Insurance:</span>
                <span className="font-medium">{selectedVessel.insuranceCompany || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inspection:</span>
                <span className="font-medium">{selectedVessel.inspectionCompany || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
