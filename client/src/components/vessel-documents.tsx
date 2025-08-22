import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, Plus, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const documentUploadSchema = z.object({
  documentType: z.string().min(1, "Document type is required"),
  documentName: z.string().min(1, "Document name is required"),
  notes: z.string().optional(),
});

type DocumentUploadData = z.infer<typeof documentUploadSchema>;

const DOCUMENT_TYPES = [
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "certificate_origin", label: "Certificate of Origin" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "quality_certificate", label: "Quality Certificate" },
  { value: "phytosanitary", label: "Phytosanitary Certificate" },
  { value: "customs_release", label: "Customs Release Document" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "weight_certificate", label: "Weight Certificate" },
  { value: "fumigation_certificate", label: "Fumigation Certificate" },
  { value: "shipping_instructions", label: "Shipping Instructions" },
  { value: "other", label: "Other Document" },
];

interface VesselDocumentsProps {
  vessel: any;
}

export default function VesselDocuments({ vessel }: VesselDocumentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<DocumentUploadData>({
    resolver: zodResolver(documentUploadSchema),
  });

  // Fetch vessel documents
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vessels", vessel.id, "documents"],
    enabled: !!vessel.id,
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: DocumentUploadData) => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', data.documentType);
      formData.append('documentName', data.documentName);
      if (data.notes) {
        formData.append('notes', data.notes);
      }

      const response = await fetch(`/api/vessels/${vessel.id}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vessels", vessel.id, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] }); // Refresh vessel list to show status changes
      setShowUploadDialog(false);
      setSelectedFile(null);
      reset();
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/vessels/${vessel.id}/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vessels", vessel.id, "documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DocumentUploadData) => {
    uploadMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Vessel Documents</span>
          </CardTitle>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Vessel Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select onValueChange={(value) => setValue("documentType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.documentType && (
                    <p className="text-sm text-red-500 mt-1">{errors.documentType.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="documentName">Document Name</Label>
                  <Input
                    id="documentName"
                    {...register("documentName")}
                    placeholder="Enter document name"
                    className={errors.documentName ? "border-red-500" : ""}
                  />
                  {errors.documentName && (
                    <p className="text-sm text-red-500 mt-1">{errors.documentName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="document">Upload File</Label>
                  <Input
                    id="document"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Add any notes about this document"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={uploadMutation.isPending || !selectedFile}
                    className="flex-1"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowUploadDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No documents uploaded yet</p>
            <p className="text-sm text-gray-400">
              Upload documents like Bill of Lading, Commercial Invoice, or Customs Release
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document: any) => (
              <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {document.documentName}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {getDocumentTypeLabel(document.documentType)}
                      </Badge>
                      {document.documentType === 'customs_release' && (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                          Auto-completes vessel
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {document.fileName}
                    </p>
                    {document.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {document.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/uploads/${document.fileName}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(document.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}