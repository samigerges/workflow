import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Bell, Globe, Menu } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { user } = useAuth();
  const { setIsCollapsed } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <header className="bg-white/90 backdrop-blur-xl shadow-soft border-b border-secondary-200/50 px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary-900 to-secondary-700 bg-clip-text text-transparent">{title}</h1>
            {subtitle && (
              <p className="text-secondary-600 text-sm sm:text-base mt-1 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Select defaultValue="en">
            <SelectTrigger className="w-24 border-secondary-200 rounded-xl bg-white/80 backdrop-blur-sm shadow-soft">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">
                <div className="flex items-center space-x-2">
                  <Globe size={16} />
                  <span>EN</span>
                </div>
              </SelectItem>
              <SelectItem value="ar">
                <div className="flex items-center space-x-2">
                  <Globe size={16} />
                  <span>AR</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="sm" className="relative p-3 hover:bg-white/80 rounded-xl transition-all duration-200 card-hover">
            <Bell size={20} className="text-secondary-600" />
            <Badge 
              className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center shadow-medium animate-pulse"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
