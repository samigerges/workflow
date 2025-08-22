import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, MessageSquare, User, Calendar, Vote } from 'lucide-react';

interface RequestVote {
  id: number;
  requestId: number;
  userId: string;
  vote: 'yes' | 'no';
  comment?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface RequestVotingProps {
  requestId: number;
  currentUserId?: string;
}

interface RequestVotingContentProps {
  requestId: number;
  currentUserId?: string;
}

interface RequestVoteButtonProps {
  requestId: number;
  currentUserId?: string;
}

// Component for just the voting content (used in dialog)
export function RequestVotingContent({ requestId, currentUserId }: RequestVotingContentProps) {
  const queryClient = useQueryClient();
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no'>('yes');
  const [comment, setComment] = useState('');

  // Fetch existing votes for this request
  const { data: votesData, isLoading, refetch } = useQuery({
    queryKey: [`/api/requests/${requestId}/votes`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/requests/${requestId}/votes`);
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest votes
  });

  const votes: RequestVote[] = votesData || [];

  // Check if current user has already voted
  const userVote = votes.find((vote: RequestVote) => vote.userId === currentUserId);
  const canVote = !userVote; // One vote per user

  const submitVoteMutation = useMutation({
    mutationFn: async ({ vote, comment }: { vote: string; comment?: string }) => {
      const response = await apiRequest('POST', `/api/requests/${requestId}/votes`, {
        vote,
        comment: comment || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Opinion Submitted",
        description: "Your opinion has been recorded successfully",
      });
      
      // Invalidate and refetch votes
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}/votes`] });
      refetch();
      
      // Reset form state
      setShowVoteDialog(false);
      setComment('');
      setVoteType('yes'); // Reset to default
    },
    onError: (error: any) => {
      console.error("Vote submission error:", error);
      
      let errorMessage = "Failed to submit opinion";
      
      // Try to extract error message from different possible error formats
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Opinion Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleVoteSubmit = () => {
    if (voteType === 'no' && !comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejecting this request",
        variant: "destructive",
      });
      return;
    }

    submitVoteMutation.mutate({
      vote: voteType,
      comment: comment.trim() || undefined,
    });
  };

  const yesVotes = votes.filter((vote: RequestVote) => vote.vote === 'yes');
  const noVotes = votes.filter((vote: RequestVote) => vote.vote === 'no');

  return (
    <div className="space-y-6">
      {/* Recommendation Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Request Opinions Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">Approved: {yesVotes.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium">Rejected: {noVotes.length}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total Opinions: {votes.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current User's Vote */}
      {userVote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Opinion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-2">
              {userVote.vote === 'yes' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {userVote.vote === 'yes' ? 'Approved' : 'Rejected'}
              </span>
              <span className="text-sm text-gray-500">
                on {new Date(userVote.createdAt).toLocaleDateString()}
              </span>
            </div>
            {userVote.comment && (
              <p className="text-gray-700 mt-2">{userVote.comment}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Opinions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {votes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No opinions submitted yet.</p>
            ) : (
              votes.map((vote: RequestVote) => (
                <div key={vote.id} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex items-center space-x-2 mb-1">
                    {vote.vote === 'yes' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {vote.user?.firstName} {vote.user?.lastName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {vote.vote === 'yes' ? 'approved' : 'rejected'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(vote.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {vote.comment && (
                    <p className="text-gray-700 text-sm ml-6">{vote.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component for just the vote button
export function RequestVoteButton({ requestId, currentUserId }: RequestVoteButtonProps) {
  const queryClient = useQueryClient();
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no'>('yes');
  const [comment, setComment] = useState('');

  // Fetch existing votes for this request
  const { data: votesData, refetch } = useQuery({
    queryKey: [`/api/requests/${requestId}/votes`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/requests/${requestId}/votes`);
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const votes: RequestVote[] = votesData || [];
  const userVote = votes.find((vote: RequestVote) => vote.userId === currentUserId);
  const canVote = !userVote;

  const submitVoteMutation = useMutation({
    mutationFn: async ({ vote, comment }: { vote: string; comment?: string }) => {
      const response = await apiRequest('POST', `/api/requests/${requestId}/votes`, {
        vote,
        comment: comment || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Opinion Submitted",
        description: "Your opinion has been recorded successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}/votes`] });
      refetch();
      
      setShowVoteDialog(false);
      setComment('');
      setVoteType('yes');
    },
    onError: (error: any) => {
      console.error("Vote submission error:", error);
      
      let errorMessage = "Failed to submit opinion";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Opinion Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleVoteSubmit = () => {
    if (voteType === 'no' && !comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejecting this request",
        variant: "destructive",
      });
      return;
    }

    submitVoteMutation.mutate({
      vote: voteType,
      comment: comment.trim() || undefined,
    });
  };

  if (!canVote) {
    return (
      <Button 
        size="sm" 
        variant="outline" 
        disabled
        className="bg-gray-100 text-gray-500"
      >
        <Vote size={14} className="mr-1" />
        Recommended
      </Button>
    );
  }

  return (
    <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Vote size={14} className="mr-1" />
          Recommend
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Your Recommendation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Your Decision</Label>
            <div className="flex space-x-4 mt-2">
              <Button
                variant={voteType === 'yes' ? 'default' : 'outline'}
                onClick={() => setVoteType('yes')}
                className="flex items-center space-x-2"
              >
                <CheckCircle size={16} />
                <span>Approve</span>
              </Button>
              <Button
                variant={voteType === 'no' ? 'destructive' : 'outline'}
                onClick={() => setVoteType('no')}
                className="flex items-center space-x-2"
              >
                <XCircle size={16} />
                <span>Reject</span>
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="comment">
              {voteType === 'no' ? 'Reason for Rejection *' : 'Comment (Optional)'}
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={
                voteType === 'no' 
                  ? "Please explain why this request should be rejected..."
                  : "Add any additional comments..."
              }
              className={voteType === 'no' && !comment.trim() ? "border-red-300" : ""}
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
              onClick={handleVoteSubmit}
              disabled={submitVoteMutation.isPending}
              className={voteType === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {submitVoteMutation.isPending ? 'Submitting...' : 'Submit Recommendation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RequestVoting({ requestId, currentUserId }: RequestVotingProps) {
  return (
    <div className="space-y-4 flex items-center space-x-2">
      {/* View Opinions Button - Shows summary and all recommendations */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200">
            <MessageSquare size={16} />
            <span>View Opinions</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Request Recommendations</DialogTitle>
          </DialogHeader>
          
          <RequestVotingContent 
            requestId={requestId}
            currentUserId={currentUserId}
          />
        </DialogContent>
      </Dialog>

      {/* Recommend Button */}
      <RequestVoteButton 
        requestId={requestId}
        currentUserId={currentUserId}
      />
    </div>
  );
}