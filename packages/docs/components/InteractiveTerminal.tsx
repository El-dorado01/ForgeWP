"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Play, RotateCcw } from "lucide-react";

interface TerminalCommand {
  cmd: string;
  output: string[];
}

export function InteractiveTerminal() {
  const [activeCmd, setActiveCmd] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([
    "ForgeWP CLI Engine v0.3.0 Ready.",
    "Type or select a command from below to preview the pipeline...",
    ""
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const commands: Record<string, TerminalCommand> = {
    "forgewp fresh": {
      cmd: "pnpm forgewp fresh -f",
      output: [
        "🧹   FORGEWP FACTORY RESET (FRESH CANVAS)  ",
        "  ✅ Cleared cache folder: dist",
        "  ✅ Reset database schema: wordpress/menus.json",
        "  ✅ Reset database schema: wordpress/mock-data.json",
        "  ✅ Reset routes definition: src/app/routes.tsx",
        "  ✅ Reset core template: src/app/page.tsx",
        "────────────────────────────────────────────────────────────",
        "🎉 CANVAS RESET COMPLETE: Reverted workspace back to standard empty blueprints.",
        "   Your ForgeWP canvas is now factory-fresh, clean, and perfectly synced.",
        "",
        "🚀 NEXT STEPS:",
        "   1. Start the Vite Dev Server:    pnpm dev or npm run dev",
        "   2. Add dynamic UI components:    pnpm forgewp add fade-reveal",
        "   3. Customize your entry page:    src/app/page.tsx",
        "   4. Compile to WordPress theme:  pnpm export or npm run export"
      ]
    },
    "forgewp add fade-reveal": {
      cmd: "pnpm forgewp add fade-reveal",
      output: [
        "  ForgeWP add — fade-reveal (forgewp)",
        "",
        "  Found fade-reveal in ForgeWP local registry...",
        "  ⚡ Detected missing dependencies: framer-motion",
        "  Automatically installing dependencies using pnpm...",
        "  Progress: resolved 21, added 1, done.",
        "  ✅ Successfully installed: framer-motion",
        "",
        "  Applying ForgeWP Sharp aesthetics...",
        "    Sharpened fade-reveal.tsx (rounded border classes removed)",
        "",
        "  Success! fade-reveal added to src/components/ui/fade-reveal.tsx"
      ]
    },
    "forgewp export": {
      cmd: "pnpm forgewp export",
      output: [
        "📦   FORGEWP THEME COMPILER PIPELINE (v0.3.0)",
        "",
        "  🔍 Scanning file system...",
        "     Found page template: src/app/page.tsx",
        "     Found page template: src/app/pages/AboutUsPage.tsx",
        "     Found block: src/blocks/HeroBlock.tsx",
        "",
        "  ⚙️  Transpiling Gutenberg Blocks...",
        "     Compiling: HeroBlock.tsx ➜ blocks/hero-block/block.json & render.php",
        "     ✅ Dynamic PHP Transpiler linked attributes cleanly.",
        "",
        "  ✂️  Executing Header & Footer Subtraction Matrix...",
        "     Header parsed successfully.",
        "     Footer parsed successfully.",
        "",
        "  📁 Structuring WordPress Page Templates...",
        "     Created custom page template: Template Name: About Us Page",
        "",
        "  🎨 Merging Design Tokens...",
        "     Exported config settings ➜ wordpress/theme.json",
        "     Linked preconnect tags for Google Fonts enqueues inside functions.php",
        "",
        "  🤐 Bundling installable zip theme archive...",
        "     Compressed forgewp-starter.zip recursively.",
        "",
        "🎉 COMPILATION SUCCESSFUL! Zip package fully written to:",
        "   ./.forgewp/forgewp-starter.zip (Ready to upload to WordPress!)"
      ]
    }
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, isTyping]);

  const runCommandSim = async (key: string) => {
    if (isTyping) return;
    setIsTyping(true);
    setActiveCmd(key);
    const selected = commands[key];

    // Clear and show prompt typing
    setLines((prev) => [...prev, `$ ${selected.cmd}`]);
    
    // Typing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Print output lines one-by-one with micro-delays
    for (const outputLine of selected.output) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setLines((prev) => [...prev, outputLine]);
    }

    setLines((prev) => [...prev, ""]);
    setIsTyping(false);
  };

  const resetTerminal = () => {
    setLines([
      "ForgeWP CLI Engine v0.3.0 Ready.",
      "Type or select a command from below to preview the pipeline...",
      ""
    ]);
    setActiveCmd(null);
    setIsTyping(false);
  };

  return (
    <div className="border-4 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden select-none my-8">
      {/* Terminal Title Bar */}
      <div className="flex justify-between items-center bg-black dark:bg-zinc-855 text-white px-4 py-2 border-b-4 border-black dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-yellow-400" />
          <span className="font-mono text-xs font-black uppercase tracking-wider">
            interactive-pipeline-simulation.sh
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-none border border-white/20 bg-red-500" />
          <span className="w-3 h-3 rounded-none border border-white/20 bg-yellow-500" />
          <span className="w-3 h-3 rounded-none border border-white/20 bg-green-500" />
        </div>
      </div>

      {/* Terminal Output */}
      <div className="bg-zinc-950 p-5 font-mono text-xs text-green-400 leading-relaxed min-h-[320px] max-h-[420px] overflow-y-auto select-text">
        {lines.map((line, idx) => {
          let colorClass = "text-green-400";
          if (line.startsWith("$")) {
            colorClass = "text-yellow-300 font-bold";
          } else if (line.includes("✅") || line.includes("🎉") || line.includes("SUCCESSFUL")) {
            colorClass = "text-emerald-400 font-black";
          } else if (line.includes("❌") || line.includes("⚠️")) {
            colorClass = "text-red-400 font-bold";
          } else if (line.startsWith("   1.") || line.startsWith("   2.") || line.startsWith("   3.") || line.startsWith("   4.")) {
            colorClass = "text-cyan-400 font-bold";
          } else if (line.includes("MONOREPO CONTEXT") || line.includes("NEXT STEPS:")) {
            colorClass = "text-yellow-400 font-bold";
          } else if (line.startsWith("🧹") || line.startsWith("📦")) {
            colorClass = "text-white font-black uppercase tracking-widest border-b border-zinc-800 pb-1";
          }
          return (
            <div key={idx} className={`${colorClass} whitespace-pre-wrap py-0.5`}>
              {line}
            </div>
          );
        })}
        {isTyping && (
          <div className="text-zinc-500 italic animate-pulse flex items-center gap-1.5 mt-1 select-none">
            <span>Executing compilation routine...</span>
            <span className="w-1.5 h-3 bg-zinc-400 inline-block animate-ping" />
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Interactive Controls */}
      <div className="bg-zinc-100 dark:bg-zinc-800 p-4 border-t-4 border-black dark:border-zinc-700 flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap gap-2.5">
          {Object.keys(commands).map((key) => {
            const isCurrent = activeCmd === key;
            return (
              <button
                key={key}
                disabled={isTyping}
                onClick={() => runCommandSim(key)}
                className={`border-2 border-black font-mono text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 transition-all select-none cursor-pointer flex items-center gap-1.5 rounded-none
                  ${isCurrent 
                    ? "bg-yellow-400 text-black shadow-none translate-x-0.5 translate-y-0.5" 
                    : "bg-white hover:bg-zinc-50 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-950 dark:text-white shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  } disabled:opacity-50`}
              >
                <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                {key}
              </button>
            );
          })}
        </div>

        <button
          onClick={resetTerminal}
          className="border-2 border-black bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-black dark:text-white font-mono text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all select-none cursor-pointer flex items-center gap-1.5 rounded-none"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Terminal
        </button>
      </div>
    </div>
  );
}
