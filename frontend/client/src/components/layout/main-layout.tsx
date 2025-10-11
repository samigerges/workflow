import { ReactNode } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-90">
        <div className="absolute inset-x-0 top-[-20%] h-[480px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_rgba(2,6,23,0))]" />
        <div className="absolute inset-y-0 left-[-30%] w-[720px] bg-[radial-gradient(circle,_rgba(129,140,248,0.22),_rgba(2,6,23,0))]" />
        <div className="absolute inset-y-0 right-[-25%] w-[640px] bg-[radial-gradient(circle,_rgba(14,165,233,0.2),_rgba(2,6,23,0))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(30,64,175,0.18),_rgba(13,148,136,0.12)_45%,_transparent)]" />
      </div>

      <Sidebar />

      {/* Main content wrapper with proper responsive margins */}
      <div
        className={`relative z-10 transition-all duration-300 ease-in-out ${
          isCollapsed
            ? 'ml-0 md:ml-16'
            : 'ml-0 md:ml-64'
        }`}
      >
        <main className="min-h-screen flex flex-col backdrop-blur-0">
          <Topbar title={title} subtitle={subtitle} />

          <div className="flex-1 p-4 sm:p-6 space-y-8 overflow-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}