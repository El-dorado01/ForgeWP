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
    <div className="min-h-screen bg-zinc-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="mx-auto max-w-4xl mb-8">
        <div className="border-4 border-zinc-950 bg-zinc-950 px-6 py-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-brand px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-white">
              Block Compiler · isomorphic
            </span>
            <span className="font-mono text-xs text-zinc-400">WpEditable Primitive Verification</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            &lt;WpEditable&gt; — Canvas Preview
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
            Click any <strong className="text-white">heading, body, badge, or CTA label</strong> below
            to edit it inline. This is how the ForgeWP compiler renders{" "}
            <code className="text-green-400">WpEditable</code> inside the Gutenberg canvas{" "}
            before it transpiles to native <code className="text-green-400">RichText</code>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "contentEditable in local dev",
              "→ RichText in Gutenberg",
              "→ Static PHP HTML on frontend",
            ].map((label, i) => (
              <span
                key={i}
                className="border border-zinc-700 px-2 py-0.5 font-mono text-[9px] text-zinc-300 uppercase tracking-wider"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Canvas wrapper */}
      <main className="mx-auto max-w-4xl">
        {/* Instruction bar */}
        <div className="mb-4 flex items-center justify-between border-2 border-zinc-950 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse bg-green-500" />
            <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Local Dev Canvas — contentEditable active
            </span>
          </div>
          <button
            onClick={() => setKey((k) => k + 1)}
            className="border border-zinc-300 bg-zinc-50 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Reset Block ↺
          </button>
        </div>

        {/* The actual block — rendered via its .edit() + .save() interface */}
        <div className="space-y-0" key={key}>
          {/* Edit view (Gutenberg canvas simulation) */}
          <div className="border-2 border-dashed border-zinc-400 p-1">
            <div className="mb-1 flex items-center gap-1.5 px-1">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
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
          <div className="border-2 border-dashed border-green-400 p-1">
            <div className="mb-1 flex items-center gap-1.5 px-1">
              <span className="font-mono text-[9px] font-bold text-green-600 uppercase tracking-widest">
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
        <div className="mt-6 border-2 border-zinc-950 bg-zinc-50 p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-950 mb-2">
            🔍 What to verify:
          </p>
          <ul className="space-y-1.5 font-mono text-[11px] text-zinc-600">
            <li>✅ Clicking the <strong>heading</strong> in the edit() view opens inline text editing</li>
            <li>✅ Clicking the <strong>badge</strong> or <strong>CTA label</strong> also edits inline</li>
            <li>✅ The <strong>save() view</strong> below is static — no contentEditable cursor appears</li>
            <li>✅ Both panels render with <strong>identical styles</strong> (same Tailwind classes)</li>
            <li>✅ Hit <code className="bg-zinc-200 px-1">Reset Block ↺</code> to restore defaults</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
