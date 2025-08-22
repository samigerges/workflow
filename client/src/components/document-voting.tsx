import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, FileText, MessageSquare, Clock } from "lucide-react";

interface DocumentVotingProps {
  entityType: string;
  entityId: number;
  allowVoting?: boolean; // Whether current user can vote
}

export default function DocumentVoting({ entityType, entityId, allowVoting = true }: DocumentVotingProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [votingDocumentId, setVotingDocumentId] = useState<number | null>(null);
  const [voteType, setVoteType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState("");
  const [showVoteDialog, setShowVoteDialog] = useState(false);

  const { data: documentVotes = [], isLoading } = useQuery({
    queryKey: [`/api/document-votes/${entityType}/${entityId}`],
    retry: false,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ documentId, vote, comment }: { documentId: number; vote: string; comment?: string }) => {
      await apiRequest("POST", `/api/document-votes/${documentId}/vote`, {
        vote,
        comment,
        entityType,
        entityId,
        fileName: `${entityType}_document`,
        filePath: `uploads/${entityType}_${entityId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/document-votes/${entityType}/${entityId}`] });
      setShowVoteDialog(false);
      setComment("");
      setVotingDocumentId(null);
      setVoteType(null);
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      });
    },
  });

  const handleVote = (documentId: number, vote: 'approve' | 'reject') => {
    setVotingDocumentId(documentId);
    setVoteType(vote);
    
    if (vote === 'reject') {
      setShowVoteDialog(true);
    } else {
      // For approve votes, submit immediately
      voteMutation.mutate({ documentId, vote });
    }
  };

  const submitVote = () => {
    if (!votingDocumentId || !voteType) return;
    
    if (voteType === 'reject' && !comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejecting the document",
        variant: "destructive",
      });
      return;
    }
    
    voteMutation.mutate({
      documentId: votingDocumentId,
      vote: voteType,
      comment: comment.trim() || undefined,
    });
  };

  const getVoteStatusBadge = (votes: any[]) => {
    const approvals = votes.filter(v => v.vote === 'approve').length;
    const rejections = votes.filter(v => v.vote === 'reject').length;
    const pending = votes.filter(v => v.vote === 'pending').length;

    if (rejections > 0) {
      return <Badge variant="destructive" className="flex items-center space-x-1">
        <XCircle size={12} />
        <span>Rejected</span>
      </Badge>;
    }
    
    if (pending > 0) {
      return <Badge variant="secondary" className="flex items-center space-x-1">
        <Clock size={12} />
        <span>Pending Review</span>
      </Badge>;
    }
    
    if (approvals > 0) {
      return <Badge variant="default" className="flex items-center space-x-1 bg-green-600">
        <CheckCircle size={12} />
        <span>Approved</span>
      </Badge>;
    }

    return <Badge variant="outline">No votes</Badge>;
  };

  const getUserVote = (votes: any[]) => {
    return votes?.find(v => v.userId === (user as any)?.id);
  };

  const hasUserVoted = (votes: any[]) => {
    const userVote = getUserVote(votes);
    return userVote && userVote.vote !== 'pending';
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading documents...</div>;
  }

  if (!Array.isArray(documentVotes) || documentVotes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-secondary-600">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No documents uploaded for voting</p>
        </CardContent>
      </Card>
    );
  }

  // Group votes by document
  const documentGroups = (documentVotes as any[]).reduce((acc: any, vote: any) => {
    const key = `${vote.fileName}_${vote.filePath}`;
    if (!acc[key]) {
      acc[key] = {
        fileName: vote.fileName,
        filePath: vote.filePath,
        uploadedBy: vote.uploadedBy,
        createdAt: vote.createdAt,
        votes: [],
      };
    }
    acc[key].votes.push(vote);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Document Approval</h3>
      
      {Object.values(documentGroups).map((docGroup: any, index) => {
        const userVoted = hasUserVoted(docGroup.votes);
        const userVote = getUserVote(docGroup.votes);
        
        return (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <FileText size={16} />
                  <span>{docGroup.fileName}</span>
                </CardTitle>
                {getVoteStatusBadge(docGroup.votes)}
              </div>
              <p className="text-sm text-secondary-600">
                Uploaded {new Date(docGroup.createdAt).toLocaleDateString()}
              </p>
            </CardHeader>
            
            <CardContent>
              {/* Recommendation Actions */}
              {allowVoting && !userVoted && (
                <div className="flex space-x-3 mb-4">
                  <Button
                    onClick={() => handleVote(docGroup.votes[0].id, 'approve')}
                    disabled={voteMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleVote(docGroup.votes[0].id, 'reject')}
                    disabled={voteMutation.isPending}
                    variant="destructive"
                  >
                    <XCircle size={16} className="mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {/* User's Current Vote */}
              {userVoted && (
                <div className="mb-4 p-3 bg-secondary-50 rounded-lg">
                  <p className="text-sm font-medium">
                    Your vote: {userVote.vote === 'approve' ? 'Approved' : 'Rejected'}
                  </p>
                  {userVote.comment && (
                    <p className="text-sm text-secondary-600 mt-1">
                      Comment: {userVote.comment}
                    </p>
                  )}
                </div>
              )}

              {/* All Votes Summary */}
              <div className="text-sm">
                <p className="font-medium mb-2">Voting Summary:</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-green-600 font-semibold">
                      {docGroup.votes.filter((v: any) => v.vote === 'approve').length}
                    </p>
                    <p className="text-xs text-secondary-600">Approved</p>
                  </div>
                  <div>
                    <p className="text-red-600 font-semibold">
                      {docGroup.votes.filter((v: any) => v.vote === 'reject').length}
                    </p>
                    <p className="text-xs text-secondary-600">Rejected</p>
                  </div>
                  <div>
                    <p className="text-yellow-600 font-semibold">
                      {docGroup.votes.filter((v: any) => v.vote === 'pending').length}
                    </p>
                    <p className="text-xs text-secondary-600">Pending</p>
                  </div>
                </div>
              </div>

              {/* Comments from rejections */}
              {docGroup.votes.some((v: any) => v.vote === 'reject' && v.comment) && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">Rejection Comments:</p>
                  {docGroup.votes
                    .filter((v: any) => v.vote === 'reject' && v.comment)
                    .map((vote: any, idx: number) => (
                      <div key={idx} className="text-sm text-red-700 mb-1">
                        • {vote.comment}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Rejection Comment Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectComment">Please provide a reason for rejection *</Label>
              <Textarea
                id="rejectComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain why you're rejecting this document..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowVoteDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={submitVote}
                disabled={voteMutation.isPending || !comment.trim()}
              >
                Submit Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}