import { useContext } from "react";
import { WpPostContext } from "./context";

/**
 * @forgewp/react — WordPress Data Hooks
 *
 * These hooks read from WpPostContext, which is provided by WpQueryLoop.
 *
 * In local dev: returns mock data from the context.
 * In WordPress production: the ForgeWP compiler replaces each hook call
 * with the equivalent PHP function (e.g. useWpTitle() → get_the_title()).
 *
 * Rules:
 * - Always call these inside a WpQueryLoop or WpLoop block.
 * - Never call these at the top level of your app (no WpPostContext = empty strings).
 * - Do not wrap in conditionals — standard React rules of hooks apply.
 */

// ── Content ───────────────────────────────────────────────────────────────────

export function useWpTitle(): string {
  const post = useContext(WpPostContext);
  return post?.title ?? "Sample WordPress Post Title";
}

export function useWpContent(): string {
  const post = useContext(WpPostContext);
  return (
    post?.content ??
    "<p>This is sample post content rendered locally so you can design your theme.</p>"
  );
}

export function useWpExcerpt(): string {
  const post = useContext(WpPostContext);
  return (
    post?.excerpt ??
    "A short excerpt that gives readers a quick preview of what to expect in the full post."
  );
}

export function useWpPermalink(): string {
  const post = useContext(WpPostContext);
  if (!post) return "/post";
  if (post.permalink) return post.permalink;
  const type = post.__postType && post.__postType !== "post" ? post.__postType : "post";
  return `/${type}/${post.id}`;
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export function useWpDate(): string {
  const post = useContext(WpPostContext);
  return (
    post?.date ??
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
}

export function useWpAuthor(): string {
  const post = useContext(WpPostContext);
  return post?.author ?? "Jane Doe";
}

export function useWpFeaturedImage(): string {
  const post = useContext(WpPostContext);
  return post?.featuredImage ?? "https://picsum.photos/seed/forgewp/1200/630";
}

// ── Custom Fields (ACF / Meta) ────────────────────────────────────────────────

export function useWpCustomField(fieldName: string, defaultValue = ""): string {
  const post = useContext(WpPostContext);
  console.log(`[ForgeWP Debug] useWpCustomField requested: ${fieldName}`);
  console.log(`[ForgeWP Debug] Context post:`, post);
  
  if (
    post?.customFields &&
    typeof post.customFields[fieldName] !== "undefined"
  ) {
    return String(post.customFields[fieldName]);
  }
  return defaultValue || `[custom field: ${fieldName}]`;
}
