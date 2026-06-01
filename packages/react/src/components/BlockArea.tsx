import React from "react";
import { WpPostContext } from "../context";

export interface BlockAreaProps {
  name: string;
}

/**
 * BlockArea — Bounded Gutenberg block inserts.
 *
 * In production the ForgeWP compiler replaces this with:
 *   <?php the_content(); ?>
 */
export function BlockArea({ name }: BlockAreaProps) {
  const post = React.useContext(WpPostContext);

  // Dev preview: show active post content if available, otherwise show a beautiful visual placeholder
  if (post && post.content) {
    return <div dangerouslySetInnerHTML={{ __html: post.content }} />;
  }

  return (
    <div className="w-full border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl p-8 my-6 text-center select-none">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
        ⚡ Gutenberg Block Area — {name}
      </span>
      <h3 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-tight mb-2">
        Editorial Block Slot
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        This area allows content managers to insert dynamic Gutenberg blocks (paragraphs, lists, galleries) directly from WordPress, while strictly preserving the surrounding React layout.
      </p>
    </div>
  );
}
