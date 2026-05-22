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
      <div className="my-6 border-4 border-zinc-950 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Block editor header bar */}
        <div className="flex items-center justify-between border-b-4 border-zinc-950 bg-zinc-950 px-4 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
            ⚡ WpEditable Article Card — Editor View
          </span>
          <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider">
            Block: forgewp/wp-editable-article
          </span>
        </div>

        <div className="p-8">
          {/* Tag badge — editable */}
          <WpEditable
            tagName="span"
            value={attributes.tag}
            onChange={(v) => setAttributes({ tag: v })}
            className="mb-5 inline-block cursor-text border-2 border-zinc-950 bg-brand px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-white"
          />

          {/* Heading — editable */}
          <WpEditable
            tagName="h2"
            value={attributes.heading}
            onChange={(v) => setAttributes({ heading: v })}
            className="mb-4 cursor-text text-3xl font-black leading-tight tracking-tight text-zinc-950 outline-none ring-1 ring-transparent transition-all focus:ring-brand"
          />

          {/* Body paragraph — editable */}
          <WpEditable
            tagName="p"
            value={attributes.body}
            onChange={(v) => setAttributes({ body: v })}
            className="mb-6 cursor-text text-sm leading-relaxed text-zinc-600 outline-none ring-1 ring-transparent transition-all focus:ring-brand"
          />

          {/* CTA button — editable label */}
          <div className="inline-flex items-center gap-3">
            <WpEditable
              tagName="span"
              value={attributes.ctaLabel}
              onChange={(v) => setAttributes({ ctaLabel: v })}
              className="cursor-text border-2 border-zinc-950 bg-zinc-950 px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-white outline-none"
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
      <div className="my-6 border-4 border-zinc-950 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-8">
          <span className="mb-5 inline-block border-2 border-zinc-950 bg-brand px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-white">
            {attributes.tag}
          </span>
          <h2 className="mb-4 text-3xl font-black leading-tight tracking-tight text-zinc-950">
            {attributes.heading}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-zinc-600">
            {attributes.body}
          </p>
          <a
            href="#"
            className="inline-block border-2 border-zinc-950 bg-zinc-950 px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-brand"
          >
            {attributes.ctaLabel}
          </a>
        </div>
      </div>
    );
  },
});
