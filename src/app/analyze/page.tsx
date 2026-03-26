"use client";
import Script from "next/script";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const repoUrl = searchParams.get('url');
  const loadParam = searchParams.get('load');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing…");
  const [activeTab, setActiveTab] = useState("overview");
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

  useEffect(() => {
    const trigger = () => {
      if (repoUrl && window.run) {
        const ri = document.getElementById('rurl') as HTMLInputElement;
        if (ri) ri.value = repoUrl;

        const ti = document.getElementById('gtoken') as HTMLInputElement;
        const savedToken = localStorage.getItem('codesighter_token');
        if (ti && savedToken) ti.value = savedToken;

        window.run();
      } else if (loadParam === 'true' && window.loadLastAnalysis) {
        window.loadLastAnalysis();
      }
    };

    const itv = setInterval(() => {
      if (window.run || window.loadLastAnalysis) {
        trigger();
        clearInterval(itv);
      }
    }, 100);

    return () => clearInterval(itv);
  }, [repoUrl, loadParam]);

  // Listen for loading events
  useEffect(() => {
    const updateProgress = () => {
      const loadingEl = document.getElementById('loading');
      const lbarEl = document.getElementById('lbar');
      const lstatusEl = document.getElementById('lstatus');
      const analyzerEl = document.getElementById('analyzer');
      
      if (loadingEl && lbarEl && lstatusEl && analyzerEl) {
        const isLoadingVisible = loadingEl.style.display !== 'none';
        setIsLoading(isLoadingVisible);
        
        if (isLoadingVisible) {
          const width = lbarEl.style.width || '0%';
          setProgress(parseInt(width) || 0);
          setStatusText(lstatusEl.textContent || 'Initializing…');
          analyzerEl.style.display = 'none';
        } else {
          analyzerEl.style.display = 'flex';
        }
      }
    };

    // Check periodically for loading state changes
    const interval = setInterval(updateProgress, 100);
    updateProgress();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Simple Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      {/* Hidden inputs to populate from URL logic */}
      <Input id="rurl" type="hidden" />
      <Input id="gtoken" type="hidden" />
      <Button id="abtn" style={{ display: 'none' }}></Button>

      {/* NATIVE LOADING OVERLAY */}
      <div id="loading" className="flex flex-col items-center justify-center inset-0 absolute z-50 bg-background/80 backdrop-blur-sm" style={{ display: 'none' }}>
        <div className="flex flex-col items-center justify-center p-12 max-w-md w-full bg-card border border-border/50 shadow-2xl rounded-3xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
          
          <div className="w-20 h-20 relative flex items-center justify-center mb-8">
            <div className="absolute inset-0 border-[6px] border-primary/10 rounded-full"></div>
            <div className="absolute inset-0 border-[6px] border-primary border-t-transparent rounded-full animate-spin"></div>
            <img src="/ai.png" className="h-10 w-10 animate-pulse object-contain" />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Analyzing Repository</h2>
          <p className="text-sm text-muted-foreground font-medium text-center mb-8 h-5" id="lstatus">Initializing analyzer...</p>
          
          <div className="w-full bg-muted rounded-full h-2.5 mb-2 overflow-hidden border border-border/50 relative">
            <div id="lbar" className="bg-primary h-full rounded-full transition-all duration-300 relative shadow-[0_0_12px_rgba(var(--primary),0.6)]" style={{ width: '0%' }}>
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            <span>Fetching Code</span>
            <span>Processing</span>
          </div>
        </div>
      </div>

      {/* ANALYZER UI - Always visible, with progress overlay when loading */}
      <div id="analyzer" style={{ display: 'none' }} className="flex flex-col h-screen bg-background overflow-hidden relative">
        
        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-muted/10">
          
          <Navbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isLoading={isLoading}
            progress={progress}
            statusText={statusText}
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
                          <span className="text-2xl font-bold">22</span>
                          <span className="text-xs text-muted-foreground truncate">source files</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Folders</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">8</span>
                          <span className="text-xs text-muted-foreground truncate">directories</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Lines</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">7.7k</span>
                          <span className="text-xs text-muted-foreground truncate">7,659 lines</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Functions</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">35</span>
                          <span className="text-xs text-muted-foreground truncate">extracted</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Duplicates</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-destructive">5</span>
                          <span className="text-xs text-muted-foreground truncate">code blocks</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Avg Lines/File</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-yellow-500">348</span>
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
                        {[
                          { lang: "tsx", percent: 55, files: 12, color: "bg-blue-500" },
                          { lang: "yaml", percent: 9, files: 2, color: "bg-purple-500" },
                          { lang: "css", percent: 9, files: 2, color: "bg-pink-500" },
                          { lang: "json", percent: 9, files: 2, color: "bg-yellow-500" },
                          { lang: "ts", percent: 9, files: 2, color: "bg-blue-400" },
                          { lang: "md", percent: 5, files: 1, color: "bg-green-500" },
                          { lang: "gitignore", percent: 5, files: 1, color: "bg-slate-500" },
                        ].map((item) => (
                          <div key={item.lang} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-foreground">{item.lang}</span>
                              <span className="text-muted-foreground">{item.percent}% <span className="text-xs">({item.files} files)</span></span>
                            </div>
                            <Progress value={item.percent} indicatorColor={item.color} className="h-2" />
                          </div>
                        ))}
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
                              {[
                                { file: "app/components/TaskSection.tsx", funcs: 10, comp: "LOW" },
                                { file: "app/dashboard/stats/page.tsx", funcs: 6, comp: "LOW" },
                                { file: "app/dashboard/page.tsx", funcs: 5, comp: "LOW" },
                                { file: "app/components/ThemeProvider.tsx", funcs: 3, comp: "LOW" },
                                { file: "app/components/Calendar.tsx", funcs: 2, comp: "LOW" },
                                { file: "app/components/ContributionGraph.tsx", funcs: 2, comp: "LOW" },
                                { file: "app/login/page.tsx", funcs: 2, comp: "LOW" },
                              ].map((row) => (
                                <TableRow key={row.file}>
                                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]" title={row.file}>{row.file}</TableCell>
                                  <TableCell className="text-right font-medium">{row.funcs}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className="text-green-500 border-green-500/20">{row.comp}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
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
                            {[
                              { file: "pnpm-lock.yaml", lines: "4,414", size: "141.6KB", funcs: 0 },
                              { file: "app/dashboard/stats/page.tsx", lines: "576", size: "30.6KB", funcs: 6 },
                              { file: "app/components/TaskSection.tsx", lines: "581", size: "22.1KB", funcs: 10 },
                              { file: "app/components/ContributionGraph.tsx", lines: "310", size: "15.0KB", funcs: 2 },
                              { file: "app/time/page.tsx", lines: "265", size: "10.7KB", funcs: 1 },
                              { file: "app/dashboard/page.tsx", lines: "233", size: "9.4KB", funcs: 5 },
                              { file: "src/index.css", lines: "346", size: "6.6KB", funcs: 0 },
                            ].map((row) => (
                              <TableRow key={row.file}>
                                <TableCell className="font-mono text-xs text-primary/80 truncate max-w-[300px]" title={row.file}>{row.file}</TableCell>
                                <TableCell className="text-right font-medium">{row.lines}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{row.size}</TableCell>
                                <TableCell className="text-right font-medium">{row.funcs}</TableCell>
                              </TableRow>
                            ))}
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
                          {[
                            { ext: ".tsx", files: 12, lines: "2,413", size: "102.6KB" },
                            { ext: ".yaml", files: 2, lines: "4,420", size: "141.7KB" },
                            { ext: ".css", files: 2, lines: "674", size: "12.4KB" },
                            { ext: ".json", files: 2, lines: "67", size: "1.3KB" },
                            { ext: ".ts", files: 2, lines: "16", size: "0.6KB" },
                            { ext: ".md", files: 1, lines: "37", size: "1.4KB" },
                            { ext: ".gitignore", files: 1, lines: "32", size: "0.3KB" },
                          ].map((row) => (
                            <TableRow key={row.ext}>
                              <TableCell className="font-mono font-medium">{row.ext}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{row.files}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{row.lines}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{row.size}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Original overview ends here */}
                </div>
              )}

              {/* ARCHITECTURE DIAGRAM / FILES VIEW */}
              {activeTab === "files" && (
                <div className="p-6 space-y-6 max-w-6xl mx-auto">
                  <Card className="bg-card overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FolderTree className="h-6 w-6 text-primary" />
                        Codebase Architecture Diagram
                      </CardTitle>
                      <p className="text-sm text-muted-foreground pt-1">High-level visual representation of the repository's modular structure.</p>
                    </CardHeader>
                    <CardContent className="pt-12 pb-16 overflow-x-auto custom-scrollbar">
                      <div className="relative flex flex-col items-center min-w-[750px]">
                          
                        {/* ROOT */}
                        <div className="flex flex-col items-center z-10">
                          <div className="bg-background border-2 border-primary text-foreground px-6 py-4 rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.1)] flex flex-col items-center min-w-[200px]">
                            <Globe className="h-6 w-6 text-primary mb-2" />
                            <span className="font-bold tracking-wide">Next.js Application</span>
                            <span className="text-xs text-muted-foreground font-mono mt-1 bg-muted px-2 py-0.5 rounded">/</span>
                          </div>
                          <div className="w-px h-12 bg-border"></div>
                        </div>

                        {/* HORIZONTAL CONNECTOR TRUNK */}
                        <div className="w-[500px] h-px bg-border"></div>
                        <div className="flex justify-between w-[500px]">
                           <div className="w-px h-8 bg-border"></div>
                           <div className="w-px h-8 bg-border"></div>
                           <div className="w-px h-8 bg-border"></div>
                        </div>

                        {/* LEVEL 2 NODES */}
                        <div className="flex justify-between w-[700px] z-10 mt-[-1px]">
                          
                          {/* Frontend Node */}
                          <div className="flex flex-col items-center w-[220px]">
                            <div className="bg-card border border-border hover:border-blue-500/50 hover:shadow-lg transition-all w-full p-4 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 mb-4 text-blue-500">
                                 <LayoutDashboard className="h-5 w-5" />
                                 <span className="font-bold text-foreground">App Router (UI)</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                                  <span className="font-mono text-muted-foreground">app/</span>
                                  <Badge variant="secondary" className="text-[9px] font-semibold">14 Files</Badge>
                                </div>
                                <div className="flex justify-between items-center text-xs bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                                  <span className="font-mono text-muted-foreground">components/</span>
                                  <Badge variant="secondary" className="text-[9px] font-semibold">8 Files</Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Logic Node */}
                          <div className="flex flex-col items-center w-[220px]">
                            <div className="bg-card border border-border hover:border-green-500/50 hover:shadow-lg transition-all w-full p-4 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 mb-4 text-green-500">
                                 <Code2 className="h-5 w-5" />
                                 <span className="font-bold text-foreground">Analysis Engine</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                                  <span className="font-mono text-muted-foreground">public/logic.js</span>
                                  <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-500 font-semibold bg-green-500/5">Script</Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Configs Node */}
                          <div className="flex flex-col items-center w-[220px]">
                            <div className="bg-card border border-border hover:border-purple-500/50 hover:shadow-lg transition-all w-full p-4 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 mb-4 text-purple-500">
                                 <File className="h-5 w-5" />
                                 <span className="font-bold text-foreground">Configuration</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                                  <span className="font-mono text-muted-foreground">package.json</span>
                                  <Badge variant="secondary" className="text-[9px] font-semibold">Node</Badge>
                                </div>
                                <div className="flex justify-between items-center text-xs bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                                  <span className="font-mono text-muted-foreground">tailwind.config.mjs</span>
                                  <Badge variant="secondary" className="text-[9px] font-semibold">CSS</Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* End of architecture diagram node list */}
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
                        className="bg-muted/30 rounded-lg p-5 font-mono text-sm min-h-[500px] overflow-auto custom-scrollbar"
                        id="render-issues"
                        dangerouslySetInnerHTML={{ 
                          __html: typeof document !== "undefined" ? document.getElementById('lissues-body')?.innerHTML || "" : "" 
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
                        <div className="text-2xl font-bold">35</div>
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
                        <div className="text-2xl font-bold">3</div>
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
                        <div className="text-2xl font-bold text-yellow-500">5</div>
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
                        <div className="text-2xl font-bold">12</div>
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
                          <TableRow>
                            <TableCell className="font-mono text-sm font-medium">AnalyzeContent</TableCell>
                            <TableCell className="text-xs text-muted-foreground">app/analyze/page.tsx</TableCell>
                            <TableCell className="text-right text-destructive font-bold">450</TableCell>
                            <TableCell className="text-right"><Badge variant="destructive">HIGH</Badge></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-mono text-sm font-medium">processRepoData</TableCell>
                            <TableCell className="text-xs text-muted-foreground">public/logic.js</TableCell>
                            <TableCell className="text-right text-yellow-500 font-bold">85</TableCell>
                            <TableCell className="text-right"><Badge variant="outline" className="text-yellow-500 border-yellow-500/20">MED</Badge></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-mono text-sm font-medium">extractFunctions</TableCell>
                            <TableCell className="text-xs text-muted-foreground">public/logic.js</TableCell>
                            <TableCell className="text-right text-yellow-500 font-bold">62</TableCell>
                            <TableCell className="text-right"><Badge variant="outline" className="text-yellow-500 border-yellow-500/20">MED</Badge></TableCell>
                          </TableRow>
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
                        <div className="text-3xl font-bold text-destructive">5</div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-1">Duplicates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">12%</div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-1">Waste</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card className="border-border">
                      <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                            CardComponent Block
                          </CardTitle>
                          <Badge variant="secondary">Found in 2 files</Badge>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">app/dashboard/page.tsx</Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">app/settings/page.tsx</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <pre className="p-4 text-xs font-mono bg-background overflow-x-auto text-primary/80">
{`export function CustomCard({ title, value }) {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card hover:bg-muted/50 transition">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  )
}`}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-mono flex items-center gap-2">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                            FormatDate Helper
                          </CardTitle>
                          <Badge variant="secondary">Found in 3 files</Badge>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">app/utils/date.ts</Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">app/components/Calendar.tsx</Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">app/time/page.tsx</Badge>
                        </div>
                      </CardHeader>
                    </Card>
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
                    <div>
                      <h2 className="text-lg font-bold">Executive Summary</h2>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        This codebase appears to be a modern React dashboard application utilizing Next.js (App Router) and Tailwind CSS alongside Shadcn UI components. Architecturally, it is well-structured regarding UI separation, but lacks central state management for the complex analysis features, leading to tight coupling in &lt;AnalyzeContent&gt;.
                      </p>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <AlertTriangle className="h-5 w-5" /> Focus Areas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      <div className="space-y-2 border-l-2 border-primary/20 pl-4 py-1">
                        <h4 className="font-semibold text-sm">1. Component Bloat</h4>
                        <p className="text-sm text-muted-foreground">The `page.tsx` within the analysis route is exceeding recommended line counts (&gt;400 lines). Extract the layout elements (sidebar, stat cards, chat panel) into discrete components.</p>
                      </div>

                      <div className="space-y-2 border-l-2 border-destructive/20 pl-4 py-1">
                        <h4 className="font-semibold text-sm">2. Vanilla JS Interop</h4>
                        <p className="text-sm text-muted-foreground">Relying on `logic.js` injecting raw HTML into DOM via IDs (`document.getElementById`) bypasses React's virtual DOM, creating immense potential for state desync and memory leaks.</p>
                      </div>

                      <div className="space-y-2 border-l-2 border-yellow-500/20 pl-4 py-1">
                        <h4 className="font-semibold text-sm">3. Duplicate Shared Components</h4>
                        <p className="text-sm text-muted-foreground">Data visualizations (like `Language Breakdown`) are hardcoded across multiple views. Move these into a `components/charts` directory.</p>
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
