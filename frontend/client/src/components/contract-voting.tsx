import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, MessageSquare, User, Calendar, Vote } from 'lucide-react';

interface ContractVote {
  id: number;
  contractId: number;
  userId: string;
  vote: 'yes' | 'no';
  comment?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface ContractVotingContentProps {
  contractId: number;
  currentUserId?: string;
}

interface ContractVoteButtonProps {
  contractId: number;
  currentUserId?: string;
}

// Component for just the voting content (used in dialog)
export function ContractVotingContent({ contractId, currentUserId }: ContractVotingContentProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no'>('yes');
  const [comment, setComment] = useState('');

  // Fetch existing votes for this contract
  const { data: votesData, isLoading, refetch } = useQuery({
    queryKey: [`/api/contracts/${contractId}/votes`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contracts/${contractId}/votes`);
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest votes
  });

  const votes: ContractVote[] = votesData || [];

  // Check if current user has already voted
  const userVote = votes.find((vote: ContractVote) => vote.userId === currentUserId);
  const canVote = !userVote; // One vote per user

  const submitVoteMutation = useMutation({
    mutationFn: async ({ vote, comment }: { vote: string; comment?: string }) => {
      const response = await apiRequest('POST', `/api/contracts/${contractId}/votes`, {
        vote,
        comment: comment || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Opinion Submitted",
        description: "Your opinion has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}/votes`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setShowVoteDialog(false);
      setComment('');
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to submit opinion";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmitVote = () => {
    submitVoteMutation.mutate({
      vote: voteType,
      comment: comment.trim() || undefined,
    });
  };

  const yesVotes = votes.filter(vote => vote.vote === 'yes');
  const noVotes = votes.filter(vote => vote.vote === 'no');

  return (
    <div className="space-y-6">
      {/* Recommendation Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Contract Opinions Summary</span>
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
              votes.map((vote: ContractVote) => (
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

// Standalone Vote Button Component
export function ContractVoteButton({ contractId, currentUserId }: ContractVoteButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [voteType, setVoteType] = useState<'yes' | 'no'>('yes');
  const [comment, setComment] = useState('');

  // Check if user has already voted
  const { data: votesData } = useQuery({
    queryKey: [`/api/contracts/${contractId}/votes`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contracts/${contractId}/votes`);
      return response.json();
    },
  });

  const votes: ContractVote[] = votesData || [];
  const userVote = votes.find((vote: ContractVote) => vote.userId === currentUserId);
  const canVote = !userVote;

  const submitVoteMutation = useMutation({
    mutationFn: async ({ vote, comment }: { vote: string; comment?: string }) => {
      const response = await apiRequest('POST', `/api/contracts/${contractId}/votes`, {
        vote,
        comment: comment || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Opinion Submitted",
        description: "Your opinion has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}/votes`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setComment('');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to submit opinion";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmitVote = () => {
    if (voteType === 'no' && !comment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason when rejecting a contract.",
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
    <Dialog>
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
          <DialogTitle>Recommend on Contract</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Your Opinion</Label>
            <div className="flex space-x-4 mt-2">
              <Button
                variant={voteType === 'yes' ? 'default' : 'outline'}
                onClick={() => setVoteType('yes')}
                className={voteType === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant={voteType === 'no' ? 'default' : 'outline'}
                onClick={() => setVoteType('no')}
                className={voteType === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="comment" className="text-base font-medium">
              Comment {voteType === 'no' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={voteType === 'no' ? "Please provide a reason for rejection..." : "Add your comments (optional)"}
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleSubmitVote}
              disabled={submitVoteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitVoteMutation.isPending ? "Submitting..." : "Submit Recommendation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}