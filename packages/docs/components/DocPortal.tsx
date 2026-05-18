"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { 
  Search, 
  BookOpen, 
  Menu, 
  X, 
  Github, 
  Moon, 
  Sun, 
  Terminal as TermIcon, 
  ChevronRight, 
  ChevronLeft 
} from "lucide-react";
import { DocSection } from "@/lib/docs";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { InteractiveTerminal } from "./InteractiveTerminal";

interface DocPortalProps {
  docs: DocSection[];
}

export function DocPortal({ docs }: DocPortalProps) {
  const [activeId, setActiveId] = useState<string>(docs[0]?.id || "phase-1-foundation-architecture");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Search logic across titles and markdown content
  const filteredDocs = docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDoc = docs.find((doc) => doc.id === activeId) || docs[0];

  const categories = Array.from(new Set(docs.map((doc) => doc.category)));

  // Navigation helpers for next/prev
  const currentIndex = docs.findIndex((doc) => doc.id === activeId);
  const prevDoc = currentIndex > 0 ? docs[currentIndex - 1] : null;
  const nextDoc = currentIndex < docs.length - 1 ? docs[currentIndex + 1] : null;

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b-4 border-black dark:border-zinc-700 px-4 flex justify-between items-center z-50 select-none">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-400" />
          <span className="font-mono text-sm font-black uppercase tracking-wider text-black dark:text-white">
            ForgeWP // Docs
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="border-2 border-black dark:border-zinc-600 bg-yellow-400 p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-black" /> : <Menu className="w-5 h-5 text-black" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed md:sticky top-0 left-0 bottom-0 w-80 bg-white dark:bg-zinc-900 border-r-4 border-black dark:border-zinc-700 p-6 flex flex-col gap-6 z-40 transition-transform duration-300 md:transform-none select-none
          ${sidebarOpen ? "translate-x-0 pt-20" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Branding header */}
        <div className="hidden md:flex items-center gap-3 border-b-4 border-black dark:border-zinc-700 pb-5">
          <div className="w-8 h-8 border-2 border-black dark:border-zinc-700 bg-yellow-400 flex items-center justify-center font-mono font-black text-black">
            F
          </div>
          <div>
            <h2 className="font-serif font-black text-lg text-black dark:text-white uppercase leading-none">
              ForgeWP Docs
            </h2>
            <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              Framework v0.3.0
            </span>
          </div>
        </div>

        {/* Dynamic Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search manuals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border-2 border-black dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-mono font-bold rounded-none focus:outline-none focus:bg-white dark:focus:bg-zinc-700 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
        </div>

        {/* Catalog Categories / Menu list */}
        <nav className="flex-1 overflow-y-auto space-y-6 pr-1">
          {categories.map((cat) => {
            const catDocs = filteredDocs.filter((doc) => doc.category === cat);
            if (catDocs.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">
                  // {cat} Manuals
                </span>
                <div className="space-y-1.5">
                  {catDocs.map((doc) => {
                    const isActive = doc.id === activeId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setActiveId(doc.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left font-mono text-xs font-bold px-3 py-2 border-2 transition-all flex items-center justify-between rounded-none cursor-pointer
                          ${isActive 
                            ? "bg-yellow-400 dark:bg-yellow-500 text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5" 
                            : "bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-zinc-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          }`}
                      >
                        <span className="truncate">{doc.title}</span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-black flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t-2 border-zinc-100 dark:border-zinc-800 pt-4 flex justify-between items-center text-[10px] font-mono text-zinc-400">
          <span>Press &apos;D&apos; for Dark Mode</span>
          <a
            href="https://github.com/El-dorado01/ForgeWP"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black dark:hover:text-white flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
      </aside>

      {/* MAIN DOCUMENTATION VIEW */}
      <main className="flex-1 min-w-0 flex flex-col">
        
        {/* STICKY TOP NAVBAR */}
        <header className="sticky top-0 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-md border-b-4 border-black dark:border-zinc-700 z-30 h-16 px-6 md:px-10 flex justify-between items-center select-none">
          <div className="hidden md:flex items-center gap-4">
            <span className="font-mono text-xs font-black uppercase bg-zinc-950 text-white px-2.5 py-1 border border-black dark:border-zinc-700">
              Active Workspace
            </span>
            <span className="font-mono text-xs font-bold text-zinc-500">
              C:\Users\hp\Desktop\ForgeWP
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-855 p-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-zinc-50 dark:hover:bg-zinc-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-none"
              title="Toggle Dark Mode (Press D)"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* GitHub Sticker */}
            <a
              href="https://github.com/El-dorado01/ForgeWP"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-black dark:border-zinc-700 bg-yellow-400 text-black px-4 py-2 font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-none flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </header>

        {/* CORE READING AREA */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 md:py-16 max-w-5xl mx-auto w-full">
          
          {/* Header Card */}
          <div className="border-4 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-none mb-10 select-none">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="bg-black text-white dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1">
                {activeDoc.category}
              </span>
              <span className="bg-cyan-400 text-black text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 border border-black">
                {activeDoc.phase}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-serif font-black text-zinc-950 dark:text-white uppercase leading-none mb-4">
              {activeDoc.title}
            </h1>
            
            <p className="text-zinc-500 dark:text-zinc-400 font-sans text-sm font-medium leading-relaxed">
              Official developer reference manual, compiled variables, internal file systems, and design patterns.
            </p>
          </div>

          {/* Interactive sandbox block for foundational phases */}
          {activeDoc.id.includes("phase") && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-3.5 select-none">
                <TermIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-zinc-500">
                  // Interactive CLI sandbox pipeline
                </span>
              </div>
              <InteractiveTerminal />
            </div>
          )}

          {/* Core Markdown Renderer */}
          <article className="prose prose-zinc max-w-none dark:prose-invert">
            <MarkdownRenderer content={activeDoc.content} />
          </article>

          {/* BOTTOM PREV / NEXT NAVIGATION */}
          <div className="border-t-4 border-black dark:border-zinc-800 mt-16 pt-10 flex flex-wrap justify-between gap-6 select-none">
            {prevDoc ? (
              <button
                onClick={() => setActiveId(prevDoc.id)}
                className="border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white px-5 py-3 font-mono text-xs font-black uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-zinc-50 dark:hover:bg-zinc-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-none flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-500" />
                <span>Prev: {prevDoc.title}</span>
              </button>
            ) : (
              <div />
            )}

            {nextDoc ? (
              <button
                onClick={() => setActiveId(nextDoc.id)}
                className="border-2 border-black dark:border-zinc-700 bg-yellow-400 text-black px-5 py-3 font-mono text-xs font-black uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-none flex items-center gap-2"
              >
                <span>Next: {nextDoc.title}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
