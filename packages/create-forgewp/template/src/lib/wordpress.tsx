/**
 * ForgeWP WordPress Data Hooks
 *
 * These hooks provide mock data during local development (Vite dev server).
 * When the theme is exported, the ForgeWP compiler replaces every token
 * with the equivalent WordPress PHP function call.
 */
import React, { createContext, useContext } from "react";

// @ts-ignore
import mockData from "../../wordpress/mock-data.json";

const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  import.meta.env?.DEV === true;

// React context to support database-like query loops during local development
const WpPostContext = createContext<any>(null);

// ── Post content ─────────────────────────────────────────────────────────────

export function useWpTitle() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post?.title || "Sample WordPress Post Title";
  }
  return "__FORGEWP_THE_TITLE__";
}

export function useWpContent() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post?.content || "<p>This is sample post content rendered locally so you can design your theme. In WordPress, this is replaced by the actual content from the Gutenberg editor — including blocks, shortcodes, and embeds.</p>";
  }
  return "__FORGEWP_THE_CONTENT__";
}

export function useWpExcerpt() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post?.excerpt || "A short excerpt that gives readers a quick preview of what to expect in the full post.";
  }
  return "__FORGEWP_THE_EXCERPT__";
}

export function useWpPermalink() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post ? `/post/${post.id}` : "/post";
  }
  return "__FORGEWP_THE_PERMALINK__";
}

// ── Post meta ─────────────────────────────────────────────────────────────────

export function useWpDate() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post?.date || new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return "__FORGEWP_THE_DATE__";
}

export function useWpAuthor() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post?.author || "Jane Doe";
  }
  return "__FORGEWP_THE_AUTHOR__";
}

export function useWpFeaturedImage() {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    return post?.featuredImage || "https://picsum.photos/seed/forgewp/1200/630";
  }
  return "__FORGEWP_THE_POST_THUMBNAIL_URL__";
}

export function useWpCategories() {
  if (IS_DEV) {
    return '<a href="#">Technology</a>, <a href="#">Design</a>';
  }
  return "__FORGEWP_THE_CATEGORY_LIST__";
}

export function useWpArchiveTitle() {
  if (IS_DEV) return "Category: Technology";
  return "__FORGEWP_THE_ARCHIVE_TITLE__";
}

// ── Loop ──────────────────────────────────────────────────────────────────────

export function WpLoop({ children }: { children: React.ReactNode }) {
  if (IS_DEV) {
    const posts = mockData?.post || [
      { id: 1, title: "Mock Post 1" },
      { id: 2, title: "Mock Post 2" },
      { id: 3, title: "Mock Post 3" }
    ];
    
    return (
      <>
        {posts.map((post: any) => (
          <WpPostContext.Provider key={post.id} value={post}>
            {children}
          </WpPostContext.Provider>
        ))}
      </>
    );
  }

  return (
    <>
      {/* @ts-ignore */}
      <forgewp-loop-start />
      {children}
      {/* @ts-ignore */}
      <forgewp-loop-end />
    </>
  );
}

// ── Custom Field Mapping (ACF / Meta Fields) ──────────────────────────────────

export function useWpCustomField(fieldName: string, defaultValue: string = ""): string {
  if (IS_DEV) {
    const post = useContext(WpPostContext);
    if (post && post.customFields && typeof post.customFields[fieldName] !== "undefined") {
      return post.customFields[fieldName];
    }
    return defaultValue || "[Mock custom field: " + fieldName + "]";
  }
  return "__FORGEWP_CUSTOM_FIELD__" + fieldName + "__";
}

// ── Navigation Menu Component ──────────────────────────────────────────────────

export interface WpMenuProps {
  location?: "primary" | "footer" | "sidebar";
  className?: string;
  linkClassName?: string;
}

export function WpMenu({ location = "primary", className = "", linkClassName = "" }: WpMenuProps) {
  if (IS_DEV) {
    const mockItems = (mockData as any).menu?.[location] || [
      { title: "Home", url: "/" },
      { title: "Blog", url: "/post" },
      { title: "Archive", url: "/archive" },
    ];
    return (
      <nav className={className}>
        {mockItems.map((item, idx) => (
          <a key={idx} href={item.url} className={linkClassName}>
            {item.title}
          </a>
        ))}
      </nav>
    );
  }

  return (
    // @ts-ignore
    <forgewp-menu location={location} className={className} linkClassName={linkClassName} />
  );
}

// ── Custom Query Loop Component ───────────────────────────────────────────────

export interface WpQueryLoopProps {
  postType?: string;
  postsPerPage?: number;
  categoryName?: string;
  children: React.ReactNode;
}

export function WpQueryLoop({
  postType = "post",
  postsPerPage = 3,
  categoryName = "",
  children
}: WpQueryLoopProps) {
  if (IS_DEV) {
    const allPosts = (mockData as any)?.[postType] || [];
    const posts = allPosts.slice(0, postsPerPage);

    if (posts.length === 0) {
      const fallbacks = Array.from({ length: postsPerPage }).map((_, i) => ({
        id: i + 1,
        title: `Mock ${postType} ${i + 1}`,
      }));
      return (
        <>
          {fallbacks.map((post: any) => (
            <WpPostContext.Provider key={post.id} value={post}>
              {children}
            </WpPostContext.Provider>
          ))}
        </>
      );
    }

    return (
      <>
        {posts.map((post: any) => (
          <WpPostContext.Provider key={post.id} value={post}>
            {children}
          </WpPostContext.Provider>
        ))}
      </>
    );
  }

  return (
    <>
      {/* @ts-ignore */}
      <forgewp-query-loop-start postType={postType} postsPerPage={postsPerPage} categoryName={categoryName} />
      {children}
      {/* @ts-ignore */}
      <forgewp-query-loop-end />
    </>
  );
}

// ── Shortcodes Component ────────────────────────────────────────────────────────

export interface WpShortcodeProps {
  code: string;
}

export function WpShortcode({ code }: WpShortcodeProps) {
  if (IS_DEV) {
    return (
      <div className="p-4 bg-zinc-100 border-2 border-dashed border-zinc-400 font-mono text-xs text-zinc-600 rounded-none my-4">
        <span className="font-bold text-zinc-800">WordPress Shortcode Preview:</span> {code}
      </div>
    );
  }

  return (
    // @ts-ignore
    <forgewp-shortcode code={code} />
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "forgewp-menu": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          location?: "primary" | "footer" | "sidebar";
          linkClassName?: string;
        },
        HTMLElement
      >;
      "forgewp-query-loop-start": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          postType?: string;
          postsPerPage?: number;
          categoryName?: string;
        },
        HTMLElement
      >;
      "forgewp-query-loop-end": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "forgewp-shortcode": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          code?: string;
        },
        HTMLElement
      >;
    }
  }
}
