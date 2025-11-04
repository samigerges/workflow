import { useEffect, type ComponentType, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import AnalyticsPreview from "@/pages/analytics-preview";
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
import NeedsPage from "@/pages/needs";

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);

  return null;
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const isActive = location === href;

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        setLocation(href);
      }}
      className={cn(
        "text-sm font-medium transition",
        isActive
          ? "text-white"
          : "text-secondary-100 hover:text-white focus-visible:text-white",
      )}
    >
      {children}
    </a>
  );
}

function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <nav className="bg-secondary-900 text-secondary-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-secondary-300">
            ImportFlow
          </span>
          <div className="flex items-center gap-3">
            <NavLink href="/landing">Landing</NavLink>
            <NavLink href="/analytics">Analytics Preview</NavLink>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <NavLink href="/">Workspace Dashboard</NavLink>
          ) : (
            <NavLink href="/login">Sign In</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

const PRIVATE_ROUTES: Array<{
  path: string;
  component: ComponentType;
}> = [
  { path: "/requests", component: Requests },
  { path: "/contracts", component: Contracts },
  { path: "/letters-credit", component: LettersCredit },
  { path: "/vessels", component: Vessels },
  { path: "/vessel-tracking", component: VesselTracking },
  { path: "/needs", component: NeedsPage },
  { path: "/lc/:id", component: LCDetail },
  { path: "/contract/:id", component: ContractDetail },
  { path: "/reports", component: Reports },
  { path: "/reports/contracts/:id", component: ContractJourneyReportPage },
];

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
    <>
      <Navigation isAuthenticated={isAuthenticated} />
      <Switch>
        <Route path="/landing" component={Landing} />
        <Route path="/analytics" component={AnalyticsPreview} />
        <Route path="/login">
          {isAuthenticated ? <Redirect to="/" /> : <Login />}
        </Route>
        <Route path="/">
          {isAuthenticated ? <Dashboard /> : <Redirect to="/landing" />}
        </Route>
        {PRIVATE_ROUTES.map(({ path, component: Component }) => (
          <Route key={path} path={path}>
            {isAuthenticated ? <Component /> : <Redirect to="/login" />}
          </Route>
        ))}
        <Route component={NotFound} />
      </Switch>
    </>
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
export { Router };
