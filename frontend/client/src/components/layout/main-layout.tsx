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
    <div className="min-h-screen gradient-secondary">
      <Sidebar />
      
      {/* Main content wrapper with proper responsive margins */}
      <div className={`transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'ml-0 md:ml-16' // No margin on mobile when collapsed, normal margin on desktop
          : 'ml-0 md:ml-64'  // No margin on mobile when expanded (overlay), normal margin on desktop
      }`}>
        <main className="min-h-screen flex flex-col">
          <Topbar title={title} subtitle={subtitle} />
          
          <div className="flex-1 p-4 sm:p-6 space-y-8 overflow-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}