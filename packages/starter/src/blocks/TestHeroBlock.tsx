import { defineBlock } from "@forgewp/react";

/**
 * ⚡ ForgeWP Custom Gutenberg Block — "Sharp Test Hero Block"
 * 
 * HOW TO PREVIEW LOCALLY INSIDE REACT:
 * This block is defined using standard React structures. You can import this block and
 * preview its visitor/frontend layout locally in any React page or component without running
 * WordPress, by invoking its `.save()` component with mock attributes:
 * 
 * ```tsx
 * import TestHeroBlock from "@/blocks/TestHeroBlock";
 * 
 * <TestHeroBlock.save attributes={{
 *   title: "Mock Title Value",
 *   content: "Mock Content Value",
 *   ctaText: "Mock CtaText Value"
 * }} />
 * ```
 */
export default defineBlock({
  name: "test-hero-block",
  title: "Sharp Test Hero Block",
  category: "design",
  icon: "admin-post", // Choose icons from: https://developer.wordpress.org/resource/dashicons/
  attributes: {
    title: { type: "string", default: "Customize title here" },
    content: { type: "string", default: "Customize content here" },
    ctaText: { type: "string", default: "Customize ctaText here" }
  },
  edit: ({ attributes, setAttributes }) => {
    return (
      <div className="p-8 bg-white border-4 border-zinc-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none my-6 selection:bg-brand selection:text-white">
        <span className="inline-block bg-brand text-white text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 mb-4 border-2 border-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          Gutenberg Custom Block (Edit Mode)
        </span>
        <div className="space-y-4">
          <div className="border-2 border-zinc-950 p-4 bg-zinc-50 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <label className="block text-xs font-mono font-bold uppercase text-zinc-950 mb-1">Title</label>
            <input 
              type="text" 
              value={attributes.title} 
              onChange={(e) => setAttributes({ title: e.target.value })}
              className="w-full p-2 border-2 border-zinc-950 bg-white font-mono text-xs focus:ring-0 focus:outline-none focus:border-brand rounded-none" 
              placeholder="Enter Title..."
            />
          </div>
          <div className="border-2 border-zinc-950 p-4 bg-zinc-50 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <label className="block text-xs font-mono font-bold uppercase text-zinc-950 mb-1">Content</label>
            <textarea 
              value={attributes.content} 
              onChange={(e) => setAttributes({ content: e.target.value })}
              className="w-full p-2 border-2 border-zinc-950 bg-white font-mono text-xs focus:ring-0 focus:outline-none focus:border-brand rounded-none"
              rows={3}
              placeholder="Enter Content content..."
            />
          </div>
          <div className="border-2 border-zinc-950 p-4 bg-zinc-50 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <label className="block text-xs font-mono font-bold uppercase text-zinc-950 mb-1">CtaText</label>
            <input 
              type="text" 
              value={attributes.ctaText} 
              onChange={(e) => setAttributes({ ctaText: e.target.value })}
              className="w-full p-2 border-2 border-zinc-950 bg-white font-mono text-xs focus:ring-0 focus:outline-none focus:border-brand rounded-none" 
              placeholder="Enter CtaText..."
            />
          </div>
        </div>
      </div>
    );
  },
  save: ({ attributes }) => {
    return (
      <div className="p-8 bg-white border-4 border-zinc-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none my-6 selection:bg-brand selection:text-white">
        <span className="inline-block bg-brand text-white text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 mb-3 border-2 border-zinc-950">
          Gutenberg Custom Block
        </span>
        <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight leading-none mb-3">
          {attributes.title}
        </h3>
        <p className="text-sm text-zinc-600 font-medium font-sans leading-relaxed mb-3">
          {attributes.content}
        </p>
        <p className="text-sm text-zinc-600 font-medium font-sans leading-relaxed mb-3">
          {attributes.ctaText}
        </p>
      </div>
    );
  }
});
