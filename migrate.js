const fs = require('fs');
const html = fs.readFileSync('../codesighter.html', 'utf8');

const tstyle = html.match(/<style>([\s\S]*?)<\/style>/i)[1];
const tscript = html.match(/<script>([\s\S]*?)<\/script>/i)[1];
const tbody = html.match(/<body>([\s\S]*?)<\/body>/i)[1].replace(/<script>([\s\S]*?)<\/script>/gi, '');

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Write the cleanly extracted script to public/logic.js
// We also bind the functions to window explicitly just in case Next.js script loading wraps them
let logicJs = tscript;
// Explicitly expose globals for the inline event handlers.
logicJs += `
window.run = run;
window.goHome = goHome;
window.lsw = lsw;
window.csw = csw;
window.qs = qs;
window.sendChat = sendChat;
`;
fs.writeFileSync('public/logic.js', logicJs);

let pageTsx = `"use client";
import Script from 'next/script';

export default function Home() {
  return (
    <>
      <div 
        className="codesighter-app" 
        dangerouslySetInnerHTML={{__html: \`${tbody.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`}} 
      />
      <Script src="/logic.js" strategy="afterInteractive" />
    </>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', pageTsx);

const globalsCss = `
@import "tailwindcss";

${tstyle}
`;
fs.writeFileSync('src/app/globals.css', globalsCss);

const layoutTsx = `
import "./globals.css";

export const metadata = {
  title: 'CodeSighter — Repo Intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
`;
fs.writeFileSync('src/app/layout.tsx', layoutTsx);

console.log("Migration 2.0 complete!");
