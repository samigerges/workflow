import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Upload, Check, X, MessageSquare } from "lucide-react";

const voteSchema = z.object({
  vote: z.enum(["accept", "reject"]),
  comment: z.string().optional(),
}).refine((data) => {
  if (data.vote === "reject" && (!data.comment || data.comment.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Comment is required when rejecting a document",
  path: ["comment"],
});

type VoteFormData = z.infer<typeof voteSchema>;

interface DocumentUploadVoteProps {
  entityType: string;
  entityId: number;
}

export default function DocumentUploadVote({ entityType, entityId }: DocumentUploadVoteProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [votingDocument, setVotingDocument] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<VoteFormData>({
    resolver: zodResolver(voteSchema),
  });

  const watchedVote = watch("vote");

  // Fetch documents for this entity
  const { data: documents } = useQuery({
    queryKey: ["/api/document-votes", entityType, entityId],
    retry: false,
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId.toString());
      formData.append("description", `${entityType} document`);

        const response = await apiRequest("POST", "/api/upload-document", formData);

        if (!response.ok) {
          throw new Error("Failed to upload document");
        }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-votes", entityType, entityId] });
      setSelectedFile(null);
      setUploading(false);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      setUploading(false);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  // Vote submission mutation
  const voteMutation = useMutation({
    mutationFn: async (data: VoteFormData & { documentId: number }) => {
      return await apiRequest(`/api/document-votes/${data.documentId}/vote`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-votes", entityType, entityId] });
      setShowVoteDialog(false);
      setVotingDocument(null);
      reset();
      toast({
        title: "Success",
        description: "Vote submitted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only PDF, DOC, and DOCX files are allowed",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    uploadMutation.mutate(selectedFile);
  };

  const handleVote = (document: any) => {
    setVotingDocument(document);
    setShowVoteDialog(true);
  };

  const onSubmitVote = (data: VoteFormData) => {
    if (!votingDocument) return;
    
    voteMutation.mutate({
      ...data,
      documentId: votingDocument.id,
    });
  };

  const getVoteStatusColor = (votes: any[]) => {
    const acceptVotes = votes?.filter(v => v.vote === "accept").length || 0;
    const rejectVotes = votes?.filter(v => v.vote === "reject").length || 0;
    
    if (rejectVotes > 0) return "bg-red-100 text-red-800";
    if (acceptVotes >= 2) return "bg-green-100 text-green-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getVoteStatusText = (votes: any[]) => {
    const acceptVotes = votes?.filter(v => v.vote === "accept").length || 0;
    const rejectVotes = votes?.filter(v => v.vote === "reject").length || 0;
    
    if (rejectVotes > 0) return "Rejected";
    if (acceptVotes >= 2) return "Approved";
    return `Pending (${acceptVotes}/2 approvals)`;
  };

  const hasUserVoted = (votes: any[]) => {
    return votes?.some(v => v.userId === user?.id);
  };

  return (
    <div className="space-y-6">
      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            Upload Document for Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Select Document (PDF, DOC, DOCX)</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>
          
          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
          
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            Documents & Votes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{doc.fileName}</h4>
                      <p className="text-sm text-gray-600">
                        Uploaded by {doc.uploadedByUser?.firstName} {doc.uploadedByUser?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getVoteStatusColor(doc.votes)}>
                      {getVoteStatusText(doc.votes)}
                    </Badge>
                  </div>

                  {/* Votes Display */}
                  {doc.votes && doc.votes.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                      <div className="space-y-2">
                        {doc.votes.map((vote: any) => (
                          <div key={vote.id} className="flex items-start gap-2 text-sm">
                            {vote.vote === "accept" ? (
                              <Check size={16} className="text-green-600 mt-0.5" />
                            ) : (
                              <X size={16} className="text-red-600 mt-0.5" />
                            )}
                            <div>
                              <span className="font-medium">
                                {vote.user?.firstName} {vote.user?.lastName}
                              </span>
                              <span className={vote.vote === "accept" ? "text-green-600" : "text-red-600"}>
                                {" "}({vote.vote})
                              </span>
                              {vote.comment && (
                                <p className="text-gray-600 mt-1">{vote.comment}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vote Button */}
                  {!hasUserVoted(doc.votes) && (
                    <Button
                      size="sm"
                      onClick={() => handleVote(doc)}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare size={14} />
                      Vote
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vote on Document</DialogTitle>
          </DialogHeader>
          
          {votingDocument && (
            <form onSubmit={handleSubmit(onSubmitVote)} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Document: {votingDocument.fileName}
                </p>
                
                <Label>Your Vote *</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="accept"
                      {...register("vote")}
                      className="text-green-600"
                    />
                    <Check size={16} className="text-green-600" />
                    Accept
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="reject"
                      {...register("vote")}
                      className="text-red-600"
                    />
                    <X size={16} className="text-red-600" />
                    Reject
                  </label>
                </div>
                {errors.vote && (
                  <p className="text-sm text-red-500 mt-1">{errors.vote.message}</p>
                )}
              </div>

              {watchedVote === "reject" && (
                <div>
                  <Label htmlFor="comment">Comment (Required for rejection) *</Label>
                  <Textarea
                    id="comment"
                    {...register("comment")}
                    rows={3}
                    placeholder="Please explain why you are rejecting this document..."
                    className={errors.comment ? "border-red-500" : ""}
                  />
                  {errors.comment && (
                    <p className="text-sm text-red-500 mt-1">{errors.comment.message}</p>
                  )}
                </div>
              )}

              {watchedVote === "accept" && (
                <div>
                  <Label htmlFor="comment">Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    {...register("comment")}
                    rows={3}
                    placeholder="Any additional comments..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowVoteDialog(false);
                    setVotingDocument(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={voteMutation.isPending}
                >
                  {voteMutation.isPending ? "Submitting..." : "Submit Recommendation"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}