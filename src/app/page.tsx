"use client";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Search, Lock, Loader2, RefreshCw, Globe, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

declare global {
  interface Window {
    goHome?: () => void;
    run?: () => void;
    lsw?: (t: string) => void;
    csw?: (t: string, el: HTMLElement) => void;
    qs?: (el: HTMLElement) => void;
    sendChat?: () => void;
    loadLastAnalysis?: () => void;
  }
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState<'cloning' | 'analyzing' | 'extracting' | 'complete'>('cloning');
  const { theme, toggleTheme } = useTheme();

  const phases = {
    cloning: { label: 'Cloning Repository', icon: '📦' },
    analyzing: { label: 'Analyzing Code Structure', icon: '🔍' },
    extracting: { label: 'Extracting Functions & Metrics', icon: '⚙️' },
    complete: { label: 'Processing Results', icon: '✨' }
  };

  const handleRun = () => {
    const url = (document.getElementById("rurl") as HTMLInputElement)?.value;
    const token = (document.getElementById("gtoken") as HTMLInputElement)?.value;

    if (!url) return;

    setIsLoading(true);
    setProgress(0);
    setScanPhase('cloning');

    // Simulate progress with phases
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        const increment = Math.random() * 8 + 2;
        const newProgress = prev + increment;

        // Update phase based on progress
        if (newProgress >= 75) {
          setScanPhase('extracting');
        } else if (newProgress >= 40) {
          setScanPhase('analyzing');
        }

        return Math.min(newProgress, 95);
      });
    }, 300);

    if (token) localStorage.setItem('codesighter_token', token);
    router.push(`/analyze?url=${encodeURIComponent(url)}`);
  };

  const handleLoadLast = () => {
    router.push('/analyze?load=true');
  };

  const exampleRepos = [
    "facebook/react",
    "twbs/bootstrap",
    "microsoft/vscode"
  ];

  return (
    <>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="flex flex-col lg:flex-row items-center gap-8 max-w-5xl w-full">
            {/* Left Side - Progress Circle */}
            <div className="flex flex-col items-center gap-6 min-w-[280px]">
              <div className="relative w-40 h-40">
                <img src="/ai.png" className="w-12 h-12" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-foreground">{Math.round(progress)}%</span>
                  <span className="text-xs text-muted-foreground mt-1">Complete</span>
                </div>
              </div>

              {/* Current Phase */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-lg">{phases[scanPhase].icon}</span>
                  <p className="text-foreground font-medium">{phases[scanPhase].label}</p>
                </div>
                <p className="text-xs text-muted-foreground">Please wait while we analyze the codebase</p>
              </div>
            </div>

            {/* Right Side - Stats Grid */}
            <div className="flex-1 w-full">
              <Card className="w-full">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>📊</span> Analysis Progress
                  </h3>

                  {/* Progress Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{Math.round(progress * 0.22)}</p>
                      <p className="text-xs text-muted-foreground">Files Found</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{Math.round(progress * 0.08)}</p>
                      <p className="text-xs text-muted-foreground">Folders</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{Math.round(progress * 76)}</p>
                      <p className="text-xs text-muted-foreground">Lines Scanned</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{Math.round(progress * 0.35)}</p>
                      <p className="text-xs text-muted-foreground">Functions</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Phase Indicators */}
                  <div className="mt-6 flex items-center justify-between text-xs">
                    {Object.entries(phases).map(([key, phase], index) => {
                      const phaseProgress = (index + 1) * 25;
                      const isActive = progress >= phaseProgress - 25 && progress < phaseProgress + 25;
                      const isComplete = progress > phaseProgress;
                      return (
                        <div
                          key={key}
                          className={`flex flex-col items-center gap-1 ${isComplete ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isComplete ? 'bg-primary text-primary-foreground' :
                              isActive ? 'bg-primary/20 text-primary' : 'bg-muted'
                            }`}>
                            {isComplete ? '✓' : index + 1}
                          </div>
                          <span className="text-center hidden md:block">{phase.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full min-h-screen bg-background flex flex-col justify-center items-center overflow-hidden">
        {/* Simple Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <Toggle
            pressed={theme === "dark"}
            onPressedChange={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Toggle>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center px-4 w-full max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground bg-green-800/30 border border-green-800/30 text-white uppercase w-fit rounded-full py-1 mx-auto my-4 px-4 tracking-[0.15em]">
              AI-Powered Repository Analyzer
            </p>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-3">
              Code<span className="text-primary">Sighter</span>
            </h1>

          </div>

          {/* Tagline */}

          <p className="mb-6  text-muted-foreground leading-relaxed text-center">
            See every line. Understand everything. <br />
            <span className="text-foreground/70">Map functions, find duplicates, and chat with your codebase.</span>
          </p>

          {/* Input Section */}

          {/* Repo URL Input */}
          <div className="relative w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="rurl"
              placeholder="Enter GitHub Repository URL"
              type="text"
              className="pl-10 h-12"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Token Input */}
          <div className="relative w-md mt-2">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="gtoken"
              placeholder="Personal Access Token (optional)"
              type="password"
              className="pl-10 h-12"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Buttons */}
          <div className="w-md mt-6">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleRun}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>

            {/* Last Analysis Button - Hidden by default, shown via JS */}
            <div id="last-analysis-btn" style={{ display: 'none' }} className="text-center">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadLast}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Load Previous Scan
              </Button>
              <div id="last-analysis-info" className="text-xs text-muted-foreground mt-2 tracking-wide"></div>
            </div>
          </div>


          {/* Examples Section */}
          <div className="w-full max-w-lg mt-8">
            <p className="text-xs font-medium text-muted-foreground text-center uppercase tracking-widest mb-4">
              Try these repositories
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleRepos.map((repo) => (
                <Button
                  key={repo}
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => {
                    const input = document.getElementById('rurl') as HTMLInputElement;
                    if (input) input.value = `https://github.com/${repo}`;
                  }}
                >
                  <img src="/ai.png" className="mr-1.5 h-3.5 w-3.5 object-contain" />
                  {repo}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Hidden Skeletons for logic.js compatibility */}
        <div id="analyzer" style={{ display: 'none' }}>
          <div id="rbar-url"></div><div id="rstatus"></div>
          <div id="ltab-tree"></div><div id="ltab-issues"></div>
          <div id="ltree-body"></div><div id="lissues-body"></div>
          <div id="cbody"></div><div id="chat-msgs"></div>
          <div id="cinput"></div><div id="sbtn"></div>
        </div>
        <div id="loading" style={{ display: 'none' }}>
          <div id="lbar"></div><div id="lstatus"></div><div id="lfiles"></div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center z-20">
          <p className="text-xs text-muted-foreground tracking-widest uppercasem italic">
            Powered by AI • GitHub API
          </p>
        </div>

        <Script src="/logic.js" strategy="afterInteractive" />
      </div>
    </>
  );
}
