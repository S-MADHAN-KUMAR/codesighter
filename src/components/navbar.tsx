"use client";
import { cn } from "@/lib/utils";
import { Globe, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/components/theme-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isLoading?: boolean;
  progress?: number;
  statusText?: string;
  repoName?: string;
}

export function Navbar({ activeTab, setActiveTab, isLoading, progress, statusText, repoName }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const handleCsw = (t: string, e: React.MouseEvent<HTMLElement>) => {
    setActiveTab?.(t);
    // @ts-ignore
    window.csw?.(t, e.currentTarget as HTMLElement);
  };

  const handleLsw = (t: string) => {
    // @ts-ignore
    window.lsw?.(t);
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/95 backdrop-blur flex items-center justify-between px-8 z-10 shrink-0">
      <Link href="/" className="flex items-center gap-2 mr-4 cursor-pointer">
        <img className="w-10 h-10 object-contain" src="/ai.png" alt="Logo" />
        <span className="font-bold text-[15px] tracking-wide text-foreground uppercase">CodeSighter</span>
        {repoName && (
          <span className="ml-2 text-xs text-muted-foreground border-l pl-2 border-border/50 truncate max-w-[200px] hidden md:inline">
            github.com/{repoName}
          </span>
        )}
      </Link>
      
      <nav className="flex items-center gap-4">
        {pathname === "/analyze" ? (
          <>
            <button onClick={(e) => handleCsw("overview", e)} className={cn("px-3 py-1.5 text-xs rounded-full transition-all", activeTab === "overview" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Overview
            </button>
            <button onClick={(e) => handleCsw("ai", e)} className={cn("px-3 py-1.5 text-xs rounded-full transition-all", activeTab === "ai" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              AI Insights
            </button>
            <button onClick={(e) => handleCsw("functions", e)} className={cn("px-3 py-1.5 text-xs rounded-full transition-all ", activeTab === "functions" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Functions
            </button>
            <button onClick={(e) => handleCsw("duplicates", e)} className={cn("px-3 py-1.5 text-xs rounded-full transition-all", activeTab === "duplicates" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Duplicates
            </button>
            <button onClick={(e) => { handleCsw("files", e); handleLsw("tree"); }} className={cn("px-3 py-1.5 text-xs rounded-full transition-all", activeTab === "files" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Files
            </button>
            <button onClick={(e) => { handleCsw("issues", e); handleLsw("issues"); }} className={cn("px-3 py-1.5 text-xs rounded-full transition-all", activeTab === "issues" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Issues
            </button>
            <Link href="/chat" className={cn("px-3 py-1.5 text-xs rounded-full transition-all text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Chat
            </Link>
          </>
        ) : (
          <>
            <Link href="/analyze?load=true" className={cn("px-3 py-1.5 text-xs rounded-full transition-all text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground font-medium")}>
              Dashboard
            </Link>
            <Link href="/chat" className={cn("px-3 py-1.5 text-xs rounded-full transition-all text-primary bg-primary/10 font-bold")}>
              Assistant
            </Link>
          </>
        )}
      </nav>

      <div className="flex items-center gap-6">
        <Toggle pressed={theme === "dark"} onPressedChange={toggleTheme} aria-label="Toggle theme" size="sm" className="h-8 w-8 rounded-full data-[state=on]:bg-primary/10">
          {theme === "dark" ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4" />}
        </Toggle>
      </div>

      {/* Hidden UI for logic.js compatibility if needed */}
      <div style={{ display: 'none' }}>
        <div id="ltree-body"></div>
        <div id="lissues-body"></div>
      </div>
    </header>
  );
}
