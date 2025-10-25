import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useUnauthorizedRedirect } from "@/hooks/useUnauthorizedRedirect";
import {
  FileText,
  Ship,
  TrendingUp,
  AlertTriangle,
  Anchor,
  Clock,
  Flag,
} from "lucide-react";

interface ContractJourneyReport {
  contract: {
    id: string;
    contractNo: string;
    supplierName?: string;
    amount?: number | null;
    currency?: string | null;
    createdAt: string;
    status: string;
  };
  letterOfCredit?: {
    lcId: string;
    lcNumber: string;
    bankName?: string | null;
    openedAt?: string | null;
    allocatedAmount?: number | null;
    currency?: string | null;
    balance?: number | null;
  } | null;
  vessels: Array<{
    vesselId: string;
    vesselName: string;
    port?: string | null;
    eta?: string | null;
    etd?: string | null;
    shipmentCount: number;
    requiredDocsCount: number;
    submittedDocsCount: number;
  }>;
  milestones: Array<{
    name: string;
    at: string;
    by?: string | null;
  }>;
  durations: {
    daysContractToLc?: number | null;
    daysLcToFirstVessel?: number | null;
    daysContractToLastVessel?: number | null;
  };
}

interface TimelineEvent {
  key: string;
  title: string;
  subtitle?: string;
  date?: Date | null;
  icon: JSX.Element;
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatMaybeDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dateFormatter.format(parsed);
}

function formatMaybeNumber(value?: number | null, currency?: string | null) {
  if (value === null || value === undefined) return "—";
  const formatted = numberFormatter.format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

function toComparableTime(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function buildTimeline(report: ContractJourneyReport | undefined): TimelineEvent[] {
  if (!report) return [];
  const events: TimelineEvent[] = [];

  events.push({
    key: "contract",
    title: "Contract created",
    subtitle: `Status: ${report.contract.status}`,
    date: new Date(report.contract.createdAt),
    icon: <FileText className="h-4 w-4 text-blue-500" />,
  });

  if (report.letterOfCredit) {
    events.push({
      key: `lc-${report.letterOfCredit.lcId}`,
      title: `LC opened (${report.letterOfCredit.lcNumber})`,
      subtitle: report.letterOfCredit.bankName ?? undefined,
      date: report.letterOfCredit.openedAt ? new Date(report.letterOfCredit.openedAt) : null,
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
    });
  }

  if (report.milestones.length > 0) {
    events.push(
      ...report.milestones.map<TimelineEvent>((milestone, index) => ({
        key: `milestone-${index}-${milestone.name}`,
        title: milestone.name,
        subtitle: milestone.by ? `By ${milestone.by}` : undefined,
        date: milestone.at ? new Date(milestone.at) : null,
        icon: <Flag className="h-4 w-4 text-amber-500" />,
      })),
    );
  }

  const vesselEvents = report.vessels
    .slice()
    .sort((a, b) => toComparableTime(a.eta ?? a.etd) - toComparableTime(b.eta ?? b.etd))
    .map<TimelineEvent>((vessel) => {
      const dateString = vessel.eta ?? vessel.etd ?? null;
      const parsedDate = dateString ? new Date(dateString) : null;
      return {
        key: `vessel-${vessel.vesselId}`,
        title: vessel.vesselName,
        subtitle: vessel.port ? `Port: ${vessel.port}` : undefined,
        date: parsedDate,
        icon: <Ship className="h-4 w-4 text-indigo-500" />,
      };
    });

  const sortedEvents = [...events, ...vesselEvents].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });

  return sortedEvents;
}

function isLateVessel(vessel: ContractJourneyReport["vessels"][number]): boolean {
  if (!vessel.eta) return false;
  const etaDate = new Date(vessel.eta);
  if (Number.isNaN(etaDate.getTime())) return false;
  const today = new Date();
  return etaDate < today && !vessel.etd;
}

