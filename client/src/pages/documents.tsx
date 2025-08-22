import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/main-layout";
import DocumentVoting from "@/components/document-voting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Upload, Download, Vote, Trash2 } from "lucide-react";

// Document types for different stages of import
const DOCUMENT_TYPES = [
  { value: "invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "certificate_origin", label: "Certificate of Origin" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "quality_certificate", label: "Quality Certificate" },
  { value: "phytosanitary", label: "Phytosanitary Certificate" },
  { value: "customs_declaration", label: "Customs Declaration" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "weight_certificate", label: "Weight Certificate" },
  { value: "fumigation_certificate", label: "Fumigation Certificate" },
  { value: "other", label: "Other Document" },
];

export default function Documents() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVotingDialog, setShowVotingDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [relatedEntity, setRelatedEntity] = useState("");
  const [relatedEntityId, setRelatedEntityId] = useState("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch requests for linking documents
  const { data: requests = [] } = useQuery({
    queryKey: ["/api/requests"],
    retry: false,
  });

  // Fetch contracts for linking documents
  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: false,
  });

  // Fetch vessels for linking documents
  const { data: vessels = [] } = useQuery({
    queryKey: ["/api/vessels"],
    retry: false,
  });

  // Fetch all document votes (this will serve as our document list)
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      // Since we don't have a dedicated documents endpoint, 
      // we'll aggregate document votes from different entities
      const allDocs: any[] = [];
      
      // Get documents from requests
      for (const request of requests) {
        try {
          const requestDocs = await apiRequest("GET", `/api/document-votes/request/${request.id}`);
          allDocs.push(...(requestDocs as any[]).map(doc => ({ ...doc, sourceType: 'request', sourceTitle: request.title })));
        } catch (error) {
          console.error(`Failed to fetch documents for request ${request.id}`);
        }
      }
      
      // Get documents from contracts
      for (const contract of contracts) {
        try {
          const contractDocs = await apiRequest("GET", `/api/document-votes/contract/${contract.id}`);
          allDocs.push(...(contractDocs as any[]).map(doc => ({ ...doc, sourceType: 'contract', sourceTitle: contract.supplierName || `Contract ${contract.id}` })));
        } catch (error) {
          console.error(`Failed to fetch documents for contract ${contract.id}`);
        }
      }

      // Get documents from vessels
      for (const vessel of vessels) {
        try {
          const vesselDocs = await apiRequest("GET", `/api/vessels/${vessel.id}/documents`);
          allDocs.push(...(vesselDocs as any[]).map(doc => ({ 
            ...doc, 
            sourceType: 'vessel', 
            sourceTitle: vessel.vesselName,
            entityType: 'vessel',
            entityId: vessel.id,
            fileName: doc.fileName,
            filePath: doc.filePath
          })));
        } catch (error) {
          console.error(`Failed to fetch documents for vessel ${vessel.id}`);
        }
      }
      
      return allDocs;
    },
    enabled: !!(requests.length || contracts.length || vessels.length),
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDocumentType("");
      setDocumentTitle("");
      setRelatedEntity("");
      setRelatedEntityId("");
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOC, or DOCX file",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !documentType || !documentTitle || !relatedEntity) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for when a specific entity is selected but no ID is provided
    if (relatedEntity !== 'general' && !relatedEntityId) {
      toast({
        title: "Missing selection",
        description: `Please select a ${relatedEntity}`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('entityType', relatedEntity || 'general');
    formData.append('entityId', relatedEntityId || '0');
    formData.append('documentType', documentType);
    formData.append('title', documentTitle);

    uploadMutation.mutate(formData);
  };

  const getStatusBadge = (votes: any[]) => {
    const approvals = votes?.filter(v => v.vote === 'approve').length || 0;
    const rejections = votes?.filter(v => v.vote === 'reject').length || 0;
    const pending = votes?.filter(v => v.vote === 'pending').length || 0;

    if (rejections > 0) {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (pending > 0) {
      return <Badge variant="secondary">Pending Review</Badge>;
    }
    if (approvals > 0) {
      return <Badge variant="default" className="bg-green-600">Approved</Badge>;
    }
    return <Badge variant="outline">No votes</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Group documents by entity
  const groupedDocuments = documents.reduce((acc: any, doc: any) => {
    const key = `${doc.entityType}_${doc.entityId}`;
    if (!acc[key]) {
      acc[key] = {
        entityType: doc.entityType,
        entityId: doc.entityId,
        sourceTitle: doc.sourceTitle,
        documents: []
      };
    }
    acc[key].documents.push(doc);
    return acc;
  }, {});

  return (
    <MainLayout title="Documents" subtitle="Manage import documents and approvals">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">Document Management</h1>
                <p className="text-secondary-600">Upload and manage import-related documents</p>
              </div>
              
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary-500 hover:bg-primary-600 text-black border-2 border-primary-700 hover:border-primary-800 w-full sm:w-auto">
                    <Plus size={20} className="mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload New Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="documentTitle">Document Title *</Label>
                      <Input
                        id="documentTitle"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="Enter document title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="documentType">Document Type *</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="relatedEntity">Related To *</Label>
                      <Select value={relatedEntity} onValueChange={(value) => {
                        setRelatedEntity(value);
                        setRelatedEntityId("");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="request">Import Request</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="vessel">Vessel</SelectItem>
                          <SelectItem value="general">General Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {relatedEntity === 'request' && (
                      <div>
                        <Label htmlFor="relatedRequest">Select Request</Label>
                        <Select value={relatedEntityId} onValueChange={setRelatedEntityId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select request" />
                          </SelectTrigger>
                          <SelectContent>
                            {(requests as any[]).map((request) => (
                              <SelectItem key={request.id} value={request.id.toString()}>{request.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {relatedEntity === 'contract' && (
                      <div>
                        <Label htmlFor="relatedContract">Select Contract</Label>
                        <Select value={relatedEntityId} onValueChange={setRelatedEntityId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract" />
                          </SelectTrigger>
                          <SelectContent>
                            {(contracts as any[]).map((contract) => (
                              <SelectItem key={contract.id} value={contract.id.toString()}>
                                {contract.supplierName || `Contract ${contract.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {relatedEntity === 'vessel' && (
                      <div>
                        <Label htmlFor="relatedVessel">Select Vessel *</Label>
                        <Select value={relatedEntityId} onValueChange={setRelatedEntityId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vessel" />
                          </SelectTrigger>
                          <SelectContent>
                            {(vessels as any[]).map((vessel) => (
                              <SelectItem key={vessel.id} value={vessel.id.toString()}>
                                {vessel.vesselName} - {vessel.cargoType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="fileUpload">Choose File *</Label>
                      <Input
                        id="fileUpload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <p className="text-sm text-green-600 mt-1">Selected: {selectedFile.name}</p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowUploadDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Document Groups */}
          <div className="space-y-6">
            {documentsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading documents...</div>
                </CardContent>
              </Card>
            ) : Object.keys(groupedDocuments).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-secondary-600">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                  <p className="text-sm">Upload your first document to get started</p>
                </CardContent>
              </Card>
            ) : (
              Object.values(groupedDocuments).map((group: any, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{group.sourceTitle} ({group.entityType})</span>
                      <Badge variant="outline">{group.documents.length} documents</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.documents.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="flex items-center space-x-2">
                              <FileText size={16} />
                              <span>{doc.fileName}</span>
                            </TableCell>
                            <TableCell>
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge([doc])}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setShowVotingDialog(true);
                                  }}
                                  title="Vote on Document"
                                >
                                  <Vote size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Document Voting Dialog */}
          <Dialog open={showVotingDialog} onOpenChange={setShowVotingDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Document Voting - {selectedDocument?.fileName}</DialogTitle>
              </DialogHeader>
              {selectedDocument && (
                <DocumentVoting 
                  entityType={selectedDocument.entityType}
                  entityId={selectedDocument.entityId}
                  allowVoting={(user as any)?.role === 'admin' || (user as any)?.role === 'manager'}
                />
              )}
            </DialogContent>
          </Dialog>
    </MainLayout>
  );
}