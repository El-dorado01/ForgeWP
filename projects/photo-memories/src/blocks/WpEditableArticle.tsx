import { defineBlock, WpEditable } from "@forgewp/react";

/**
 * ⚡ ForgeWP Custom Gutenberg Block — "WpEditable Article Card"
 *
 * This block demonstrates <WpEditable> — the isomorphic inline editing primitive.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Gutenberg Editor  → compiler transpiles WpEditable to          │
 * │                       <RichText> for native inline editing.     │
 * │  Visitor Frontend  → compiler transpiles to static PHP HTML     │
 * │                       with proper esc_html() escaping.          │
 * │  Local Dev (Vite)  → renders as native contentEditable HTML     │
 * │                       allowing real-time editing directly        │
 * │                       in the preview canvas.                    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * HOW TO PREVIEW LOCALLY:
 * Navigate to http://localhost:5173/wp-editable to see the block
 * canvas render. Click the heading or body text to edit them inline.
 *
 * HOW TO TEST IN GUTENBERG:
 * Run `pnpm forgewp export` then install the ZIP in WordPress.
 * Find the block under "ForgeWP" in the block inserter.
 */
export default defineBlock({
  name: "wp-editable-article",
  title: "WpEditable Article Card",
  category: "text",
  icon: "edit",
  attributes: {
    heading:  { type: "string", default: "Enter article heading here" },
    body:     { type: "string", default: "Click to edit this paragraph. The WpEditable primitive gives you native inline editing in Gutenberg and contentEditable editing in local dev." },
    tag:      { type: "string", default: "Featured" },
    ctaLabel: { type: "string", default: "Read Article" },
  },

  /**
   * edit() — rendered inside the Gutenberg block editor canvas.
   * The compiler replaces <WpEditable> with Gutenberg's <RichText> component.
   */
  edit: ({ attributes, setAttributes }) => {
    return (
      <div className="border border-slate-100 bg-white shadow-xl shadow-slate-100/50 rounded-none relative overflow-hidden w-full max-w-xl mx-auto my-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-100/80">
        {/* Block editor header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/20 px-5 py-2.5">
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-slate-400">
            ⚡ WpEditable Article Card — Editor View
          </span>
          <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">
            forgewp/wp-editable-article
          </span>
        </div>

        <div className="p-8">
          {/* Tag badge — editable */}
          <WpEditable
            tagName="span"
            value={attributes.tag}
            onChange={(v) => setAttributes({ tag: v })}
            className="mb-5 inline-block cursor-text border border-primary/10 bg-primary/5 text-primary px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest outline-none focus:bg-primary/10 focus:border-primary/20 rounded-none"
          />

          {/* Heading — editable */}
          <WpEditable
            tagName="h2"
            value={attributes.heading}
            onChange={(v) => setAttributes({ heading: v })}
            className="mb-4 cursor-text text-2xl font-heading font-black leading-snug tracking-tight text-slate-900 outline-none focus:text-primary transition-colors"
          />

          {/* Body paragraph — editable */}
          <WpEditable
            tagName="p"
            value={attributes.body}
            onChange={(v) => setAttributes({ body: v })}
            className="mb-6 cursor-text text-slate-500 text-xs md:text-sm leading-relaxed outline-none focus:text-slate-900 transition-colors"
          />

          {/* CTA button — editable label */}
          <div className="inline-flex items-center">
            <WpEditable
              tagName="span"
              value={attributes.ctaLabel}
              onChange={(v) => setAttributes({ ctaLabel: v })}
              className="cursor-text inline-flex items-center justify-center bg-primary text-white font-mono font-black text-[10px] uppercase tracking-widest px-5 py-3.5 shadow-md shadow-primary/15 outline-none hover:shadow-lg focus:shadow-lg transition-all rounded-none"
            />
          </div>
        </div>
      </div>
    );
  },

  /**
   * save() — rendered as static HTML on the WordPress visitor frontend.
   * The compiler replaces <WpEditable> with plain HTML tags + PHP escaping.
   */
  save: ({ attributes }) => {
    return (
      <div className="border border-slate-100 bg-white shadow-xl shadow-slate-100/50 rounded-none relative overflow-hidden w-full max-w-xl mx-auto my-6">
        <div className="p-8">
          <span className="mb-5 inline-block border border-primary/10 bg-primary/5 text-primary px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest rounded-none">
            {attributes.tag}
          </span>
          <h2 className="mb-4 text-2xl font-heading font-black leading-snug tracking-tight text-slate-900">
            {attributes.heading}
          </h2>
          <p className="mb-6 text-slate-500 text-xs md:text-sm leading-relaxed">
            {attributes.body}
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center bg-primary text-white font-mono font-black text-[10px] uppercase tracking-widest px-5 py-3.5 shadow-md shadow-primary/15 transition-all hover:shadow-lg rounded-none"
          >
            {attributes.ctaLabel}
          </a>
        </div>
      </div>
    );
  },
});