export default function ContractJourneyReportPage() {
  const { id } = useParams();
  const { isAuthenticated, isLoading } = useAuth();
  useUnauthorizedRedirect({ isAuthenticated, isLoading });

  const [selectedVessel, setSelectedVessel] = useState<ContractJourneyReport["vessels"][number] | null>(null);

  const { data, isLoading: isReportLoading, error } = useQuery<ContractJourneyReport | null>({
    queryKey: [`/api/reports/contract-journey/${id}`],
    enabled: isAuthenticated && !!id,
  });

  const report = data ?? undefined;
  const timeline = useMemo(() => buildTimeline(report), [report]);

  const hasLc = Boolean(report?.letterOfCredit);
  const hasVessels = Boolean(report && report.vessels.length > 0);
  const currency = report?.contract.currency ?? report?.letterOfCredit?.currency ?? null;
  const summaryAmount = report?.contract.amount ?? report?.letterOfCredit?.allocatedAmount ?? null;

  const errorMessage = (() => {
    if (!error) return null;
    const message = String((error as Error).message ?? "");
    if (message.startsWith("403")) {
      return "You do not have permission to view contract reports.";
    }
    if (message.startsWith("404")) {
      return "Contract not found.";
    }
    return "Unable to load the contract journey report.";
  })();

  return (
    <MainLayout title="Contract Journey" subtitle={report ? report.contract.contractNo : "Loading"}>
      <div className="p-6 space-y-6">
        {isReportLoading && (
          <Card>
            <CardContent className="py-10 text-center text-gray-500">Loading contract journey...</CardContent>
          </Card>
        )}

        {errorMessage && !isReportLoading && (
          <Card>
            <CardContent className="py-10 text-center text-red-500">{errorMessage}</CardContent>
          </Card>
        )}

        {report && !errorMessage && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Summary</span>
                  <StatusBadge status={report.contract.status} type="contract" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Contract &amp; Supplier</div>
                    <div className="text-lg font-semibold text-gray-900">{report.contract.contractNo}</div>
                    <div className="text-gray-700">{report.contract.supplierName ?? "—"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Contract Amount</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatMaybeNumber(summaryAmount, currency)}
                    </div>
                    <div className="text-sm text-gray-500">Currency: {currency ?? "—"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Created</div>
                    <div className="text-lg font-semibold text-gray-900">{formatMaybeDate(report.contract.createdAt)}</div>
                    <div className="text-sm text-gray-500">Status: {report.contract.status}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Durations</div>
                    <div className="text-sm text-gray-700">
                      Contract → LC: {report.durations.daysContractToLc ?? "—"} days
                    </div>
                    <div className="text-sm text-gray-700">
                      LC → First vessel: {report.durations.daysLcToFirstVessel ?? "—"} days
                    </div>
                    <div className="text-sm text-gray-700">
                      Contract → Last vessel: {report.durations.daysContractToLastVessel ?? "—"} days
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Letter of Credit</CardTitle>
              </CardHeader>
              <CardContent>
                {hasLc && report.letterOfCredit ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-sm text-gray-500">LC Number</div>
                      <div className="text-lg font-semibold text-gray-900">{report.letterOfCredit.lcNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Issuing Bank</div>
                      <div className="text-gray-900">{report.letterOfCredit.bankName ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Opened</div>
                      <div className="text-gray-900">{formatMaybeDate(report.letterOfCredit.openedAt)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Allocation / Balance</div>
                      <div className="text-gray-900">
                        {formatMaybeNumber(report.letterOfCredit.allocatedAmount, currency)}
                        <span className="text-gray-500"> / </span>
                        {formatMaybeNumber(report.letterOfCredit.balance, currency)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-gray-300 p-6 text-left">
                    <Badge variant="outline" className="border-amber-300 text-amber-600">Not allocated</Badge>
                    <p className="text-sm text-gray-600">
                      Not allocated yet. Allocate from the Contract page.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {report.milestones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Flag className="h-5 w-5 text-amber-500" />
                    <span>Milestones</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Owner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.milestones.map((milestone, index) => (
                          <TableRow key={`${milestone.name}-${index}`}>
                            <TableCell className="font-medium text-gray-900">{milestone.name}</TableCell>
                            <TableCell>{formatMaybeDate(milestone.at)}</TableCell>
                            <TableCell>{milestone.by ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>Journey timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="py-6 text-center text-gray-500">No journey events yet.</div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
                    <ul className="space-y-6">
                      {timeline.map((event) => (
                        <li key={event.key} className="relative">
                          <div className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-blue-200">
                            {event.icon}
                          </div>
                          <div className="ml-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">{event.title}</span>
                              <span className="text-sm text-gray-500">
                                {event.date ? dateFormatter.format(event.date) : "Date TBD"}
                              </span>
                            </div>
                            {event.subtitle && <div className="text-sm text-gray-600">{event.subtitle}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Ship className="h-5 w-5 text-indigo-500" />
                  <span>Vessels</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hasVessels ? (
                  <div className="py-6 text-center text-gray-500">No vessels yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Port</TableHead>
                          <TableHead>ETA</TableHead>
                          <TableHead>ETD</TableHead>
                          <TableHead className="text-center">Shipments</TableHead>
                          <TableHead className="text-center">Docs submitted / required</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.vessels.map((vessel) => {
                          const late = isLateVessel(vessel);
                          return (
                            <TableRow
                              key={vessel.vesselId}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setSelectedVessel(vessel)}
                            >
                              <TableCell className="font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {vessel.vesselName}
                                  {late && (
                                    <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                      <AlertTriangle className="h-3 w-3" /> Late
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{vessel.port ?? "—"}</TableCell>
                              <TableCell>{formatMaybeDate(vessel.eta)}</TableCell>
                              <TableCell>{formatMaybeDate(vessel.etd)}</TableCell>
                              <TableCell className="text-center">{vessel.shipmentCount}</TableCell>
                              <TableCell className="text-center">
                                {vessel.submittedDocsCount}/{vessel.requiredDocsCount}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(selectedVessel)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVessel(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5 text-indigo-500" />
              {selectedVessel?.vesselName ?? "Vessel details"}
            </DialogTitle>
          </DialogHeader>
          {selectedVessel && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-500">Port</div>
                  <div className="text-gray-900">{selectedVessel.port ?? "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ETA</div>
                  <div className="text-gray-900">{formatMaybeDate(selectedVessel.eta)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ETD</div>
                  <div className="text-gray-900">{formatMaybeDate(selectedVessel.etd)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Shipments</div>
                  <div className="text-gray-900">{selectedVessel.shipmentCount}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Documents</div>
                <div className="text-gray-900">
                  {selectedVessel.submittedDocsCount} submitted / {selectedVessel.requiredDocsCount} required
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
