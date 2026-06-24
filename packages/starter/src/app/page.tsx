import { WpHead } from "../.forgewp/wordpress";
import { BookOpen, Github, ChevronRight, Database, Code2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#fafafa] selection:bg-primary selection:text-white flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 relative overflow-x-hidden lg:overflow-hidden font-sans">
      <WpHead
        title="ForgeWP — React & Tailwind Compiler for WordPress"
        description="A premium developer framework for creating modern Gutenberg block-themes using React."
        ogType="website"
      />

      {/* ── BACKGROUND: Glowing Magma Blob ── */}
      <div className="absolute -left-48 -top-48 w-[600px] h-[600px] bg-[radial-gradient(circle,oklch(0.61_0.22_42.5/_0.12)_0%,transparent_70%)] blur-3xl pointer-events-none z-0"></div>

      {/* ── HEADER: Centered Text Logo ── */}
      <header className="relative w-full flex justify-center pb-4 lg:pb-6 z-10 shrink-0">
        <h1 className="font-heading font-black text-3xl tracking-tight bg-linear-to-r from-primary to-amber-500 bg-clip-text text-transparent select-none">
          ForgeWP
        </h1>
      </header>

      {/* ── COMPACT CARD CONTAINER wrapping the Two-Column Grid ── */}
      <main className="relative w-full max-w-5xl bg-white border border-slate-100/80 shadow-xl shadow-slate-100/50 p-6 md:p-8 lg:py-8 lg:px-10 lg:min-h-[430px] z-10 rounded-none flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 w-full items-center">
          
          {/* Left Layout: Hero Header, Text, and Two CTAs */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tight leading-[1.1] text-slate-900 mb-4 uppercase">
              React Structure.
              <br />
              Tailwind Speed.
              <br />
              WordPress Power.
            </h2>

            <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-normal max-w-xl mb-6">
              Welcome to ForgeWP. Build your layout dynamically using standard
              React components, mock hooks, and modern utilities. The compiler
              transpiles your isomorphic components directly into
              production-grade, standard classic WordPress block themes
              automatically.
            </p>

            {/* Two CTAs: Docs and GitHub */}
            <div className="flex flex-wrap gap-4">
              <a
                href="https://forgewp.dev/docs"
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex items-center justify-center bg-transparent text-primary hover:text-white border border-primary font-mono font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 transition-colors duration-500 rounded-none overflow-hidden select-none cursor-pointer shadow-sm shadow-primary/5 hover:shadow-md hover:shadow-primary/10"
              >
                {/* Fill effect helper layer */}
                <div className="absolute inset-y-0 left-0 bg-primary w-0 group-hover:w-full transition-all duration-600 ease-out z-0"></div>
                
                {/* Text Content */}
                <span className="relative z-10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 mr-2" />
                  Read Framework Docs
                </span>
              </a>
              <a
                href="https://github.com/forgewp/forgewp"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 font-mono font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 rounded-none select-none cursor-pointer"
              >
                <Github className="w-3.5 h-3.5 mr-2" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Right Layout: Two Stacked Compact Cards */}
          <div className="lg:col-span-6 flex flex-col gap-4 w-full">

            {/* Card 1: Query Sandbox */}
            <a
              href="/query-sandbox"
              className="group bg-white border border-transparent p-4 lg:p-5 shadow-md shadow-slate-100/30 hover:shadow-[0_0_15px_oklch(0.61_0.22_42.5/_0.08)] transition-all duration-500 rounded-none relative overflow-hidden flex flex-col justify-center"
            >
              {/* Top border progress bar on hover */}
              <div className="absolute top-0 left-0 h-[2px] bg-linear-to-r from-primary to-amber-500 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>

              <div className="flex items-start gap-4">
                <div className="bg-amber-500/5 p-2.5 rounded-full border border-amber-500/10 shrink-0">
                  <Database className="w-5 h-5 text-amber-500" />
                </div>
                
                <div className="flex-1 pr-6">
                  <h3 className="font-heading font-black text-lg text-slate-900 tracking-tight mb-2 uppercase">
                    Relational Query Sandbox
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
                    Test and inspect ForgeWP's mock data loop systems, custom tax
                    queries, meta mappings, and server pagination.
                  </p>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <ChevronRight className="w-5 h-5 text-amber-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500" />
                </div>
              </div>
            </a>

            {/* Card 2: wp-editable */}
            <a
              href="/wp-editable"
              className="group bg-white border border-transparent p-4 lg:p-5 shadow-md shadow-slate-100/30 hover:shadow-[0_0_15px_oklch(0.61_0.22_42.5/_0.08)] transition-all duration-500 rounded-none relative overflow-hidden flex flex-col justify-center"
            >
              {/* Top border progress bar on hover */}
              <div className="absolute top-0 left-0 h-[2px] bg-linear-to-r from-primary to-amber-500 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/5 p-2.5 rounded-full border border-primary/10 shrink-0">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 pr-6">
                  <h3 className="font-heading font-black text-lg text-slate-900 tracking-tight mb-2 uppercase">
                    WpEditable Block Canvas
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
                    Test visual inline editing primitives. Build custom content
                    editors directly inside the Gutenberg admin dashboard.
                  </p>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <ChevronRight className="w-5 h-5 text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500" />
                </div>
              </div>
            </a>

          </div>
        </div>
      </main>
    </div>
  );
}
