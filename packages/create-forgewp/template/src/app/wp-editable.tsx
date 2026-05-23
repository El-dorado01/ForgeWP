/**
 * WpEditable Canvas Preview — Local Dev Verification Page
 *
 * Navigate to: http://localhost:5173/wp-editable
 *
 * This page renders the WpEditableArticle block in "local dev" mode:
 * — All <WpEditable> fields are contentEditable HTML elements
 * — Clicking any heading, body, badge or CTA label opens inline editing
 * — Changes fire setAttributes() keeping the block state in sync
 *
 * This visually proves the isomorphic editing primitive works before
 * it's compiled to Gutenberg <RichText> by the ForgeWP compiler.
 */
import { useState } from "react";
import WpEditableArticle from "../blocks/WpEditableArticle";

export default function WpEditablePage() {
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans flex flex-col items-center justify-start">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 border border-slate-100 bg-white p-8 shadow-2xl rounded-none relative overflow-hidden">
        {/* Subtle dot grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-size-[16px_16px] pointer-events-none opacity-40"></div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="bg-primary/10 text-primary border border-primary/10 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest rounded-none">
              Block Compiler · Isomorphic
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 border border-slate-200/60 rounded-none">
              WpEditable Primitive Verification
            </span>
          </div>

          <h1 className="text-3xl font-heading font-black tracking-tight text-slate-900 leading-tight">
            &lt;WpEditable&gt; — Canvas Preview
          </h1>
          <p className="mt-3 text-slate-500 text-sm leading-relaxed max-w-2xl font-medium">
            Click any <strong className="text-slate-900 font-bold">heading, body, badge, or CTA label</strong> below
            to edit it inline. This is how the ForgeWP compiler renders{" "}
            <code className="font-mono text-primary font-bold">WpEditable</code> inside the Gutenberg canvas{" "}
            before it transpiles to native <code className="font-mono text-primary font-bold">RichText</code>.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
            {[
              "contentEditable in local dev",
              "→ RichText in Gutenberg",
              "→ Static PHP HTML on frontend",
            ].map((label, i) => (
              <span
                key={i}
                className="bg-slate-50 text-slate-500 border border-slate-100/60 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider rounded-none"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Canvas wrapper */}
      <main className="w-full max-w-4xl z-10">
        {/* Instruction bar */}
        <div className="mb-6 flex items-center justify-between border border-slate-100 bg-white px-5 py-4 shadow-xl shadow-slate-100/40 rounded-none">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2.5 w-2.5 bg-green-500 animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Local Dev Canvas — contentEditable active
            </span>
          </div>
          <button
            onClick={() => setKey((k) => k + 1)}
            className="border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-slate-600 transition-colors rounded-none cursor-pointer"
          >
            Reset Block ↺
          </button>
        </div>

        {/* The actual block — rendered via its edit/save adapter */}
        <div className="space-y-8" key={key}>
          {/* Edit view (Gutenberg canvas simulation) */}
          <div className="border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100/50 rounded-none">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-widest">
                ◆ edit() view — Gutenberg canvas simulation
              </span>
            </div>
            <WpEditableArticle.edit
              attributes={{
                heading: "Click me to edit this heading inline",
                body: "This paragraph is also editable. Click anywhere in this text and type away. When you blur (click outside), the onChange callback fires and the block state updates — exactly like Gutenberg's RichText.",
                tag: "Editable",
                ctaLabel: "Read More →",
              }}
              setAttributes={() => {}}
            />
          </div>

          {/* Save view (visitor frontend simulation) */}
          <div className="border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100/50 rounded-none">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="font-mono text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                ◆ save() view — visitor frontend (static HTML)
              </span>
            </div>
            <WpEditableArticle.save
              attributes={{
                heading: "This is the static save() render — not editable",
                body: "This is how the block renders to site visitors. The ForgeWP compiler transpiles WpEditable to plain HTML tags with PHP escaping. No contentEditable, no RichText — just clean HTML.",
                tag: "Published",
                ctaLabel: "Read Article",
              }}
            />
          </div>
        </div>

        {/* Callout */}
        <div className="mt-8 border border-slate-100 bg-white p-6 shadow-xl shadow-slate-100/40 rounded-none">
          <p className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-800 mb-3">
            🔍 What to verify:
          </p>
          <ul className="space-y-2 font-mono text-[11px] text-slate-500 font-bold uppercase tracking-wide">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Clicking the heading in edit() opens inline text editing
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Clicking the badge or CTA label also edits inline
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> The save() view below is static — no cursor appears
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Both panels render identical styles cleanly
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-slate-400 font-mono text-[9px] uppercase tracking-widest z-10">
        <span>© {new Date().getFullYear()} ForgeWP Framework</span>
        <span>Canvas Preview Evaluation Complete</span>
      </footer>
    </div>
  );
}
