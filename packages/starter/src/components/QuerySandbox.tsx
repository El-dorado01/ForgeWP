import { useState } from "react";
import {
  useWpOption,
  useWpThemeMod,
  useWpQuery,
  WpImage,
} from "../.forgewp/wordpress";

export function QuerySandbox() {
  // 1. Read WordPress Option & Theme Mod values
  const blogName = useWpOption("blogname", "ForgeWP Demo Site");
  const blogDesc = useWpOption("blogdescription", "A modern WordPress site.");
  const footerText = useWpThemeMod("footer_text", "Theme mods offline fallback.");

  // 2. State for search query and post type selection
  const [searchTerm, setSearchTerm] = useState("");
  const [postType, setPostType] = useState("post");

  // 3. Invoke the Isomorphic Query Hook
  const { posts, loading, error, hasMore, loadMore, refetch } = useWpQuery({
    postType,
    postsPerPage: 2,
    s: searchTerm,
  });

  return (
    <div className="border-4 border-zinc-950 bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-zinc-950 font-sans">
      {/* Options & Customizer Preview Bar */}
      <div className="border-2 border-zinc-950 bg-brand-light p-4 mb-6 font-mono text-xs">
        <span className="block text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-2">
          ⚙️ WordPress Global Site Settings (State Hooks)
        </span>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-zinc-950/20 p-2 bg-white/50">
            <span className="block text-[9px] text-zinc-500 font-bold">Option: blogname</span>
            <span className="font-bold text-zinc-900">{blogName}</span>
          </div>
          <div className="border border-zinc-950/20 p-2 bg-white/50">
            <span className="block text-[9px] text-zinc-500 font-bold">Option: blogdescription</span>
            <span className="font-bold text-zinc-900">{blogDesc}</span>
          </div>
          <div className="border border-zinc-950/20 p-2 bg-white/50 md:col-span-2">
            <span className="block text-[9px] text-zinc-500 font-bold">Theme Mod: footer_text</span>
            <span className="font-bold text-zinc-900">{footerText}</span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="border-2 border-zinc-950 bg-zinc-50 p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search Query Input */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
            Search keyword
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type keyword..."
            className="border-2 border-zinc-950 px-3 py-2 text-sm font-mono focus:bg-brand-light focus:outline-none transition-colors"
          />
        </div>

        {/* Post Type Selector */}
        <div className="w-full md:w-48 flex flex-col gap-1.5">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
            Post Type
          </label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            className="border-2 border-zinc-950 px-3 py-2 text-sm font-mono bg-white focus:outline-none"
          >
            <option value="post">Posts (post)</option>
            <option value="project">Projects (project)</option>
          </select>
        </div>

        {/* Reset / Refetch Button */}
        <div className="flex items-end">
          <button
            onClick={() => refetch()}
            className="border-2 border-zinc-950 bg-zinc-950 text-white font-bold text-sm tracking-wide uppercase px-5 py-2.5 hover:bg-brand transition-colors active:translate-y-0.5"
          >
            Refetch
          </button>
        </div>
      </div>

      {/* Query Status Panel */}
      <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 border-b border-zinc-200 pb-3 mb-4">
        <span>Posts Found: {posts.length}</span>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="inline-block w-2.5 h-2.5 bg-yellow-500 animate-pulse rounded-full"></span>
          )}
          <span>{loading ? "Fetching REST API..." : "Data Synced"}</span>
        </div>
      </div>

      {/* Query Execution Error Display */}
      {error && (
        <div className="border-2 border-red-500 bg-red-50 text-red-700 px-4 py-3 text-xs font-mono font-bold mb-4">
          ⚠️ Error: {error}
        </div>
      )}

      {/* Dynamic Results Grid */}
      {posts.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-8 text-center text-zinc-400 font-mono text-xs">
          No records match your query parameters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.id}
              className="border-2 border-zinc-950 p-4 bg-zinc-50 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <div>
                {/* Featured Thumbnail */}
                <div className="aspect-[16/9] border-2 border-zinc-950 overflow-hidden mb-3.5 relative bg-zinc-200">
                  {typeof post.featuredImage === "string" ? (
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <WpImage
                      id={post.featuredImage?.id}
                      size="medium"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute bottom-2 left-2 bg-zinc-950 text-white font-mono text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                    ID: {post.id}
                  </span>
                </div>

                <h3 className="font-serif font-black text-base text-zinc-950 leading-snug mb-1.5 uppercase hover:text-brand transition-colors">
                  {post.title}
                </h3>
                
                {/* Meta details */}
                <div className="flex flex-wrap gap-2 text-[9px] font-mono text-zinc-400 font-bold uppercase mb-3">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                </div>

                <p
                  className="text-xs text-zinc-600 leading-relaxed font-medium mb-4"
                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                ></p>
              </div>

              {/* Client fields check */}
              {post.customFields && Object.keys(post.customFields).length > 0 && (
                <div className="border-t border-zinc-200 pt-3 mt-auto font-mono text-[9px] text-zinc-500">
                  <span className="block font-black text-zinc-700 uppercase mb-1">Custom Fields:</span>
                  {Object.entries(post.customFields).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className="font-bold text-zinc-900">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Infinite Scroll / Load More Action Panel */}
      {hasMore && (
        <div className="mt-8 pt-6 border-t-2 border-zinc-950 flex justify-center">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="border-2 border-zinc-950 bg-white font-black text-xs uppercase tracking-widest px-8 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
          >
            {loading ? "Loading Page..." : "Load More Posts"}
          </button>
        </div>
      )}
    </div>
  );
}
