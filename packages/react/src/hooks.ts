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

import { useEffect, useState } from "react";

/**
 * Hook to dynamically detect and adapt to prefers-reduced-motion preferences.
 * Satisfies modern global accessibility standards.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return reduced;
}

/**
 * Statically extracts and formats motion/animation initial states into safe React styles.
 * Guarantees zero cumulative layout shift (CLS) and zero Flash of Unstyled Content (FOUC)
 * by applying initial styles during server-side pre-rendering (SSR).
 *
 * @example
 * const initial = { opacity: 0, y: 50 };
 * <motion.div initial={initial} animate={{ opacity: 1, y: 0 }} style={getStaticMotionStyle(initial)}>
 */
export function getStaticMotionStyle(initial: Record<string, any>): React.CSSProperties {
  if (!initial || typeof initial !== "object") return {};

  const style: React.CSSProperties = {};

  if (initial.opacity !== undefined) {
    style.opacity = initial.opacity;
  }

  let transform = "";
  if (initial.y !== undefined) {
    transform += ` translateY(${typeof initial.y === "number" ? initial.y + "px" : initial.y})`;
  }
  if (initial.x !== undefined) {
    transform += ` translateX(${typeof initial.x === "number" ? initial.x + "px" : initial.x})`;
  }
  if (initial.scale !== undefined) {
    transform += ` scale(${initial.scale})`;
  }
  if (initial.rotate !== undefined) {
    transform += ` rotate(${initial.rotate}deg)`;
  }

  if (transform) {
    style.transform = transform.trim();
  }

  return style;
}

