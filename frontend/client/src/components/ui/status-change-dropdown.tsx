import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { REQUEST_STATUSES, CONTRACT_STATUSES, VESSEL_STATUSES } from "@/lib/constants";

interface StatusChangeDropdownProps {
  entityType: "request" | "contract" | "vessel";
  entityId: number;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS = {
  request: REQUEST_STATUSES,
  contract: CONTRACT_STATUSES,
  vessel: VESSEL_STATUSES,
};

export default function StatusChangeDropdown({
  entityType,
  entityId,
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusChangeDropdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const statusOptions = STATUS_OPTIONS[entityType];

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/${entityType}s/${entityId}/status`, { status: newStatus });
    },
    onSuccess: (_, newStatus) => {
      // Remove all queries for this entity type from cache completely
      queryClient.removeQueries({ queryKey: [`/api/${entityType}s`] });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === `/api/${entityType}s` });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });
      if (entityType === "contract") {
        queryClient.removeQueries({ queryKey: ["/api/contracts"] });
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "/api/contracts" });
      }
      toast({
        title: "Success",
        description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} status updated successfully`,
      });
      onStatusChange?.(newStatus);
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
        description: `Failed to update ${entityType} status`,
        variant: "destructive",
      });
      setSelectedStatus(currentStatus); // Reset to original status
    },
  });

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  return (
    <div className="flex items-center space-x-2">
      <Select 
        value={selectedStatus} 
        onValueChange={handleStatusChange}
        disabled={disabled || updateStatusMutation.isPending}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusOptions).map(([status, config]) => (
            <SelectItem key={status} value={status}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {updateStatusMutation.isPending && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      )}
    </div>
  );
}