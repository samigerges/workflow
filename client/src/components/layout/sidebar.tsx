import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Ship,
  BarChart3,
  FileText,
  File,
  University,
  Package,
  LogOut,
  FolderOpen,
  Home,
  CreditCard,
  Settings,
  Menu,
  ChevronLeft,
  Target,
  MapPin
} from "lucide-react";
import logoPath from "@assets/Picture1_1751117114784.jpg";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    roles: ["admin", "procurement_officer", "finance_officer", "shipping_officer"]
  },
  {
    name: "Needs",
    href: "/needs",
    icon: Target,
    roles: ["admin", "procurement_officer", "finance_officer", "shipping_officer"]
  },
  {
    name: "Contract Requests",
    href: "/requests",
    icon: FileText,
    roles: ["admin", "procurement_officer", "finance_officer", "shipping_officer"]
  },
  {
    name: "Contracts",
    href: "/contracts",
    icon: File,
    roles: ["admin", "procurement_officer"]
  },
  {
    name: "Letters of Credit",
    href: "/letters-credit",
    icon: CreditCard,
    roles: ["admin", "finance_officer"]
  },
  {
    name: "Vessels",
    href: "/vessels",
    icon: Ship,
    roles: ["admin", "shipping_officer"]
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FolderOpen,
    roles: ["admin", "procurement_officer", "finance_officer", "shipping_officer"]
  },
  {
    name: "Vessel Tracking",
    href: "/vessel-tracking",
    icon: MapPin,
    roles: ["admin", "shipping_officer"]
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "procurement_officer", "finance_officer", "shipping_officer"]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  const filteredNavigation = navigation.filter(item => 
    // Show all navigation items for testing purposes
    true
  );

  const handleSignOut = async () => {
      try {
        const response = await apiRequest("POST", "/api/logout");
      
      if (response.ok) {
        // Clear the authentication query cache
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Force a page reload to ensure clean state
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: force reload anyway
      window.location.reload();
    }
  };

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile overlay when expanded
  const showOverlay = isMobile && !isCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {showOverlay && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      <aside className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-white/95 backdrop-blur-xl shadow-strong border-r border-secondary-100/50 fixed h-full z-30 flex flex-col transition-all duration-300 ease-in-out ${
        isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'
      } md:translate-x-0`}>
      {/* Header with toggle button */}
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-b border-secondary-200/50 flex items-center justify-between bg-white/50`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-medium">
            <img 
              src={logoPath} 
              alt="ImportFlow Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-secondary-900 bg-gradient-to-r from-secondary-900 to-secondary-700 bg-clip-text text-transparent">ImportFlow</h1>
              <p className="text-sm text-secondary-600">Management System</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-3 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 rounded-xl group shadow-soft hover:shadow-medium"
        >
          {isCollapsed ? (
            <Menu size={18} className="transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <ChevronLeft size={18} className="transition-transform duration-200 group-hover:scale-110" />
          )}
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className={`${isCollapsed ? 'p-2' : 'p-4'} space-y-2 flex-1 overflow-y-auto`}>
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`group flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'} rounded-xl font-medium transition-all duration-200 card-hover ${
                isActive 
                  ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 font-bold shadow-soft border border-primary-200' 
                  : 'text-secondary-700 hover:bg-white/60 hover:shadow-soft'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon size={20} className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-primary-700' : 'text-secondary-600'
              }`} />
              {!isCollapsed && <span className={`truncate ${
                isActive ? 'text-primary-700 font-bold' : 'group-hover:text-secondary-900'
              }`}>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
      
      {/* User section */}
      <div className={`mt-auto ${isCollapsed ? 'p-2' : 'p-4'} border-t border-secondary-200/50 bg-white/30 backdrop-blur-sm`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center mb-2' : 'space-x-3 mb-4'}`}>
          <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-primary-100 ring-offset-2">
            <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold">
              {(user as any)?.firstName?.charAt(0)}{(user as any)?.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-secondary-900 truncate">
                {(user as any)?.firstName} {(user as any)?.lastName}
              </p>
              <p className="text-xs text-secondary-600 capitalize truncate bg-secondary-100/50 px-2 py-1 rounded-full">
                {(user as any)?.role?.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
        <Button 
          onClick={handleSignOut}
          variant="ghost"
          className={`${isCollapsed ? 'w-8 h-8 p-0 opacity-60 hover:opacity-100' : 'w-full'} flex items-center justify-center ${isCollapsed ? '' : 'space-x-2'} text-secondary-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 rounded-xl`}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut size={isCollapsed ? 14 : 16} />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
    </>
  );
}
