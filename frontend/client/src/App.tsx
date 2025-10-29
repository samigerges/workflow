import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Requests from "@/pages/requests";
import Contracts from "@/pages/contracts";
import LettersCredit from "@/pages/letters-credit";
import Vessels from "@/pages/vessels";
import VesselTracking from "@/pages/vessel-tracking";
import LCDetail from "@/pages/lc-detail";
import ContractDetail from "@/pages/contract-detail";
import ContractJourneyReportPage from "@/pages/report-contract-journey";
import Reports from "@/pages/operations";
import { withProtectedRoute } from "@/components/ProtectedRoute";

const ProtectedDashboard = withProtectedRoute(Dashboard);
const ProtectedRequests = withProtectedRoute(Requests);
const ProtectedContracts = withProtectedRoute(Contracts);
const ProtectedLettersCredit = withProtectedRoute(LettersCredit);
const ProtectedVessels = withProtectedRoute(Vessels);
const ProtectedVesselTracking = withProtectedRoute(VesselTracking);
const ProtectedLCDetail = withProtectedRoute(LCDetail);
const ProtectedContractDetail = withProtectedRoute(ContractDetail);
const ProtectedReports = withProtectedRoute(Reports);
const ProtectedContractJourneyReport = withProtectedRoute(ContractJourneyReportPage);

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={ProtectedDashboard} />
      <Route path="/requests" component={ProtectedRequests} />
      <Route path="/contracts" component={ProtectedContracts} />
      <Route path="/letters-credit" component={ProtectedLettersCredit} />
      <Route path="/vessels" component={ProtectedVessels} />
      <Route path="/vessel-tracking" component={ProtectedVesselTracking} />
      <Route path="/lc/:id" component={ProtectedLCDetail} />
      <Route path="/contract/:id" component={ProtectedContractDetail} />
      <Route path="/reports" component={ProtectedReports} />
      <Route path="/reports/contracts/:id" component={ProtectedContractJourneyReport} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Router />
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
