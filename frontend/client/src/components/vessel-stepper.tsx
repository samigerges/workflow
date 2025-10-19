import { ChangeEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle,
  FileCheck,
  FileSignature,
  FileText,
  Fingerprint,
  MapPin,
  Send,
  Settings2,
  ShieldCheck,
  Ship,
  Upload,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define vessel stages with their properties
export const VESSEL_STAGES = [
  {
    id: "letter_of_guarantee",
    title: "Letter of Guarantee",
    description: "Guarantee letter issued",
    icon: FileSignature,
    color: "bg-indigo-500",
    lightColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    statTextColor: "text-indigo-600",
  },
  {
    id: "lc_opend",
    title: "LC Opened",
    description: "Letter of credit activated",
    icon: FileCheck,
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-800",
    statTextColor: "text-blue-600",
  },
  {
    id: "transaction",
    title: "Transaction",
    description: "Financial transaction initiated",
    icon: ArrowLeftRight,
    color: "bg-emerald-500",
    lightColor: "bg-emerald-100",
    textColor: "text-emerald-800",
    statTextColor: "text-emerald-600",
  },
  {
    id: "modifications",
    title: "Modifications",
    description: "Trade terms adjusted",
    icon: Settings2,
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-800",
    statTextColor: "text-amber-600",
  },
  {
    id: "acid_no",
    title: "ACID No.",
    description: "ACID documentation verified",
    icon: Fingerprint,
    color: "bg-rose-500",
    lightColor: "bg-rose-100",
    textColor: "text-rose-800",
    statTextColor: "text-rose-600",
  },
  {
    id: "ip",
    title: "IP",
    description: "Import permit confirmed",
    icon: ShieldCheck,
    color: "bg-teal-500",
    lightColor: "bg-teal-100",
    textColor: "text-teal-800",
    statTextColor: "text-teal-600",
  },
  {
    id: "loading_port",
    title: "Loading Port",
    description: "Cargo prepared at origin port",
    icon: Ship,
    color: "bg-sky-500",
    lightColor: "bg-sky-100",
    textColor: "text-sky-800",
    statTextColor: "text-sky-600",
  },
  {
    id: "document",
    title: "Document",
    description: "Shipping documents compiled",
    icon: FileText,
    color: "bg-slate-500",
    lightColor: "bg-slate-100",
    textColor: "text-slate-800",
    statTextColor: "text-slate-600",
  },
  {
    id: "destination_port",
    title: "Destination Port",
    description: "Arrival preparations underway",
    icon: MapPin,
    color: "bg-lime-500",
    lightColor: "bg-lime-100",
    textColor: "text-lime-800",
    statTextColor: "text-lime-600",
  },
  {
    id: "conflicts",
    title: "Conflicts",
    description: "Issues being resolved",
    icon: AlertTriangle,
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-800",
    statTextColor: "text-orange-600",
  },
  {
    id: "invoice",
    title: "Invoice",
    description: "Invoice issued and reviewed",
    icon: CheckCircle,
    color: "bg-violet-500",
    lightColor: "bg-violet-100",
    textColor: "text-violet-800",
    statTextColor: "text-violet-600",
  },
  {
    id: "swift",
    title: "Swift",
    description: "SWIFT confirmation received",
    icon: Send,
    color: "bg-fuchsia-500",
    lightColor: "bg-fuchsia-100",
    textColor: "text-fuchsia-800",
    statTextColor: "text-fuchsia-600",
  },
];

export type VesselStageId = (typeof VESSEL_STAGES)[number]["id"];

export const normalizeStageId = (status: string) =>
  status
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const findStageByStatus = (status?: string | null) => {
  if (!status) return undefined;
  const normalized = normalizeStageId(status);
  return VESSEL_STAGES.find((stage) => stage.id === normalized);
};

interface VesselStepperProps {
  selectedVessel: any;
  vessels: any[];
  onClose: () => void;
}

export default function VesselStepper({ selectedVessel, vessels, onClose }: VesselStepperProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeStageId, setActiveStageId] = useState<VesselStageId | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const vesselId = selectedVessel?.id;

  const { data: documents = [], isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/vessels", vesselId, "documents"],
    enabled: Boolean(vesselId),
  });

  const documentsByStage = useMemo(() => {
    const map = new Map<VesselStageId, any>();
    if (!Array.isArray(documents)) return map;

    documents.forEach((doc: any) => {
      if (!doc?.type) return;
      const normalized = normalizeStageId(String(doc.type));
      const stage = VESSEL_STAGES.find((s) => s.id === normalized);
      if (stage) {
        map.set(stage.id as VesselStageId, doc);
      }
    });

    return map;
  }, [documents]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, stageId }: { file: File; stageId: VesselStageId }) => {
      if (!vesselId) throw new Error("Missing vessel identifier");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", stageId);
      const response = await apiRequest("POST", `/api/vessels/${vesselId}/documents`, formData);
      return response.json();
    },
    onSuccess: () => {
      if (vesselId) {
        queryClient.invalidateQueries({ queryKey: ["/api/vessels", vesselId, "documents"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({
        title: "Document uploaded",
        description: "The stage document was uploaded successfully.",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      console.error("Error uploading stage document", error);
      toast({
        title: "Upload failed",
        description: "We couldn't upload this document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStageClick = (stageId: VesselStageId) => {
    setActiveStageId(stageId);
    setSelectedFile(null);
    setShowDocumentDialog(true);
  };

  const handleDialogClose = () => {
    setShowDocumentDialog(false);
    setActiveStageId(null);
    setSelectedFile(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleDialogClose();
    } else {
      setShowDocumentDialog(true);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
  };

  const handleUpload = () => {
    if (!selectedFile || !activeStageId) return;
    uploadMutation.mutate({ file: selectedFile, stageId: activeStageId });
  };

  const activeStage = activeStageId
    ? VESSEL_STAGES.find((stage) => stage.id === activeStageId)
    : undefined;
  const existingStageDocument = activeStageId
    ? documentsByStage.get(activeStageId)
    : undefined;

  const getStatusColor = (status: string) => {
    const stage = findStageByStatus(status);
    if (!stage) return "bg-gray-100 text-gray-800";
    return `${stage.lightColor} ${stage.textColor}`;
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
    const stage = findStageByStatus(vessel.status);
    if (!stage) return 0;
    const stageIndex = VESSEL_STAGES.findIndex((item) => item.id === stage.id);
    return stageIndex >= 0 ? stageIndex : 0;
  };

  const getStageStatus = (stageIndex: number, currentStageIndex: number) => {
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'pending';
  };

  const currentStageIndex = selectedVessel ? getCurrentStageIndex(selectedVessel) : 0;

  return (
    <>
      <Card className="border-primary-200 bg-primary-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary-900">
              Vessel Details - {selectedVessel?.vesselName ?? ""}
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
                  const stageId = stage.id as VesselStageId;
                  const Icon = stage.icon;
                  const status = getStageStatus(index, currentStageIndex);
                  const isLast = index === VESSEL_STAGES.length - 1;
                  const isCurrent = status === 'current';
                  const hasStageDocument = documentsByStage.has(stageId);

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
                      <button
                        type="button"
                        onClick={() => handleStageClick(stageId)}
                        className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      >
                        <div className="relative">
                          <div className={`${nodeClasses} ${documentsLoading ? 'cursor-wait' : 'cursor-pointer'} shadow-sm`}>
                            <Icon className={`${(status === 'completed' || isCurrent) ? 'text-white' : 'text-gray-400'} w-6 h-6`} />
                          </div>
                          {hasStageDocument && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
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
                      </button>

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
                  {findStageByStatus(selectedVessel.status)?.title ?? selectedVessel.status ?? "-"}
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

      <Dialog open={showDocumentDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeStage?.title ?? "Upload document"}
            </DialogTitle>
            <DialogDescription>
              {activeStage
                ? `Add supporting documentation for the ${activeStage.title} stage.`
                : "Select a vessel stage to upload a document."}
            </DialogDescription>
          </DialogHeader>

          {existingStageDocument ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-emerald-900">
                  {existingStageDocument.fileName}
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                  Uploaded
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-emerald-700">
                <span>
                  Uploaded {new Date(existingStageDocument.uploadedAt).toLocaleString()}
                </span>
                {existingStageDocument.fileUrl && (
                  <Button
                    variant="link"
                    className="h-auto px-0 text-emerald-900"
                    onClick={() => window.open(existingStageDocument.fileUrl, "_blank")}
                  >
                    View document
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-4 text-sm text-gray-600">
              No document has been uploaded for this stage yet.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stage-document">Upload file</Label>
            <Input
              id="stage-document"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
            {selectedFile && (
              <p className="text-xs text-gray-500">Selected file: {selectedFile.name}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
