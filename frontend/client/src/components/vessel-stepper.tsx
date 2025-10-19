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

  const stageRows = useMemo(() => {
    const midpoint = Math.ceil(VESSEL_STAGES.length / 2);
    const rows = [
      VESSEL_STAGES.slice(0, midpoint),
      VESSEL_STAGES.slice(midpoint),
    ];
    return rows.filter((row) => row.length > 0);
  }, []);

  const stageRowDescriptors = useMemo(() => {
    let processed = 0;
    return stageRows.map((row) => {
      const descriptor = { stages: row, startIndex: processed };
      processed += row.length;
      return descriptor;
    });
  }, [stageRows]);

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

          <div className="space-y-12">
            {stageRowDescriptors.map(({ stages, startIndex }, rowIdx) => (
              <div key={`row-${rowIdx}`} className="relative pb-20 md:pb-24">
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                  {stages.map((stage, index) => {
                    const stageId = stage.id as VesselStageId;
                    const Icon = stage.icon;
                    const globalIndex = startIndex + index;
                    const status = getStageStatus(globalIndex, currentStageIndex);
                    const hasStageDocument = documentsByStage.has(stageId);
                    const isCurrent = status === 'current' && !hasStageDocument;
                    const isCompleted = status === 'completed' || hasStageDocument;
                    const nodeBaseClasses =
                      "z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300 shadow-sm";
                    const nodeStateClasses = hasStageDocument
                      ? "bg-green-500 border-green-500 text-white"
                      : isCurrent
                        ? "bg-blue-500 border-blue-500 text-white ring-4 ring-blue-200"
                        : status === 'completed'
                          ? "bg-green-100 border-green-300 text-green-800"
                          : "bg-white border-gray-300 text-gray-500";
                    const nodeClasses = [
                      nodeBaseClasses,
                      nodeStateClasses,
                      documentsLoading ? "cursor-wait" : "cursor-pointer",
                    ].join(" ");
                    const isLastOverall = globalIndex === VESSEL_STAGES.length - 1;
                    const isLastInRow = index === stages.length - 1;
                    const showHorizontalConnector = !isLastOverall && !isLastInRow;
                    const showVerticalConnector =
                      !isLastOverall && isLastInRow && rowIdx < stageRowDescriptors.length - 1;

                    const labelOffsetClass = isCurrent ? '-bottom-20 md:-bottom-24' : '-bottom-14 md:-bottom-16';
                    const iconColorClass = isCompleted || isCurrent ? 'text-white' : 'text-gray-400';
                    const titleColorClass = isCompleted
                      ? 'text-green-900'
                      : isCurrent
                        ? 'text-blue-900'
                        : 'text-gray-700';
                    const descriptionColorClass = isCompleted
                      ? 'text-green-700'
                      : isCurrent
                        ? 'text-blue-700'
                        : 'text-gray-500';

                    return (
                      <div key={stage.id} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleStageClick(stageId)}
                          className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        >
                          <div className="relative">
                            <div className={nodeClasses}>
                              <Icon className={`${iconColorClass} w-6 h-6`} />
                            </div>
                            {hasStageDocument && (
                              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>

                          <div
                            className={`absolute ${labelOffsetClass} left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none`}
                          >
                            <h3
                              className={`text-sm font-semibold mb-1 transition-colors
                                ${titleColorClass}`}
                            >
                              {stage.title}
                            </h3>
                            <p
                              className={`text-[11px] leading-tight transition-colors
                                ${descriptionColorClass}`}
                            >
                              {stage.description}
                            </p>
                            {status === 'current' && !hasStageDocument && (
                              <Badge className="mt-2 border-0 bg-blue-100 text-blue-800 text-[10px]">
                                Current
                              </Badge>
                            )}
                          </div>
                        </button>

                        {showHorizontalConnector && (
                          <div
                            className="relative mx-3 h-0.5 grow basis-12 sm:basis-16 md:basis-20 lg:basis-24 rounded-full bg-gray-200 overflow-hidden"
                            aria-hidden
                          >
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                hasStageDocument || globalIndex < currentStageIndex
                                  ? 'w-full bg-green-500'
                                  : status === 'current'
                                    ? 'w-full bg-blue-500'
                                    : 'w-0'
                              }`}
                            />
                          </div>
                        )}

                        {showVerticalConnector && (
                          <div className="flex flex-col items-center mx-3" aria-hidden>
                            <div className="relative h-8 w-0.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={`absolute inset-x-0 bottom-0 transition-all duration-500 ${
                                  hasStageDocument || globalIndex < currentStageIndex
                                    ? 'h-full bg-green-500'
                                    : status === 'current'
                                      ? 'h-full bg-blue-500'
                                      : 'h-0'
                                }`}
                              />
                            </div>
                            <div
                              className={`mt-1 h-2 w-2 rotate-45 ${
                                hasStageDocument || globalIndex < currentStageIndex
                                  ? 'bg-green-500'
                                  : status === 'current'
                                    ? 'bg-blue-500'
                                    : 'bg-gray-300'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(((currentStageIndex + 1) / VESSEL_STAGES.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500">
              Stage {currentStageIndex + 1} of {VESSEL_STAGES.length} - {VESSEL_STAGES[currentStageIndex]?.title}
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
