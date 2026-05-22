import React from "react";
import { WpPostContext } from "../context";
import type { WpPost } from "../types";

export interface WpQueryLoopProps {
  /** Post type key — matches a key in your cms/mock-data.json */
  postType?: string;
  /** Number of posts to render */
  postsPerPage?: number;
  /** Optional category filter (reserved for compiler) */
  categoryName?: string;
  /** Optional ID filter for single views */
  postId?: number;
  /**
   * Posts data — injected by the data bridge in src/.forgewp/wordpress.tsx.
   * You do not need to pass this yourself; WpQueryLoop in your project handles it.
   */
  posts?: WpPost[];
  children: React.ReactNode;
}

/**
 * WpQueryLoop — Iterates over an array of WpPost objects and provides
 * each post to child hooks via WpPostContext.
 *
 * This component is framework-level infrastructure — it contains no
 * styling, no layout opinions, and no rendering assumptions.
 *
 * The ForgeWP compiler transforms this to a standard WordPress loop:
 *   while (have_posts()) { the_post(); ... }
 */
export function WpQueryLoop({
  postType = "post",
  postsPerPage = 3,
  postId,
  posts = [],
  children,
}: WpQueryLoopProps) {
  // Filter by ID if requested (for local single views), then slice and inject __postType
  const filteredPosts = postId ? posts.filter(p => p.id === postId) : posts;
  const items = filteredPosts.slice(0, postsPerPage).map(p => ({ ...p, __postType: postType }));

  if (items.length === 0) {
    // Fallback placeholders so the layout is always visible during dev
    const fallbacks: WpPost[] = Array.from({ length: postsPerPage }, (_, i) => ({
      id: i + 1,
      title: `Mock ${postType} ${i + 1}`,
      excerpt: "Placeholder excerpt — add entries to cms/mock-data.json.",
      content: "<p>Placeholder content.</p>",
      date: new Date().toLocaleDateString("en-US"),
      author: "Author",
      featuredImage: `https://picsum.photos/seed/${postType}${i}/1200/630`,
      __postType: postType,
    }));

    return (
      <>
        {fallbacks.map((post) => (
          <WpPostContext.Provider key={post.id} value={post}>
            {children}
          </WpPostContext.Provider>
        ))}
      </>
    );
  }

  return (
    <>
      {items.map((post) => (
        <WpPostContext.Provider key={post.id} value={post}>
          {children}
        </WpPostContext.Provider>
      ))}
    </>
  );
}
