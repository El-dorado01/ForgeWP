/**
 * ForgeWP WordPress Data Hooks
 *
 * These hooks provide mock data during local development (Vite dev server).
 * When the theme is exported, the ForgeWP compiler replaces every token
 * with the equivalent WordPress PHP function call.
 *
 * ── Available hooks ────────────────────────────────────────────────────────
 *  useWpTitle()          → the_title() / get_the_title()
 *  useWpContent()        → the_content()
 *  useWpExcerpt()        → the_excerpt()
 *  useWpPermalink()      → get_permalink()
 *  useWpDate()           → get_the_date()
 *  useWpAuthor()         → get_the_author()
 *  useWpFeaturedImage()  → get_the_post_thumbnail_url()
 *  useWpCategories()     → the_category()
 *  useWpArchiveTitle()   → the_archive_title()
 *  WpLoop                → while ( have_posts() ) : the_post();
 * ──────────────────────────────────────────────────────────────────────────
 */
import React from "react";

const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  import.meta.env?.DEV === true;

// ── Post content ─────────────────────────────────────────────────────────────

export function useWpTitle() {
  if (IS_DEV) return "Sample WordPress Post Title";
  return "__FORGEWP_THE_TITLE__";
}

export function useWpContent() {
  if (IS_DEV) {
    return "<p>This is sample post content rendered locally so you can design your theme. In WordPress, this is replaced by the actual content from the Gutenberg editor — including blocks, shortcodes, and embeds.</p><p>You can style this area using the <code>.prose</code> utility or any Tailwind class you like.</p>";
  }
  return "__FORGEWP_THE_CONTENT__";
}

export function useWpExcerpt() {
  if (IS_DEV) {
    return "A short excerpt that gives readers a quick preview of what to expect in the full post. ForgeWP replaces this with the_excerpt() on export.";
  }
  return "__FORGEWP_THE_EXCERPT__";
}

export function useWpPermalink() {
  if (IS_DEV) return "/post";
  return "__FORGEWP_THE_PERMALINK__";
}

// ── Post meta ─────────────────────────────────────────────────────────────────

/** Returns the formatted post date. Maps to get_the_date() in WordPress. */
export function useWpDate() {
  if (IS_DEV) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return "__FORGEWP_THE_DATE__";
}

/** Returns the post author's display name. Maps to get_the_author() in WordPress. */
export function useWpAuthor() {
  if (IS_DEV) return "Jane Doe";
  return "__FORGEWP_THE_AUTHOR__";
}

/**
 * Returns the featured image URL (large size).
 * Maps to get_the_post_thumbnail_url(null, 'large') in WordPress.
 *
 * In dev, returns a placeholder image from picsum.photos.
 * In your JSX, use it as: <img src={featuredImage} alt={title} />
 */
export function useWpFeaturedImage() {
  if (IS_DEV) return "https://picsum.photos/seed/forgewp/1200/630";
  return "__FORGEWP_THE_POST_THUMBNAIL_URL__";
}

/**
 * Returns the post's categories as an HTML string (links separated by commas).
 * Maps to the_category(', ') in WordPress.
 *
 * Use with dangerouslySetInnerHTML since it contains anchor tags.
 * @example
 * const categories = useWpCategories();
 * <div dangerouslySetInnerHTML={{ __html: categories }} />
 */
export function useWpCategories() {
  if (IS_DEV) {
    return '<a href="#">Technology</a>, <a href="#">Design</a>';
  }
  return "__FORGEWP_THE_CATEGORY_LIST__";
}

/**
 * Returns the archive page title (e.g. "Category: Technology", "Tag: React").
 * Maps to the_archive_title() in WordPress.
 * Use this in archive.tsx — not needed for single posts.
 */
export function useWpArchiveTitle() {
  if (IS_DEV) return "Category: Technology";
  return "__FORGEWP_THE_ARCHIVE_TITLE__";
}

// ── Loop ──────────────────────────────────────────────────────────────────────

/**
 * `<WpLoop>` — Renders a WordPress post loop.
 *
 * In dev: renders your children 3 times with mock data so you can design your layout.
 * On export: wraps your JSX in a real `while (have_posts()) : the_post();` PHP loop.
 *
 * @example
 * <WpLoop>
 *   <PostCard />
 * </WpLoop>
 */
export function WpLoop({ children }: { children: React.ReactNode }) {
  if (IS_DEV) {
    // Render 3 dummy posts so the developer can design the grid/list layout
    return (
      <>
        {children}
        {children}
        {children}
      </>
    );
  }

  // In production: custom elements become compiler tokens → PHP loop
  return (
    <>
      {/* @ts-ignore — custom elements used as ForgeWP compiler tokens */}
      <forgewp-loop-start />
      {children}
      {/* @ts-ignore */}
      <forgewp-loop-end />
    </>
  );
}
