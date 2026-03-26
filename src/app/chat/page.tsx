"use client";

import { Navbar } from "@/components/navbar";
import { ChatInterface } from "@/components/chat-interface";
import Script from "next/script";

export default function ChatPage() {
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
