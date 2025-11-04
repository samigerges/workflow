import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Link2Off } from "lucide-react";
import type { NeedProgress } from "@/types/needs";

interface NeedsAlertsProps {
  backlogNeeds: NeedProgress[];
  unassignedNeeds: NeedProgress[];
}

export function NeedsAlerts({ backlogNeeds, unassignedNeeds }: NeedsAlertsProps) {
  if (backlogNeeds.length === 0 && unassignedNeeds.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {backlogNeeds.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Backlog attention</AlertTitle>
          <AlertDescription>
            {backlogNeeds.length} {backlogNeeds.length === 1 ? "need" : "needs"} still have remaining
            quantity this month. Prioritize discharge plans to avoid delays.
          </AlertDescription>
        </Alert>
      )}

      {unassignedNeeds.length > 0 && (
        <Alert className="bg-rose-50 border-rose-200 text-rose-800">
          <Link2Off className="h-5 w-5" />
          <AlertTitle>Needs without assigned vessels</AlertTitle>
          <AlertDescription>
            {unassignedNeeds.length} {unassignedNeeds.length === 1 ? "need" : "needs"} have no linked
            vessel yet. Assign vessels or update contracts to start tracking fulfillment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
