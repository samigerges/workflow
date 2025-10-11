import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LanguageSwitcher from "@/components/ui/language-switcher";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Bell } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="bg-white/90 backdrop-blur-xl shadow-soft border-b border-secondary-200/50 px-4 sm:px-6 py-6 dark:bg-slate-900/70 dark:border-slate-800/70 dark:shadow-[0_20px_60px_-24px_rgba(37,99,235,0.45)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary-900 to-secondary-700 bg-clip-text text-transparent dark:from-sky-400 dark:to-indigo-400">{title}</h1>
            {subtitle && (
              <p className="text-secondary-600 text-sm sm:text-base mt-1 font-medium dark:text-slate-300">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <LanguageSwitcher />

          <Button variant="ghost" size="sm" className="relative p-3 hover:bg-white/80 rounded-xl transition-all duration-200 card-hover dark:hover:bg-slate-800/60">
            <Bell size={20} className="text-secondary-600 dark:text-slate-200" />
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
