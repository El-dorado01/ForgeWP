"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple yet highly effective line-by-line custom markdown parser
  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    const btn = document.getElementById(id);
    if (btn) {
      btn.innerHTML = `<span class="flex items-center gap-1.5 text-green-500 font-bold"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg> Copied!</span>`;
      setTimeout(() => {
        btn.innerHTML = `<span class="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy</span>`;
      }, 1500);
    }
  };

  const renderInlineStyles = (text: string) => {
    // Escape standard HTML tags
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt bridge;");

    // Bold replacement (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-black dark:text-white">$1</strong>');
    
    // Inline code replacement (`code`)
    html = html.replace(/`(.*?)`/g, '<code class="px-2 py-0.5 font-mono text-xs font-black bg-yellow-100 dark:bg-zinc-800 text-yellow-800 dark:text-yellow-300 border border-black dark:border-zinc-700">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  let listItems: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      const items = [...listItems];
      listItems = [];
      return (
        <ul key={`ul-${key}`} className="my-6 space-y-3.5 pl-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300 text-sm md:text-base font-medium leading-relaxed select-none">
              <span className="w-5 h-5 flex-shrink-0 mt-0.5 border-2 border-black dark:border-white bg-yellow-400 dark:bg-yellow-500 rounded-none flex items-center justify-center font-mono text-[10px] font-black text-black">
                ✔
              </span>
              <span>{renderInlineStyles(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Code Block start/end
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End Code Block
        inCodeBlock = false;
        const codeText = codeLines.join("\n");
        const blockId = `code-block-${i}`;
        const currentLang = codeLang;
        
        renderedElements.push(
          <div key={blockId} className="relative border-4 border-black dark:border-zinc-700 bg-zinc-950 my-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)] rounded-none overflow-hidden select-text">
            <div className="flex justify-between items-center bg-zinc-900 border-b-2 border-black dark:border-zinc-700 px-4 py-2 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-none border border-black" />
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-none border border-black" />
                <span className="w-2.5 h-2.5 bg-green-500 rounded-none border border-black" />
                <span className="font-mono text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">
                  {currentLang || "code"}
                </span>
              </div>
              <button
                id={blockId}
                onClick={() => copyToClipboard(codeText, blockId)}
                className="font-mono text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="p-5 overflow-x-auto text-xs md:text-sm font-mono text-cyan-300 dark:text-cyan-200 leading-relaxed max-h-[450px]">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeLines = [];
        codeLang = "";
      } else {
        // Start Code Block
        inCodeBlock = true;
        codeLang = line.trim().substring(3).trim();
        // Flush any list items accumulated before this
        const listNode = flushList(i);
        if (listNode) renderedElements.push(listNode);
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Handle Headings
    const h1Match = line.match(/^#\s+(.*)/);
    const h2Match = line.match(/^##\s+(.*)/);
    const h3Match = line.match(/^###\s+(.*)/);

    if (h1Match || h2Match || h3Match) {
      const listNode = flushList(i);
      if (listNode) renderedElements.push(listNode);

      if (h1Match) {
        renderedElements.push(
          <h1 key={i} className="text-3xl md:text-4xl font-serif font-black text-black dark:text-white uppercase leading-none mt-12 mb-6 border-b-4 border-black dark:border-zinc-700 pb-3 select-none">
            {renderInlineStyles(h1Match[1])}
          </h1>
        );
      } else if (h2Match) {
        renderedElements.push(
          <h2 key={i} className="text-2xl md:text-3xl font-serif font-black text-black dark:text-white uppercase leading-none mt-10 mb-5 border-l-4 border-black dark:border-yellow-400 pl-3 select-none">
            {renderInlineStyles(h2Match[1])}
          </h2>
        );
      } else {
        renderedElements.push(
          <h3 key={i} className="text-xl font-mono font-black text-black dark:text-white uppercase mt-8 mb-4 tracking-tight select-none">
            &gt; {renderInlineStyles(h3Match![1])}
          </h3>
        );
      }
      continue;
    }

    // Handle List Items
    const listMatch = line.match(/^[\s]*[-*+]\s+(.*)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    // Flush list if regular line breaks the list sequence
    if (line.trim() === "" || !line.match(/^[\s]*[-*+]/)) {
      const listNode = flushList(i);
      if (listNode) renderedElements.push(listNode);
    }

    // Handle Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      renderedElements.push(
        <hr key={i} className="my-10 border-t-4 border-dashed border-black dark:border-zinc-800" />
      );
      continue;
    }

    // Handle Alert / Blockquotes
    const alertMatch = line.match(/^>\s+\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)/i);
    const regularQuoteMatch = line.match(/^>\s+(.*)/);

    if (alertMatch) {
      const type = alertMatch[1].toUpperCase();
      const content = alertMatch[2];
      
      let bgClass = "bg-cyan-50 dark:bg-cyan-950/20 text-cyan-950 dark:text-cyan-200 border-cyan-400";
      let label = "💡 NOTE";
      if (type === "TIP") {
        bgClass = "bg-green-50 dark:bg-green-950/20 text-green-950 dark:text-green-200 border-green-400";
        label = "⚡ TIP";
      } else if (type === "IMPORTANT" || type === "WARNING" || type === "CAUTION") {
        bgClass = "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-950 dark:text-yellow-200 border-yellow-400";
        label = "⚠️ IMPORTANT";
      }

      renderedElements.push(
        <div key={i} className={`p-5 my-6 border-3 border-black dark:border-zinc-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none rounded-none flex flex-col gap-1.5 ${bgClass} select-none`}>
          <span className="font-mono text-[10px] font-black uppercase tracking-widest">{label}</span>
          <p className="text-sm md:text-base font-semibold leading-relaxed">{renderInlineStyles(content)}</p>
        </div>
      );
      continue;
    } else if (regularQuoteMatch) {
      renderedElements.push(
        <blockquote key={i} className="pl-4 py-1 border-l-4 border-black dark:border-zinc-600 my-6 text-zinc-500 dark:text-zinc-400 font-sans italic text-sm md:text-base leading-relaxed select-none">
          {renderInlineStyles(regularQuoteMatch[1])}
        </blockquote>
      );
      continue;
    }

    // Regular paragraphs
    if (line.trim() !== "") {
      renderedElements.push(
        <p key={i} className="text-zinc-600 dark:text-zinc-400 font-sans text-sm md:text-base font-medium leading-relaxed my-4 text-justify select-text">
          {renderInlineStyles(line)}
        </p>
      );
    }
  }

  // Flush any remaining list items at the end
  const finalListNode = flushList(lines.length);
  if (finalListNode) renderedElements.push(finalListNode);

  return <div className="markdown-body space-y-2">{renderedElements}</div>;
}
