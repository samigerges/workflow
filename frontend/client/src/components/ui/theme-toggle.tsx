import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative p-3 rounded-xl transition-all duration-200 card-hover hover:bg-white/80 dark:hover:bg-slate-800/60"
    >
      <Sun
        size={18}
        className={`transition-all duration-300 ${
          isDark ? "scale-75 opacity-0 -rotate-90" : "scale-100 opacity-100 rotate-0"
        } text-secondary-600 dark:text-slate-100`}
      />
      <Moon
        size={18}
        className={`absolute transition-all duration-300 ${
          isDark ? "scale-100 opacity-100 rotate-0" : "scale-75 opacity-0 rotate-90"
        } text-slate-100`}
      />
    </Button>
  );
}

