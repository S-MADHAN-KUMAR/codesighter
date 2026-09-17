"use client";
import Script from "next/script";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatBubble, ChatBubbleAvatar, ChatMessageList } from "@/components/ui/chat-bubble";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import {
  Home,
  Globe,
  FolderTree,
  AlertCircle,
  LayoutDashboard,
  Code2,
  Copy,
  Bot,
  Send,
  Loader2,
  FileText,
  Folder,
  Sun,
  Moon,
  ChevronRight,
  File,
  GitBranch,
  AlertTriangle,
  Trash2,
  MessageSquare,
  User
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoUrl = searchParams.get('url');
  const loadParam = searchParams.get('load');
  const [isGuarded, setIsGuarded] = useState(false);
  const [isRefetchBlocked, setIsRefetchBlocked] = useState(false);
  const [blockedExistingRepo, setBlockedExistingRepo] = useState<string>("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  // Initialize from localStorage synchronously so dashboard shows instantly on reload
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const url = new URLSearchParams(window.location.search).get('url');
      return !!url; // if url present, start in loading state
    }
    return false;
  });
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing…");
  const [activeTab, setActiveTab] = useState("overview");
  const [treeHtml, setTreeHtml] = useState("");
  const [issuesHtml, setIssuesHtml] = useState("");
  const [treeVersion, setTreeVersion] = useState(0);
  
  const [stats, setStats] = useState<any>(null);
  const [functions, setFunctions] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<string>("");
  const [full, setFull] = useState<string>("");
  
  const { theme, toggleTheme } = useTheme();

  const handleGoHome = () => {
    window.location.href = '/';
  };
  const handleLsw = (t: string) => window.lsw?.(t);
  const handleCsw = (t: string, e: React.MouseEvent<HTMLElement>) =>
    window.csw?.(t, e.currentTarget as HTMLElement);
  const handleQs = (e: React.MouseEvent<HTMLElement>) =>
    window.qs?.(e.currentTarget as HTMLElement);
  const handleSendChat = () => window.sendChat?.();

  // STRICT GUARD: if NO data in localStorage, do not allow dashboard/other pages
  useEffect(() => {
    try {
      const raw = localStorage.getItem('codesighter_last');
      const hasData = !!raw;
      const isFreshFetch = !!repoUrl;
      const isLoad = loadParam === 'true';
      if (!hasData && !isFreshFetch && !isLoad) {
        setIsGuarded(true);
        setStatusText("No analysis found — redirecting to home…");
        const t = setTimeout(() => router.replace('/'), 900);
        return () => clearTimeout(t);
      }
      // If data exists, do NOT allow fetching again via ?url= — force clear first
      if (hasData && isFreshFetch) {
        try { 
          const d = JSON.parse(raw!); 
          setBlockedExistingRepo(d.full || "");
          // hydrate so View Existing shows correct dashboard behind overlay
          if (d.stats) setStats(d.stats);
          if (d.functions) setFunctions(d.functions);
          if (d.duplicates) setDuplicates(d.duplicates);
          if (d.aiResult) setAiResult(d.aiResult);
          if (d.full) setFull(d.full);
        } catch {}
        setIsRefetchBlocked(true);
        setIsLoading(false);
      }
    } catch {}
  }, [repoUrl, loadParam, router]);

  const handleClearAndHome = () => {
    localStorage.removeItem('codesighter_last');
    router.replace('/');
  };
  const handleClearAndRefetch = () => {
    localStorage.removeItem('codesighter_last');
    setIsRefetchBlocked(false);
    setIsGuarded(false);
    if (repoUrl) {
      setIsLoading(true);
      setProgress(1);
      setStatusText("Starting analysis…");
      const ri = document.getElementById('rurl') as HTMLInputElement;
      if (ri) ri.value = repoUrl;
      window.run?.();
    } else {
      router.replace('/');
    }
  };
  const handleViewExisting = () => {
    setIsRefetchBlocked(false);
    router.replace('/analyze?load=true');
  };

  // Hydrate from localStorage immediately (fixes dashboard empty after reload)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('codesighter_last');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.stats) setStats(d.stats);
        if (d.functions) setFunctions(d.functions);
        if (d.duplicates) setDuplicates(d.duplicates);
        if (d.aiResult) setAiResult(d.aiResult);
        if (d.full) setFull(d.full);
        // if we have saved data and no repoUrl param, ensure loading is false
        if (!repoUrl) setIsLoading(false);
      }
    } catch {}
  }, [repoUrl]);

  // Event-driven updates: listen to logic.js custom events
  useEffect(() => {
    const handleStarted = () => {
      setIsLoading(true);
      setProgress(0);
      setStatusText("Initializing…");
    };
    const handleProgress = (e: any) => {
      const { progress: p, status } = e.detail || {};
      if (typeof p === 'number') setProgress(Math.round(p));
      if (status) setStatusText(status);
      // keep loading true unless 100% and we received complete
      if (typeof p === 'number' && p < 100) setIsLoading(true);
    };
    const handlePartial = (e: any) => {
      const d = e.detail || {};
      if (d.stats) setStats(d.stats);
      if (d.functions) setFunctions(d.functions);
      if (d.duplicates) setDuplicates(d.duplicates);
      if (d.aiResult !== undefined) setAiResult(d.aiResult);
      if (d.full) setFull(d.full);
      // pull tree/issues DOM into React state so tabs render
      setTimeout(() => {
        const t = document.getElementById('ltree-body')?.innerHTML || "";
        const iss = document.getElementById('lissues-body')?.innerHTML || "";
        if (t) setTreeHtml(t);
        if (iss) setIssuesHtml(iss);
      }, 50);
      setTreeVersion(v => v+1);
    };
    const handleComplete = (e: any) => {
      const { stats, functions, duplicates, aiResult, full } = e.detail;
      if (stats) setStats(stats);
      if (functions) setFunctions(functions);
      if (duplicates) setDuplicates(duplicates);
      if (aiResult !== undefined) setAiResult(aiResult);
      if (full) setFull(full);
      setProgress(100);
      setStatusText("Analysis complete");
      setIsLoading(false);
      setTimeout(() => {
        const t = document.getElementById('ltree-body')?.innerHTML || "";
        const iss = document.getElementById('lissues-body')?.innerHTML || "";
        if (t) setTreeHtml(t);
        if (iss) setIssuesHtml(iss);
      }, 50);
      setTreeVersion(v => v+1);
    };
    const handleError = () => {
      setIsLoading(false);
      setStatusText("Error");
    };

    window.addEventListener('analysis-started', handleStarted as any);
    window.addEventListener('analysis-progress', handleProgress as any);
    window.addEventListener('analysis-partial', handlePartial as any);
    window.addEventListener('analysis-complete', handleComplete as any);
    window.addEventListener('analysis-error', handleError as any);
    return () => {
      window.removeEventListener('analysis-started', handleStarted as any);
      window.removeEventListener('analysis-progress', handleProgress as any);
      window.removeEventListener('analysis-partial', handlePartial as any);
      window.removeEventListener('analysis-complete', handleComplete as any);
      window.removeEventListener('analysis-error', handleError as any);
    };
  }, []);

  useEffect(() => {
    const trigger = () => {
      if (repoUrl && window.run) {
        const ri = document.getElementById('rurl') as HTMLInputElement;
        if (ri) ri.value = repoUrl;

        const ti = document.getElementById('gtoken') as HTMLInputElement;
        const savedToken = localStorage.getItem('codesighter_token');
        if (ti && savedToken) ti.value = savedToken;

        setIsLoading(true);
        setProgress(1);
        setStatusText("Starting analysis…");
        window.run();
      } else if (window.loadLastAnalysis) {
        const hasSaved = localStorage.getItem('codesighter_last');
        if (loadParam === 'true' || (!repoUrl && hasSaved)) {
          // Ensure UI reflects loaded state (no spinner flash)
          window.loadLastAnalysis();
          // If loadLastAnalysis succeeded, it will fire analysis-complete; otherwise keep hidden
          const raw = localStorage.getItem('codesighter_last');
          if (raw) {
            try {
              const d = JSON.parse(raw);
              setStats(d.stats); setFunctions(d.functions); setDuplicates(d.duplicates); setAiResult(d.aiResult); setFull(d.full);
              setIsLoading(false);
              setProgress(100);
              setStatusText("Loaded saved analysis");
              setTimeout(() => {
                const t = document.getElementById('ltree-body')?.innerHTML || "";
                const iss = document.getElementById('lissues-body')?.innerHTML || "";
                if (t) setTreeHtml(t);
                if (iss) setIssuesHtml(iss);
              }, 100);
            } catch {}
          }
        } else if (!repoUrl && !hasSaved) {
          setIsLoading(false);
        }
      }
    };

    const itv = setInterval(() => {
      if (window.run || window.loadLastAnalysis) {
        trigger();
        clearInterval(itv);
      }
    }, 100);

    // fallback: if script never loads within 3s, stop spinner
    const timeout = setTimeout(() => clearInterval(itv), 3000);

    return () => { clearInterval(itv); clearTimeout(timeout); };
  }, [repoUrl, loadParam]);

  // Keep DOM progress bar in sync for logic.js compatibility, and observe tree/issues changes
  useEffect(() => {
    const lbar = document.getElementById('lbar');
    if (lbar) lbar.style.width = progress + '%';
    const lstatus = document.getElementById('lstatus');
    if (lstatus && isLoading) lstatus.textContent = statusText;
  }, [progress, statusText, isLoading]);

  // Observe DOM mutations for tree/issues when logic.js updates them without events
  useEffect(() => {
    const tEl = document.getElementById('ltree-body');
    const iEl = document.getElementById('lissues-body');
    if (!tEl && !iEl) return;
    const obs = new MutationObserver(() => {
      const t = tEl?.innerHTML || "";
      const iss = iEl?.innerHTML || "";
      if (t && t !== treeHtml) setTreeHtml(t);
      if (iss && iss !== issuesHtml) setIssuesHtml(iss);
    });
    if (tEl) obs.observe(tEl, { childList: true, subtree: true, characterData: true });
    if (iEl) obs.observe(iEl, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [treeHtml, issuesHtml]);

  if (isGuarded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5"/> No analysis found</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Dashboard is blocked — no fetched data in local storage. Run an analysis from Home first.</p>
            <div className="flex gap-2">
              <Button onClick={() => router.replace('/')} className="flex-1">Go to Home</Button>
              <Button variant="outline" onClick={handleClearAndHome} className="flex-1">Clear & Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Simple Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      {/* REFETCH BLOCKED — data already exists, fetching stopped */}
      {isRefetchBlocked && (
        <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-6">
          <Card className="max-w-lg w-full border-amber-500/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5"/> Fetching blocked — data already exists</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Existing analysis for <span className="font-mono font-bold text-foreground break-all">{blockedExistingRepo || full || "previous repo"}</span> is stored. Fetching <span className="font-mono break-all">{repoUrl}</span> is stopped. Clear fetched block first.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleViewExisting} variant="outline"><LayoutDashboard className="mr-2 h-4 w-4"/> View Existing</Button>
                <Button onClick={handleClearAndRefetch} variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Clear & Fetch New</Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full" onClick={handleClearAndHome}>Clear & Go Home</Button>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Hidden inputs to populate from URL logic */}
      <div style={{ display: 'none' }}>
        <Input id="rurl" type="hidden" />
        <Input id="gtoken" type="hidden" />
        <Button id="abtn" style={{ display: 'none' }}></Button>
        <div id="rbar-url" style={{ display: 'none' }}></div>
        <div id="rstatus" style={{ display: 'none' }}></div>
        <div id="ltab-tree" style={{ display: 'none' }}></div>
        <div id="ltab-issues" style={{ display: 'none' }}></div>
        <div id="ltree-body" style={{ display: 'none' }}></div>
        <div id="lissues-body" style={{ display: 'none' }}></div>
        <div id="chat-msgs" style={{ display: 'none' }}></div>
        <textarea id="cinput" style={{ display: 'none' }}></textarea>
        <button id="sbtn" style={{ display: 'none' }}></button>
      </div>

      {/* LOADING OVERLAY - React-controlled, no display:none glitch */}
      {isLoading && (
        <div id="loading" className="flex flex-col items-center justify-center inset-0 absolute z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center p-12 max-w-md w-full bg-card border border-border/50 shadow-2xl rounded-3xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
            
            <div className="w-20 h-20 relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 border-[6px] border-primary/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-primary border-t-transparent rounded-full animate-spin"></div>
              <img src="/ai.png" alt="loading" className="h-10 w-10 animate-pulse object-contain" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Analyzing Repository</h2>
            <p className="text-sm text-muted-foreground font-medium text-center mb-8 h-5" id="lstatus">{statusText}</p>
            
            <div className="w-full bg-muted rounded-full h-2.5 mb-2 overflow-hidden border border-border/50 relative">
              <div id="lbar" className="bg-primary h-full rounded-full transition-all duration-300 relative shadow-[0_0_12px_rgba(var(--primary),0.6)]" style={{ width: `${progress}%` }}>
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
              <span>{progress}%</span>
              <span>Processing</span>
            </div>
          </div>
        </div>
      )}
      {/* hidden compat node for logic.js lfiles */}
      <div id="lfiles" style={{ display:'none' }}></div>

      {/* ANALYZER UI - always flex, overlay covers it while loading (no display:none flash) */}
      <div id="analyzer" className="flex flex-col h-screen bg-background overflow-hidden relative">
        
        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-muted/10">
          
          <Navbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isLoading={isLoading}
            progress={progress}
            statusText={statusText}
            repoName={full}
          />


          <div className="flex flex-1 overflow-hidden min-h-0">
            <main className="flex-1 overflow-y-auto min-h-0 bg-muted/10 custom-scrollbar">
              {activeTab === "overview" && (
                <div className="p-6 space-y-6 max-w-7xl mx-auto">
                  
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Files</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{stats?.files || 0}</span>
                          <span className="text-xs text-muted-foreground truncate">source files</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Folders</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{stats?.folders || 0}</span>
                          <span className="text-xs text-muted-foreground truncate">directories</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Lines</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{(stats?.lines / 1000 || 0).toFixed(1)}k</span>
                          <span className="text-xs text-muted-foreground truncate">{(stats?.lines || 0).toLocaleString()} lines</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Functions</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">{functions?.length || 0}</span>
                          <span className="text-xs text-muted-foreground truncate">extracted</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Duplicates</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-destructive">{duplicates?.length || 0}</span>
                          <span className="text-xs text-muted-foreground truncate">code blocks</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Avg Lines/File</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-yellow-500">{stats?.avgLines || 0}</span>
                          <span className="text-xs text-muted-foreground truncate">per file</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Language Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          📊 Language Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {stats?.langs?.slice(0, 7).map(([lang, count]: [string, number]) => {
                          const tot = stats?.langs.reduce((s: number, [, n]: [string, number]) => s + n, 0);
                          const pct = Math.round(count / tot * 100);
                          return (
                          <div key={lang} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-foreground">{lang}</span>
                              <span className="text-muted-foreground">{pct}% <span className="text-xs">({count} files)</span></span>
                            </div>
                            <Progress value={pct} indicatorColor={pct > 50 ? "bg-blue-500" : "bg-purple-500"} className="h-2" />
                          </div>
                          );
                        })}
                        {!stats?.langs && (
                            <div className="flex flex-col gap-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Most Functions per File */}
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          🏆 Most Functions per File
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto">
                        <div className="min-w-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead className="text-right">Functions</TableHead>
                                <TableHead className="text-right">Complexity</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                  const fnByFile = functions?.reduce((a: any, f: any) => { a[f.file] = (a[f.file] || 0) + 1; return a; }, {});
                                  const topFnFiles = Object.entries(fnByFile || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8);
                                  if (!topFnFiles.length) return (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">{isLoading ? "Analyzing…" : "No data yet"}</TableCell></TableRow>
                                  );
                                  return topFnFiles.map(([file, count]: [string, any]) => (
                                    <TableRow key={file}>
                                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]" title={file}>{file}</TableCell>
                                      <TableCell className="text-right font-medium">{count}</TableCell>
                                      <TableCell className="text-right">
                                        <Badge variant="outline" className={cn(
                                            "border-border/30",
                                            count > 20 ? "text-red-500" : count > 10 ? "text-yellow-500" : "text-green-500"
                                        )}>
                                            {count > 20 ? 'HIGH' : count > 10 ? 'MED' : 'LOW'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ));
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Largest Files Table */}
                  <Card className="overflow-hidden my-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        📏 Largest Files
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto">
                      <div className="min-w-[600px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>File</TableHead>
                              <TableHead className="text-right">Lines</TableHead>
                              <TableHead className="text-right">Size</TableHead>
                              <TableHead className="text-right">Functions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                                return (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            View complete file details in the Files tab
                                        </TableCell>
                                    </TableRow>
                                );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* File Types Detail */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        📦 File Types Detail
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Extension</TableHead>
                            <TableHead className="text-right">Files</TableHead>
                            <TableHead className="text-right">Lines</TableHead>
                            <TableHead className="text-right">Size</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(stats?.extDetail || {}).sort((a: any, b: any) => b[1].count - a[1].count).slice(0, 10).map(([ext, d]: [string, any]) => (
                            <TableRow key={ext}>
                              <TableCell className="font-mono font-medium">.{ext}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{d.count}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{d.lines.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{(d.size / 1024).toFixed(1)}KB</TableCell>
                            </TableRow>
                          ))}
                          {!stats?.extDetail && (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">{isLoading ? "Computing…" : "No data"}</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* DYNAMIC FILE TREE VIEW */}
              {activeTab === "files" && (
                <div className="p-6 space-y-6 max-w-6xl mx-auto">
                  <Card className="bg-card overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FolderTree className="h-6 w-6 text-primary" />
                        Repository Structure
                      </CardTitle>
                      <p className="text-sm text-muted-foreground pt-1">Full recursive file and folder tree of the analyzed codebase.</p>
                    </CardHeader>
                    <CardContent className="p-4 overflow-x-auto custom-scrollbar min-h-[500px]">
                        <div 
                          key={treeVersion}
                          className="space-y-0.5"
                          id="tree-display"
                          dangerouslySetInnerHTML={{ 
                            __html: treeHtml || (typeof document !== "undefined" ? document.getElementById('ltree-body')?.innerHTML || "" : "")
                          }}
                        />
                        {!full && !treeHtml && (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic">
                                <p>Analysis results not loaded.</p>
                            </div>
                        )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* CODE ISSUES VIEW */}
              {activeTab === "issues" && (
                <div className="p-6 max-w-7xl mx-auto">
                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Code Issues Tracker
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        key={treeVersion}
                        className="bg-muted/30 rounded-lg p-5 font-mono text-sm min-h-[500px] overflow-auto custom-scrollbar"
                        id="render-issues"
                        dangerouslySetInnerHTML={{ 
                          __html: issuesHtml || (typeof document !== "undefined" ? document.getElementById('lissues-body')?.innerHTML || "" : "")
                        }} 
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* NATIVE UI FOR FUNCTIONS */}
              {activeTab === "functions" && (
                <div className="p-6 space-y-6 max-w-7xl mx-auto">
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-card">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Total Functions
                          <Code2 className="h-4 w-4 text-primary" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{functions?.length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Classes / Objects
                          <Folder className="h-4 w-4 text-blue-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{functions?.filter((f: any) => f.lang === 'class').length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Large Functions (&gt;30 lines)
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-yellow-500">{functions?.filter((f: any) => (f.size || 0) > 30).length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Async Methods
                          <Loader2 className="h-4 w-4 text-purple-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{functions?.filter((f: any) => f.lang === 'async').length || 0}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Refactor Targets</CardTitle>
                      <p className="text-sm text-muted-foreground">Functions with high complexity or line counts that might need refactoring.</p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Function Name</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead className="text-right">Lines</TableHead>
                            <TableHead className="text-right">Complexity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {functions?.filter((f: any) => (f.size || 0) > 30).sort((a: any, b: any) => (b.size || 0) - (a.size || 0)).slice(0, 15).map((f: any) => (
                            <TableRow key={f.file + f.name + f.line}>
                                <TableCell className="font-mono text-sm font-medium">{f.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={f.file}>{f.file}</TableCell>
                                <TableCell className={cn(
                                    "text-right font-bold",
                                    (f.size || 0) > 80 ? "text-red-500" : "text-yellow-500"
                                )}>{f.size || 0}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={ (f.size || 0) > 80 ? "destructive" : "outline"} className={ (f.size || 0) <= 80 ? "text-yellow-500 border-yellow-500/20" : ""}>
                                        {(f.size || 0) > 80 ? 'HIGH' : 'MED'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                          ))}
                          {functions?.filter((f: any) => (f.size || 0) > 30).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                    No large functions detected.
                                </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* NATIVE UI FOR DUPLICATES */}
              {activeTab === "duplicates" && (
                <div className="p-6 space-y-6 max-w-7xl mx-auto">
                  <div className="flex items-center justify-between bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                    <div>
                      <h2 className="text-xl font-bold text-destructive flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" /> Code Duplication Warning
                      </h2>
                      <p className="text-sm text-foreground/80 mt-1">We found substantial code blocks duplicated across multiple files. Refactoring these into shared utilities can significantly reduce bundle size.</p>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-destructive">{duplicates?.length || 0}</div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-1">Duplicates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">{stats?.files ? Math.round(([...new Set(duplicates?.flatMap(d => d.files))].length / stats.files) * 100) : 0}%</div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-1">Affected</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {duplicates?.map((d: any, i: number) => (
                    <Card key={i} className="border-border">
                      <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                            Snippet #{i+1}
                          </CardTitle>
                          <Badge variant="secondary">Found in {d.files?.length || 0} files</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {d.files?.map((f: string) => (
                            <Badge key={f} variant="outline" className="text-[10px] text-muted-foreground">{f}</Badge>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <pre className="p-4 text-xs font-mono bg-background overflow-x-auto text-primary/80">
                            {d.snippet}
                        </pre>
                      </CardContent>
                    </Card>
                    ))}
                    {duplicates?.length === 0 && (
                        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                            <p className="text-muted-foreground italic">No significant code duplicates detected.</p>
                        </div>
                    )}
                  </div>
                </div>
              )}

              {/* NATIVE UI FOR AI INSIGHTS */}
              {activeTab === "ai" && (
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                  <div className="flex items-start gap-4 p-5 bg-card border border-border/50 rounded-xl shadow-sm">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold">Executive Summary</h2>
                      <div className="text-sm text-foreground mt-2 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        {aiResult ? (
                            <div className="whitespace-pre-wrap">{aiResult.split('##')[1]?.split('\n').filter((l:string)=>l.trim()).join('\n') || "Summary unavailable"}</div>
                        ) : (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <AlertTriangle className="h-5 w-5" /> Full Analysis Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                            {aiResult ? (
                                <div className="whitespace-pre-wrap">{aiResult}</div>
                            ) : (
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            )}
                         </div>
                    </CardContent>
                  </Card>
                  
                  <div className="text-center py-4">
                    <Button variant="outline" className="text-xs" onClick={() => setActiveTab("overview")}>
                      Return to Overview
                    </Button>
                  </div>
                </div>
              )}

              {/* Logic.js container for non-overview tabs */}
              <div className="p-0" id="cbody" style={{ display: "none" }}></div>
            </main>



            {/* RIGHT CHAT PANEL REMOVED */}
            <div style={{ display: 'none' }}>
               <div id="chat-msgs"></div>
               <textarea id="cinput"></textarea>
               <button id="sbtn"></button>
            </div>
          </div>
        </div>
      </div>

      <Script src="/logic.js" strategy="afterInteractive" />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading Analyzer…</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
