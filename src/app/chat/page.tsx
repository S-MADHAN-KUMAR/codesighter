"use client";

import { Navbar } from "@/components/navbar";
import { ChatInterface } from "@/components/chat-interface";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [isGuarded, setIsGuarded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('codesighter_last');
      if (!raw) {
        setIsGuarded(true);
        const t = setTimeout(() => router.replace('/'), 900);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [router]);

  if (isGuarded) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/20">
          <Card className="max-w-md w-full border-destructive/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5"/> No analysis found</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Chat is blocked — no fetched data in local storage. Run an analysis from Home first.</p>
              <div className="flex gap-2">
                <Button onClick={() => router.replace('/')} className="flex-1">Go to Home</Button>
                <Button variant="outline" onClick={() => { localStorage.removeItem('codesighter_last'); router.replace('/'); }} className="flex-1">Clear & Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      
      {/* Main Chat Content */}
      <ChatInterface />

      {/* Hidden container for logic.js compatibility - required by public/logic.js */}
      {/* We use a wrapper with hidden to ensure it stays invisible even if script calls sDisp */}
      <div className="hidden pointer-events-none absolute opacity-0 overflow-hidden w-0 h-0" style={{ display: 'none !important' } as any}>
        <div id="analyzer" style={{ display: 'none' }}>
          <div id="rbar-url"></div>
          <div id="rstatus"></div>
          <div id="ltab-tree"></div>
          <div id="ltab-issues"></div>
          <div id="ltree-body"></div>
          <div id="lissues-body"></div>
          <div id="cbody"></div>
          <div id="chat-msgs"></div>
          <input id="rurl" type="hidden" />
          <input id="gtoken" type="hidden" />
          <textarea id="cinput"></textarea>
          <button id="sbtn"></button>
        </div>
        <div id="loading" style={{ display: 'none' }}>
          <div id="lbar"></div>
          <div id="lstatus"></div>
          <div id="lfiles"></div>
        </div>
      </div>

      <Script src="/logic.js" strategy="afterInteractive" />
    </div>
  );
}
