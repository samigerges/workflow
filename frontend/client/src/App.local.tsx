import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Needs from "@/pages/needs";
import Requests from "@/pages/requests";
import Contracts from "@/pages/contracts";
import LettersCredit from "@/pages/letters-credit";
import Vessels from "@/pages/vessels";
import Documents from "@/pages/documents";
import Reports from "@/pages/operations"; // Renamed operations to reports

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="*" component={Login} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/needs" component={Needs} />
          <Route path="/requests" component={Requests} />
          <Route path="/contracts" component={Contracts} />
          <Route path="/letters-credit" component={LettersCredit} />
          <Route path="/vessels" component={Vessels} />
          <Route path="/documents" component={Documents} />
          <Route path="/reports" component={Reports} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Router />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;