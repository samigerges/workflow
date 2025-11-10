import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle,
  FileCheck,
  FileSignature,
  FileText,
  Fingerprint,
  Link2,
  Loader2,
  MapPin,
  Send,
  Save,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define vessel stages with their properties
export const VESSEL_STAGES = [
  {
    id: "letter_of_guarantee",
    title: "Letter of Guarantee",
    description: "Guarantee letter issued",
    entryType: "document" as const,
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
    entryType: "lc" as const,
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
    entryType: "document" as const,
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
    entryType: "document" as const,
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
    entryType: "number" as const,
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
    entryType: "number" as const,
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
    entryType: "document" as const,
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
    entryType: "document" as const,
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
    entryType: "document" as const,
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
    entryType: "document" as const,
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
    entryType: "document" as const,
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
    entryType: "document" as const,
    icon: Send,
    color: "bg-fuchsia-500",
    lightColor: "bg-fuchsia-100",
    textColor: "text-fuchsia-800",
    statTextColor: "text-fuchsia-600",
  },
];

export type VesselStageId = (typeof VESSEL_STAGES)[number]["id"];

type VesselStage = (typeof VESSEL_STAGES)[number];

interface StageDocument {
  id: string;
  type?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  uploadedAt: string;
}

interface StageNumberEntry {
  id: string;
  stageId: string;
  numberValue?: string | null;
  updatedAt: string;
}

interface VesselLcLink {
  letterOfCreditId?: string | number | null;
  number?: string | null;
  status?: string | null;
}

interface AvailableLetterOfCreditSummaryItem {
  id: string | number;
  lcNumber: string;
  supplier?: string | null;
  product?: string | null;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  expiryDate?: string | null;
  status: string;
}

