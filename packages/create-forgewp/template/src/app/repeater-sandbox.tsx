import { WpHead, WpRepeater, WpIcon } from "../.forgewp/wordpress";
import { ChevronLeft } from "lucide-react";

interface MockRepeaterRow {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const DEFAULT_MOCK_ROWS: MockRepeaterRow[] = [
  {
    icon: "award",
    title: "Brutalist Quality",
    description: "We prioritize high-contrast grid layouts, raw typography, and high performance.",
    color: "text-primary bg-primary/10 border-primary/20",
  },
  {
    icon: "shield",
    title: "Self-Healing Core",
    description: "Our active framework boundaries automatically repair deleted config or routes.",
    color: "text-blue-600 bg-blue-50 border-blue-100",
  },
  {
    icon: "globe",
    title: "Dynamic Icons",
    description: "Isomorphic dynamic SVGs load instantly from centralized theme dictionaries.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    icon: "users",
    title: "Community First",
    description: "Designed in cooperation with theme engineers for extreme speed and clean markup.",
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
];

export default function RepeaterSandboxPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] p-6 md:p-12 font-sans flex flex-col items-center justify-start relative overflow-x-hidden">
      <WpHead
        title="ForgeWP — Declarative Repeater & Dynamic Icon Sandbox"
        description="Verify isomorphic repeater loops and client-configurable SVGs."
      />

      {/* Header */}
      <header className="w-full max-w-4xl mb-8 border border-slate-100 bg-white p-8 shadow-2xl rounded-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-size-[16px_16px] pointer-events-none opacity-40"></div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="bg-primary/10 text-primary border border-primary/10 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest rounded-none">
              Isomorphic Loops · Primitives
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 border border-slate-200/60 rounded-none">
              WpRepeater & WpIcon Preview
            </span>
          </div>

          <h1 className="text-3xl font-heading font-black tracking-tight text-slate-900 leading-tight">
            &lt;WpRepeater&gt; & &lt;WpIcon&gt; — Sandbox
          </h1>
          <p className="mt-3 text-slate-500 text-sm leading-relaxed max-w-2xl font-medium">
            Test and verify declarative nested array custom fields and client-configurable SVGs inside components. 
            Vite renders localized mock values in dev mode, while the production compiler compiles loops into clean PHP template arrays.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100">
            <a
              href="/"
              className="inline-flex items-center text-xs font-mono font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Sandbox */}
      <main className="w-full max-w-4xl z-10">
        <div className="mb-6 flex items-center justify-between border border-slate-100 bg-white px-5 py-4 shadow-xl shadow-slate-100/40 rounded-none">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2.5 w-2.5 bg-indigo-500 animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Local Dev Preview — Mock Loop & Dynamic Icons active
            </span>
          </div>
        </div>

        {/* Dynamic Repeater Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WpRepeater name="mock_repeater" defaultValue={DEFAULT_MOCK_ROWS}>
            {(row: MockRepeaterRow, index: number) => (
              <div
                key={index}
                className="bg-white border border-slate-200 p-6 shadow-md hover:shadow-lg transition-all duration-300 rounded-none flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-10 h-10 border flex items-center justify-center mb-4 shrink-0 rounded-none ${row.color}`}
                  >
                    <WpIcon name={row.icon} provider="lucide" className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-heading font-black uppercase tracking-tight text-slate-900 mb-2">
                    {row.title}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-sans font-medium">
                    {row.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Row Index: {index}</span>
                  <span>Slug: {row.icon}</span>
                </div>
              </div>
            )}
          </WpRepeater>
        </div>
      </main>
    </div>
  );
}
