"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  User, 
  Sparkles, 
  Trash2, 
  ChevronRight,
  Brain,
  Zap,
  Code2,
  Globe,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [repoInfo, setRepoInfo] = useState<{full: string; owner: string; repo: string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Load last analysis to get repo context
    const last = localStorage.getItem('codesighter_last');
    if (last) {
      try {
        const data = JSON.parse(last);
        setRepoInfo({
          full: data.full,
          owner: data.owner,
          repo: data.repo
        });
        
        // Initial welcome message
        if (messages.length === 0) {
            setMessages([
              {
                role: 'assistant',
                content: `Hello! I'm your CodeSighter Assistant. I've analyzed **${data.full}** (${data.stats.files} files). Ask me anything about the architecture, security, or specific components of this codebase.`,
                timestamp: new Date()
              }
            ]);
        }

        // Attempt to load logic settings
        const interval = setInterval(() => {
          if (typeof window !== 'undefined' && (window as any).loadLastAnalysis) {
            (window as any).loadLastAnalysis();
            clearInterval(interval);
          }
        }, 100);
        setTimeout(() => clearInterval(interval), 2000);

      } catch (e) {
        console.error("Failed to parse last analysis", e);
      }
    } else {
      if (messages.length === 0) {
          setMessages([
            {
              role: 'assistant',
              content: "Welcome to CodeSighter Assistant! Please analyze a repository first to start a context-aware conversation.",
              timestamp: new Date()
            }
          ]);
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const last = localStorage.getItem('codesighter_last');
      if (!last) throw new Error("No analysis data found. Please analyze a repository first.");
      const data = JSON.parse(last);

      // Build context (similar to logic.js)
      let sys = `You are CodeSighter AI. You have analyzed the repo "${data.full}" (${data.stats.files} files, ${(data.stats.lines || 0).toLocaleString()} lines).\n\n`
        + `Functions: ${data.functions?.slice(0, 60).map((f: any) => f.name + ' in ' + f.file).join(', ')}\n\n`
        + `File list: ${data.files?.map((f: any) => f.path).join(', ')}\n\n`
        + `AI Analysis summary:\n${(data.aiResult || '').slice(0, 5000)}\n\n`
        + `File contents (partial):\n${data.files?.slice(0, 15).map((f: any) => 'FILE: ' + f.path + '\n' + f.content.slice(0, 500)).join('\n---\n')}`
        + `\n\nAnswer specifically about this codebase. Reference files by name. Be concise and helpful.`;

      const chatHistory = messages.map(m => ({ role: m.role, content: m.content })).slice(-8);
      const apiMessages = [
        { role: 'system', content: sys },
        ...chatHistory,
        { role: 'user', content: currentInput }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: apiMessages,
          max_tokens: 4096,
          temperature: 0.5,
          top_p: 0.9,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI error ${response.status}: ${errText.slice(0, 100)}`);
      }
      if (!response.body) throw new Error("No response body from AI API");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "",
        timestamp: new Date()
      }]);

      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent
                  };
                }
                return updated;
              });
            }
          } catch (e) {
            // Silently handle partial JSON or malformed lines
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${error.message || 'An unknown error occurred'}`,
        timestamp: new Date()
      }]);
    }
  };

  const suggestions = [
    "Explain the project structure",
    "Find potential security risks",
    "Identify duplicate code",
    "How can I improve performance?",
    "Review the authentication flow"
  ];

  return (
    <div className="flex flex-1 overflow-hidden relative h-full">
      {/* Sidebar/Context info */}
      <aside className="hidden lg:flex w-80 border-r border-border/50 flex-col bg-muted/10 p-6 gap-6 z-10 overflow-y-auto custom-scrollbar">
        {/* Identity & Admin Section (Moved from Header) */}
        <div className="space-y-6">
          

          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-9 rounded-xl gap-2 font-bold text-[11px] border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all uppercase tracking-wider" 
                onClick={() => setMessages([])}
            >
              <Trash2 className="h-4 w-4" />
              Reset Conversation
            </Button>
          </div>
        </div>

        <div className="h-px bg-border/50 w-full" />

        <div className="space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Expert Suggestions</h3>
          <div className="flex flex-col gap-2.5">
            {suggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => setInput(s)}
                className="text-xs text-left px-4 py-3 rounded-xl border border-border/40 bg-background/50 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all group flex items-center justify-between shadow-sm hover:shadow-md"
              >
                <span className="truncate pr-2">{s}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border/40 space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-card to-background border border-border/50 shadow-inner">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden group">
              <Brain className="h-5 w-5 relative z-10" />
              <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-foreground">Llama 3.1 70B</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-muted-foreground font-medium">Expert Analysis Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background/50">
        {/* Messages List */}
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className={cn(
                      "flex items-start gap-4 ",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "",
                      msg.role === 'user' 
                        ? "bg-secondary border border-border/50 text-secondary-foreground" 
                        : ""
                    )}>
                      {msg.role === 'user' ? <img src="https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg" className="h-8 w-8 rounded" /> : <img src="/ai.png" className="h-8 w-8  " />}
                    </div>

                    <div className={cn(
                      "flex flex-col gap-2.5 max-w-[85%] md:max-w-[75%]",
                      msg.role === 'user' ? "items-end text-right" : "items-start text-left"
                    )}>
                      <div className="flex items-center gap-2.5 px-1 opacity-60">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {msg.role === 'user' ? 'You' : 'CodeSighter Intelligence'}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/60">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "rounded-[22px] p-5 text-sm leading-relaxed shadow-[0_4px_12px_rgba(0,0,0,0.03)] border transition-all duration-300",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-none border-primary shadow-primary/10" 
                          : "bg-card/90 backdrop-blur-xl border-border/50 rounded-tl-none text-foreground hover:shadow-md"
                      )}>
                        <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">
                          {(() => {
                            const blocks = msg.content.split(/(```[\s\S]*?```)/);
                            return blocks.map((block, idx) => {
                              if (block.startsWith('```')) {
                                const code = block.replace(/```(\w*)\n?/, '').replace(/```$/, '');
                                const lang = block.match(/```(\w*)/)?.[1] || '';
                                return (
                                  <div key={idx} className="relative group my-4">
                                    <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded-bl-lg rounded-tr-lg border-l border-b border-border/50 uppercase">
                                      {lang || 'code'}
                                    </div>
                                    <pre className="p-4 bg-muted/30 rounded-xl overflow-x-auto border border-border/50 font-mono text-[13px] leading-relaxed">
                                      <code>{code.trim()}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return block.split('\n').map((line, lidx) => {
                                if (!line.trim() && lidx > 0) return <div key={`${idx}-${lidx}`} className="h-2" />;
                                // Simple bold support
                                const parts = line.split(/(\*\*.*?\*\*)/);
                                return (
                                  <p key={`${idx}-${lidx}`} className="m-0">
                                    {parts.map((part, pidx) => (
                                      part.startsWith('**') && part.endsWith('**') 
                                        ? <strong key={pidx} className="font-bold text-primary/90">{part.slice(2, -2)}</strong>
                                        : part
                                    ))}
                                  </p>
                                );
                              });
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 md:gap-6"
                >
                  <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 text-primary-foreground">
                    <img src="/ai.png" className="h-8 w-8 object-contain" />
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="bg-muted/40 backdrop-blur-sm rounded-2xl px-5 py-4 flex gap-2 items-center w-20 justify-center">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <footer className="p-8 border-t border-border/40 bg-background/50 backdrop-blur-3xl z-20">
          <div className="max-w-4xl mx-auto relative">
            <div className="relative flex items-center group">
              {/* Outer Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition duration-700" />
              
              <div className="relative flex-1 flex items-center gap-4 bg-card/80 border border-border/50 rounded-2xl px-5 py-2.5 shadow-xl shadow-black/5 focus-within:border-primary/50 focus-within:bg-card transition-all duration-300 backdrop-blur-md">
                <div className="hidden sm:flex h-9 w-9 rounded-xl bg-muted/50 items-center justify-center text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Zap className="h-4 w-4" />
                </div>
                <Input 
                  placeholder="Ask about architectural patterns, security issues, or specific components..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 text-[15px] h-11 placeholder:text-muted-foreground/60 font-medium"
                />
                <div className="flex items-center gap-3 pr-1">
                  <Button 
                    size="icon" 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className={cn(
                      "h-10 w-10 rounded-xl transition-all duration-500",
                      input.trim() 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-100 hover:scale-105 active:scale-95" 
                        : "bg-muted text-muted-foreground scale-90 opacity-50"
                    )}
                  >
                    <Send className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