type StageCompletion =
  | { kind: "document"; data: StageDocument }
  | { kind: "number"; data: StageNumberEntry };

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
  const [stageNumberValue, setStageNumberValue] = useState("");
  const [hasEditedStageNumber, setHasEditedStageNumber] = useState(false);
  const [selectedLcId, setSelectedLcId] = useState("");

  const vesselId = selectedVessel?.id;

  const { data: documents = [], isLoading: documentsLoading } = useQuery<StageDocument[]>({
    queryKey: ["/api/vessels", vesselId, "documents"],
    enabled: Boolean(vesselId),
  });

  const { data: stageEntries = [], isLoading: stageEntriesLoading } = useQuery<StageNumberEntry[]>({
    queryKey: ["/api/vessels", vesselId, "stage-entries"],
    enabled: Boolean(vesselId),
  });

  const { data: vesselLcLinksRaw = [], isLoading: vesselLcLinksLoading } = useQuery<VesselLcLink[]>({
    queryKey: ["/api/vessels", vesselId, "letters-of-credit"],
    enabled: Boolean(vesselId),
  });

  const {
    data: availableLcSummaries = [],
    isLoading: availableLcsLoading,
    error: availableLcsError,
  } = useQuery<AvailableLetterOfCreditSummaryItem[]>({
    queryKey: ["/api/vessels", vesselId, "available-letters-of-credit"],
    enabled: Boolean(vesselId) && showDocumentDialog && activeStageId === "lc_opend",
    select: (data) =>
      Array.isArray(data)
        ? data.map((item) => ({
            ...item,
            status: String((item as any)?.status ?? "Draft"),
          }))
        : [],
  });

  const documentsByStage = useMemo(() => {
    const map = new Map<VesselStageId, StageDocument>();
    if (!Array.isArray(documents)) return map;

    documents.forEach((doc) => {
      if (!doc?.type) return;
      const normalized = normalizeStageId(String(doc.type));
      const stage = VESSEL_STAGES.find((s) => s.id === normalized);
      if (stage) {
        map.set(stage.id as VesselStageId, doc);
      }
    });

    return map;
  }, [documents]);

  const stageEntriesByStage = useMemo(() => {
    const map = new Map<VesselStageId, StageNumberEntry>();
    if (!Array.isArray(stageEntries)) return map;

    stageEntries.forEach((entry) => {
      if (!entry?.stageId) return;
      const normalized = normalizeStageId(String(entry.stageId));
      const stage = VESSEL_STAGES.find((s) => s.id === normalized);
      if (stage) {
        map.set(stage.id as VesselStageId, entry);
      }
    });

    return map;
  }, [stageEntries]);

  const vesselLcLinks = useMemo(() => {
    const links = Array.isArray(vesselLcLinksRaw) ? vesselLcLinksRaw : [];
    return links
      .map((link) => {
        const rawId = link?.letterOfCreditId ?? (link as Record<string, unknown>)?.id ?? null;
        if (rawId === null || rawId === undefined) {
          return null;
        }
        return {
          id: String(rawId),
          number: link?.number ?? null,
          status: link?.status ?? null,
        };
      })
      .filter((link): link is { id: string; number: string | null; status: string | null } => link !== null);
  }, [vesselLcLinksRaw]);

  const availableLcOptions = useMemo(
    () =>
      availableLcSummaries
        .map((summary) => {
          const rawId = summary?.id;
          if (rawId === null || rawId === undefined) {
            return null;
          }
          return { id: String(rawId), summary } as const;
        })
        .filter(
          (
            option,
          ): option is {
            id: string;
            summary: AvailableLetterOfCreditSummaryItem;
          } => option !== null,
        ),
    [availableLcSummaries],
  );

  const stageCompletionByStage = useMemo(() => {
    const map = new Map<VesselStageId, StageCompletion>();
    documentsByStage.forEach((doc, stageId) => {
      map.set(stageId, { kind: "document", data: doc });
    });
    stageEntriesByStage.forEach((entry, stageId) => {
      map.set(stageId, { kind: "number", data: entry });
    });
    return map;
  }, [documentsByStage, stageEntriesByStage]);

  const stageDataLoading = documentsLoading || stageEntriesLoading;

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

  const saveStageNumberMutation = useMutation({
    mutationFn: async ({
      stageId,
      numberValue,
    }: {
      stageId: VesselStageId;
      numberValue: string;
    }) => {
      if (!vesselId) throw new Error("Missing vessel identifier");
      const response = await apiRequest("POST", `/api/vessels/${vesselId}/stage-entries`, {
        stageId,
        value: numberValue,
      });
      return response.json();
    },
    onSuccess: () => {
      if (vesselId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/vessels", vesselId, "stage-entries"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({
        title: "Stage number saved",
        description: "The stage number was saved successfully.",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      console.error("Error saving stage number", error);
      toast({
        title: "Save failed",
        description: "We couldn't save this number. Please try again.",
        variant: "destructive",
      });
    },
  });

  const linkLcMutation = useMutation({
    mutationFn: async ({ letterOfCreditId }: { letterOfCreditId: string }) => {
      if (!vesselId) throw new Error("Missing vessel identifier");
      await apiRequest("POST", `/api/vessels/${vesselId}/letters-of-credit`, {
        letterOfCreditId,
      });
    },
    onSuccess: () => {
      if (vesselId) {
        queryClient.invalidateQueries({ queryKey: ["/api/vessels", vesselId, "letters-of-credit"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vessels", vesselId, "available-letters-of-credit"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/letters-of-credit"] });
      toast({
        title: "Letter of credit linked",
        description: "The vessel has been associated with the selected letter of credit.",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      console.error("Error linking letter of credit", error);
      toast({
        title: "Link failed",
        description: error?.message ?? "We couldn't link this letter of credit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStageClick = (stageId: VesselStageId) => {
    setActiveStageId(stageId);
    setSelectedFile(null);
    const stage = VESSEL_STAGES.find((item) => item.id === stageId);
    if (stage?.entryType === "number") {
      const entry = stageEntriesByStage.get(stageId);
      setStageNumberValue(entry?.numberValue ?? "");
      setHasEditedStageNumber(false);
    } else {
      setStageNumberValue("");
      setHasEditedStageNumber(false);
    }
    setSelectedLcId("");
    setShowDocumentDialog(true);
  };

  const handleDialogClose = () => {
    setShowDocumentDialog(false);
    setActiveStageId(null);
    setSelectedFile(null);
    setStageNumberValue("");
    setHasEditedStageNumber(false);
    setSelectedLcId("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleDialogClose();
    } else {
      setShowDocumentDialog(true);
    }
  };

  useEffect(() => {
    if (!showDocumentDialog || !activeStageId || hasEditedStageNumber) return;
    const stage = VESSEL_STAGES.find((item) => item.id === activeStageId);
    if (stage?.entryType === "number") {
      const entry = stageEntriesByStage.get(activeStageId);
      if (typeof entry?.numberValue === "string") {
        setStageNumberValue(entry.numberValue);
      }
    }
  }, [
    showDocumentDialog,
    activeStageId,
    stageEntriesByStage,
    hasEditedStageNumber,
  ]);

  useEffect(() => {
    if (!showDocumentDialog || !activeStageId) return;
    const stage = VESSEL_STAGES.find((item) => item.id === activeStageId);
    if (stage?.entryType !== "lc") return;

    if (availableLcOptions.length === 0) {
      if (selectedLcId !== "") {
        setSelectedLcId("");
      }
      return;
    }

    const hasSelection = availableLcOptions.some((option) => option.id === selectedLcId);
    if (!hasSelection) {
      setSelectedLcId(availableLcOptions[0].id);
    }
  }, [showDocumentDialog, activeStageId, availableLcOptions, selectedLcId]);

  const activeStage = activeStageId
    ? VESSEL_STAGES.find((stage) => stage.id === activeStageId)
    : undefined;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
  };

  const handleStageAction = () => {
    if (!activeStageId || !activeStage) return;

    if (activeStage.entryType === "number") {
      const trimmed = stageNumberValue.trim();
      if (!trimmed) return;
      saveStageNumberMutation.mutate({ stageId: activeStageId, numberValue: trimmed });
      return;
    }

    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, stageId: activeStageId });
  };

  const handleLinkLc = () => {
    if (!activeStageId || !activeStage || activeStage.entryType !== "lc") return;
    if (!selectedLcId) return;
    linkLcMutation.mutate({ letterOfCreditId: selectedLcId });
  };

  const handleUploadLcDocument = () => {
    if (!activeStageId || !activeStage || activeStage.entryType !== "lc") return;
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, stageId: activeStageId });
  };

  const existingStageCompletion = activeStageId
    ? stageCompletionByStage.get(activeStageId)
    : undefined;
  const existingStageDocument =
    existingStageCompletion?.kind === "document"
      ? existingStageCompletion.data
      : undefined;
  const existingStageNumber =
    existingStageCompletion?.kind === "number"
      ? existingStageCompletion.data
      : undefined;
  const isNumberStage = activeStage?.entryType === "number";
  const isLcStage = activeStage?.entryType === "lc";
  const trimmedStageNumberValue = stageNumberValue.trim();
  const isSavingStageNumber = saveStageNumberMutation.isPending;
  const isLinkingLc = linkLcMutation.isPending;
  const isUploadingDocument = uploadMutation.isPending;
  const isActionPending = isSavingStageNumber || isLinkingLc || isUploadingDocument;
  const isLcLinkDisabled =
    !selectedLcId ||
    availableLcsLoading ||
    availableLcOptions.length === 0 ||
    isLinkingLc ||
    isUploadingDocument;
  const isLcUploadDisabled = !selectedFile || isUploadingDocument || isLinkingLc;

  const getCurrentStageIndex = (vessel: any) => {
    if (!vessel || !vessel.status) return 0;
    const stage = findStageByStatus(vessel.status);
    if (!stage) return 0;
    const stageIndex = VESSEL_STAGES.findIndex((item) => item.id === stage.id);
    return stageIndex >= 0 ? stageIndex : 0;
  };

  const getStageStatus = (stageIndex: number, currentStageIndex: number) => {
    if (stageIndex < currentStageIndex) return "completed";
    if (stageIndex === currentStageIndex) return "current";
    return "pending";
  };

  const statusStageIndex = selectedVessel ? getCurrentStageIndex(selectedVessel) : 0;

  const highestCompletedStageIndex = useMemo(() => {
    let highest = -1;
    for (let index = 0; index < VESSEL_STAGES.length; index += 1) {
      const stage = VESSEL_STAGES[index];
      if (!stageCompletionByStage.has(stage.id as VesselStageId)) {
        break;
      }
      highest = index;
    }
    return highest;
  }, [stageCompletionByStage]);

  const currentStageIndex = useMemo(() => {
    const completionDrivenIndex = highestCompletedStageIndex + 1;
    const effectiveIndex = Math.max(statusStageIndex, completionDrivenIndex);
    return Math.min(effectiveIndex, VESSEL_STAGES.length - 1);
  }, [highestCompletedStageIndex, statusStageIndex]);

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
    return stageRows.map((row, index) => {
      const descriptor = {
        stages: row,
        startIndex: processed,
        isReversed: index % 2 === 1,
      };
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
            {stageRowDescriptors.map(({ stages, startIndex, isReversed }, rowIdx) => {
              const stageIndexMap = new Map(stages.map((stage, idx) => [stage.id, idx] as const));
              const displayStages = isReversed ? [...stages].reverse() : stages;

              return (
                <div key={`row-${rowIdx}`} className="relative pb-20 md:pb-24">
                  <div className="flex w-full flex-wrap items-center justify-center gap-4 md:justify-between md:gap-6">
                    {displayStages.map((stage, displayIndex) => {
                      const stageId = stage.id as VesselStageId;
                      const Icon = stage.icon;
                      const originalIndex = stageIndexMap.get(stage.id) ?? displayIndex;
                      const globalIndex = startIndex + originalIndex;
                      const status = getStageStatus(globalIndex, currentStageIndex);
                      const stageCompletion = stageCompletionByStage.get(stageId);
                      const hasStageCompletion = Boolean(stageCompletion);
                      const isCurrent = status === "current" && !hasStageCompletion;
                      const isCompleted = hasStageCompletion || status === "completed";
                      const shouldHighlightConnector =
                        hasStageCompletion || globalIndex < currentStageIndex;
                      const savedNumberValue =
                        stage.entryType === "number"
                          ? stageEntriesByStage.get(stageId)?.numberValue?.trim() || undefined
                          : undefined;
                      const nodeBaseClasses =
                        "z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300 shadow-sm";
                      const nodeStateClasses = hasStageCompletion
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                          ? "bg-blue-500 border-blue-500 text-white ring-4 ring-blue-200"
                          : isCompleted
                            ? "bg-green-100 border-green-300 text-green-800"
                            : "bg-white border-gray-300 text-gray-500";
                      const nodeClasses = [
                        nodeBaseClasses,
                        nodeStateClasses,
                        stageDataLoading ? "cursor-wait" : "cursor-pointer",
                      ].join(" ");
                      const isLastOverall = globalIndex === VESSEL_STAGES.length - 1;
                      const isFirstDisplay = displayIndex === 0;
                      const isLastDisplay = displayIndex === displayStages.length - 1;
                      const hasNextStageInRow = isReversed ? !isFirstDisplay : !isLastDisplay;
                      const isFinalStage = stageId === "swift";
                      const showHorizontalConnector = !isFinalStage && !isLastOverall && hasNextStageInRow;
                      const isTransitionStage = isReversed ? isFirstDisplay : isLastDisplay;
                      const showVerticalConnector =
                        !isLastOverall && isTransitionStage && rowIdx < stageRowDescriptors.length - 1;
                      const connectorAlignment: "left" | "right" = isReversed ? "left" : "right";

                      const labelOffsetClass = isCurrent ? '-bottom-20 md:-bottom-24' : '-bottom-14 md:-bottom-16';
                      const iconColorClass = isCompleted || isCurrent ? 'text-white' : 'text-gray-400';
                      const titleColorClass = isCompleted
                        ? "text-green-900"
                        : isCurrent
                          ? "text-blue-900"
                          : "text-gray-700";
                      const descriptionColorClass = isCompleted
                        ? "text-green-700"
                        : isCurrent
                          ? "text-blue-700"
                          : "text-gray-500";

                      const renderHorizontalConnector = () => (
                        <div
                          className="relative mx-3 h-0.5 min-w-[2.75rem] flex-1 overflow-visible rounded-full bg-gray-200 md:min-w-[4rem] lg:min-w-[5rem]"
                          aria-hidden
                        >
                          <div
                            className={`absolute inset-y-0 ${
                              connectorAlignment === "left" ? "right-0" : "left-0"
                            } h-0.5 transition-all duration-500 ${
                              shouldHighlightConnector
                                ? "w-full bg-green-500"
                                : isCurrent
                                  ? "w-full bg-blue-500"
                                  : "w-0"
                            }`}
                          />
                        </div>
                      );

                      const renderVerticalConnector = () => (
                        <div
                          className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2"
                          aria-hidden
                        >
                          <div className="mt-16 flex h-24 flex-col items-center md:mt-20 md:h-28">
                            <div className="relative h-full w-0.5 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`absolute inset-x-0 top-0 transition-all duration-500 ${
                                  shouldHighlightConnector
                                    ? "h-full bg-green-500"
                                    : isCurrent
                                      ? "h-full bg-blue-500"
                                      : "h-0"
                                }`}
                              />
                            </div>
                            <div
                              className={`mt-1 h-2 w-2 rotate-45 ${
                                shouldHighlightConnector
                                  ? "bg-green-500"
                                  : isCurrent
                                    ? "bg-blue-500"
                                    : "bg-gray-300"
                              }`}
                            />
                          </div>
                        </div>
                      );

                      return (
                        <div key={stage.id} className="relative flex items-center">
                          {isReversed && (
                            <>
                              {showVerticalConnector && renderVerticalConnector()}
                              {showHorizontalConnector && renderHorizontalConnector()}
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStageClick(stageId)}
                            className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                          >
                              <div className="relative">
                                <div className={nodeClasses}>
                                  <Icon className={`${iconColorClass} h-6 w-6`} />
                                </div>
                              {hasStageCompletion && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>

                            <div
                              className={`pointer-events-none absolute ${labelOffsetClass} left-1/2 w-32 -translate-x-1/2 text-center`}
                            >
                              <h3
                                className={`mb-1 text-sm font-semibold transition-colors
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
                              {savedNumberValue && (
                                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                                  Saved #: {savedNumberValue}
                                </p>
                              )}
                              {isCurrent && (
                                <Badge className="mt-2 border-0 bg-blue-100 text-[10px] text-blue-800">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </button>

                          {!isReversed && (
                            <>
                              {showHorizontalConnector && renderHorizontalConnector()}
                              {showVerticalConnector && renderVerticalConnector()}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
                ? activeStage.entryType === "number"
                  ? `Record the ${activeStage.title} reference number.`
                  : `Add supporting documentation for the ${activeStage.title} stage.`
                : "Select a vessel stage to update."}
            </DialogDescription>
          </DialogHeader>

          {isNumberStage ? (
            <>
              {existingStageNumber ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-emerald-900">Saved number</div>
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Saved</Badge>
                  </div>
                  <div className="mt-2 text-lg font-semibold text-emerald-800">
                    {existingStageNumber.numberValue}
                  </div>
                  <div className="mt-2 text-xs text-emerald-700">
                    Updated {new Date(existingStageNumber.updatedAt).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-4 text-sm text-gray-600">
                  No number has been saved for this stage yet.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="stage-number">Stage number</Label>
                <Input
                  id="stage-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={stageNumberValue}
                  onChange={(event) => {
                    setStageNumberValue(event.target.value);
                    setHasEditedStageNumber(true);
                  }}
                  disabled={isActionPending}
                />
                <p className="text-xs text-gray-500">
                  Enter the official reference number for this stage.
                </p>
              </div>
            </>
          ) : isLcStage ? (
            <>
              <div className="space-y-3">
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-4 text-sm">
                  {vesselLcLinksLoading ? (
                    <div className="flex items-center text-gray-600">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading linked letters of credit…
                    </div>
                  ) : vesselLcLinks.length > 0 ? (
                    <>
                      <div className="text-sm font-semibold text-gray-700">Linked letters of credit</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {vesselLcLinks.map((link) => (
                          <Badge key={link.id} variant="secondary" className="text-xs">
                            {link.number ?? `LC-${link.id}`}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Linking another letter of credit keeps existing links in place.
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600">
                      No letters of credit have been linked to this vessel yet.
                    </div>
                  )}
                </div>

                {availableLcsLoading ? (
                  <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading available letters of credit…
                  </div>
                ) : availableLcsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">
                    {availableLcsError instanceof Error
                      ? availableLcsError.message
                      : "We couldn't load available letters of credit."}
                  </div>
                ) : availableLcOptions.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="lc-selection">Select letter of credit</Label>
                    <Select
                      value={selectedLcId}
                      onValueChange={(value) => {
                        setSelectedLcId(value);
                      }}
                      disabled={isActionPending}
                    >
                      <SelectTrigger id="lc-selection">
                        <SelectValue placeholder="Choose letter of credit" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLcOptions.map(({ id, summary }) => {
                          const remainingLabel = summary.remainingQuantity.toLocaleString(undefined, {
                            maximumFractionDigits: 3,
                          });
                          const totalLabel = summary.totalQuantity.toLocaleString(undefined, {
                            maximumFractionDigits: 3,
                          });
                          return (
                            <SelectItem key={id} value={id}>
                              {summary.lcNumber} • {remainingLabel} / {totalLabel} tons remaining
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Only letters of credit matching the vessel cargo type with remaining quantity are shown.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700">
                    No matching letters of credit with remaining quantity are currently available for this vessel.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="lc-stage-document">Upload LC document</Label>
                  <Input
                    id="lc-stage-document"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={isActionPending}
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-500">Selected file: {selectedFile.name}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {existingStageDocument ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-emerald-900">
                      {existingStageDocument.fileName}
                    </div>
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Uploaded</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-emerald-700">
                    <span>
                      Uploaded {new Date(existingStageDocument.uploadedAt).toLocaleString()}
                    </span>
                    {existingStageDocument.fileUrl && (
                      <Button
                        variant="link"
                        className="h-auto px-0 text-emerald-900"
                        onClick={() => {
                          if (existingStageDocument.fileUrl) {
                            window.open(existingStageDocument.fileUrl, "_blank");
                          }
                        }}
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
                  disabled={isActionPending}
                />
                {selectedFile && (
                  <p className="text-xs text-gray-500">Selected file: {selectedFile.name}</p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            {isLcStage ? (
              <>
                <Button
                  type="button"
                  onClick={handleLinkLc}
                  disabled={isLcLinkDisabled}
                >
                  {linkLcMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Link LC
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleUploadLcDocument}
                  disabled={isLcUploadDisabled}
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
              </>
            ) : (
              <Button
                type="button"
                onClick={handleStageAction}
                disabled={
                  isNumberStage
                    ? !trimmedStageNumberValue || isActionPending
                    : !selectedFile || isActionPending
                }
              >
                {isNumberStage ? (
                  saveStageNumberMutation.isPending ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save number
                    </>
                  )
                ) : uploadMutation.isPending ? (
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
