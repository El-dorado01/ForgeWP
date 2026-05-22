/**
 * System File Blueprints — ForgeWP Compiler
 *
 * These are fallback templates used by the compiler's self-healing preflight check.
 * If a developer accidentally deletes a system-critical library file,
 * the compiler will automatically recreate it to prevent compilation and runtime errors.
 */

export const SYSTEM_BLUEPRINTS = {
  'cms/menus.json': `{
  "_comment": "⚡ ForgeWP Navigation Menus — Edit this file to add/remove links in local dev. Run 'pnpm forgewp sync:routes' to auto-scaffold corresponding React pages!",
  "primary": [
    { "title": "Home", "url": "/" },
    { "title": "New", "url": "/new" },
    { "title": "Men", "url": "/men" },
    { "title": "Women", "url": "/women" }
  ],
  "utility": [
    { "title": "Help", "url": "/help" },
    { "title": "Sign In", "url": "/login" }
  ]
}`,

  'cms/mock-data.json': `{
  "post": [
    {
      "id": 1,
      "title": "Welcome to ForgeWP: The Headless Revolution",
      "excerpt": "Discover how ForgeWP bridges standard WordPress themes with blistering fast React architectures.",
      "content": "<p>This is the first mock post. In local dev, you can modify <code>cms/mock-data.json</code> to test layout content changes.</p>",
      "date": "2026-05-10T09:00:00Z",
      "author": "Antigravity",
      "featuredImage": {
        "id": 101,
        "url": "https://picsum.photos/seed/forgewp/1200/630",
        "alt": "ForgeWP Logo and Brand Artwork",
        "title": "ForgeWP Logo",
        "caption": "A high-fidelity minimalist logo graphic.",
        "width": 1200,
        "height": 630,
        "sizes": {
          "thumbnail": { "url": "https://picsum.photos/seed/forgewp/150/150", "width": 150, "height": 150 },
          "medium":    { "url": "https://picsum.photos/seed/forgewp/300/300", "width": 300, "height": 300 },
          "large":     { "url": "https://picsum.photos/seed/forgewp/1024/768", "width": 1024, "height": 768 }
        }
      },
      "customFields": { "read_time": "5" },
      "_terms": {
        "category": [
          { "id": 1, "slug": "tutorials", "name": "Tutorials" },
          { "id": 2, "slug": "framework",  "name": "Framework" }
        ],
        "post_tag": [
          { "id": 10, "slug": "react",     "name": "React" },
          { "id": 11, "slug": "wordpress", "name": "WordPress" }
        ]
      }
    },
    {
      "id": 2,
      "title": "Unlocking Brutalist Web Design Aesthetics",
      "excerpt": "A deep dive into high-contrast grids, sharp corners, and premium flat shadows in modern interfaces.",
      "content": "<p>This is the second mock post. Style these grids using beautiful Tailwind utilities.</p>",
      "date": "2026-05-12T14:30:00Z",
      "author": "DeepMind Partner",
      "featuredImage": "https://picsum.photos/seed/brutalist/1200/630",
      "customFields": { "read_time": "8" },
      "_terms": {
        "category": [
          { "id": 3, "slug": "design", "name": "Design" },
          { "id": 4, "slug": "css",    "name": "CSS" }
        ],
        "post_tag": [
          { "id": 12, "slug": "brutalism", "name": "Brutalism" },
          { "id": 13, "slug": "tailwind",  "name": "Tailwind" }
        ]
      }
    }
  ],
  "project": [
    {
      "id": 1,
      "title": "ForgeWP Scaffolding Platform",
      "excerpt": "Building a custom compiler framework to transpile React elements into standard PHP themes.",
      "content": "<p>Detailed description of the ForgeWP compiler pipeline project.</p>",
      "date": "2026-05-15T12:00:00Z",
      "author": "Lead Architect",
      "featuredImage": "https://picsum.photos/seed/platform/1200/630",
      "customFields": {
        "client_name": "El Dorado",
        "project_budget": "45000",
        "status": "active"
      },
      "_terms": {
        "project_type": [{ "id": 20, "slug": "open-source", "name": "Open Source" }],
        "technology":   [{ "id": 30, "slug": "react", "name": "React" }]
      }
    },
    {
      "id": 2,
      "title": "Brutalist Starter Theme",
      "excerpt": "A clean, responsive, and robust high-contrast interface leveraging Tailwind CSS v4.",
      "content": "<p>A brutalist theme showcasing raw black borders and vivid accent colors.</p>",
      "date": "2026-05-16T16:00:00Z",
      "author": "Theme Engineer",
      "featuredImage": "https://picsum.photos/seed/starter/1200/630",
      "customFields": {
        "client_name": "ForgeWP Community",
        "project_budget": "0",
        "status": "completed"
      },
      "_terms": {
        "project_type": [{ "id": 20, "slug": "open-source", "name": "Open Source" }],
        "technology":   [{ "id": 32, "slug": "tailwind", "name": "Tailwind CSS" }]
      }
    }
  ],
  "attachment": [
    {
      "id": 101,
      "url": "https://picsum.photos/seed/forgewp/1200/630",
      "alt": "ForgeWP Logo and Brand Artwork",
      "title": "ForgeWP Logo",
      "caption": "A high-fidelity minimalist logo graphic.",
      "width": 1200,
      "height": 630,
      "sizes": {
        "thumbnail": { "url": "https://picsum.photos/seed/forgewp/150/150", "width": 150, "height": 150 },
        "medium":    { "url": "https://picsum.photos/seed/forgewp/300/300", "width": 300, "height": 300 },
        "large":     { "url": "https://picsum.photos/seed/forgewp/1024/768", "width": 1024, "height": 768 }
      }
    },
    {
      "id": 102,
      "url": "https://picsum.photos/seed/layout/1200/800",
      "alt": "Brutalist Layout Preview",
      "title": "Layout Preview",
      "width": 1200,
      "height": 800,
      "sizes": {
        "thumbnail": { "url": "https://picsum.photos/seed/layout/150/150", "width": 150, "height": 150 },
        "medium":    { "url": "https://picsum.photos/seed/layout/300/300", "width": 300, "height": 300 }
      }
    }
  ]
}`,

  'src/.forgewp/forgewp-config.ts': `export interface ColorPreset {
  name: string;
  slug: string;
  color: string;
}

export interface FontSizePreset {
  name: string;
  slug: string;
  size: string;
}

export interface FontFamilyPreset {
  name: string;
  slug: string;
  fontFamily: string;
}

export interface ForgeWPThemeConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  textDomain: string;
  /** Design aesthetic style — "forgewp" (sharp edges, high-contrast) or "shadcn" (smooth rounded modern) */
  style?: "forgewp" | "shadcn";
  // Design Tokens (Phase 5)
  settings?: {
    layout?: {
      contentSize?: string;
      wideSize?: string;
    };
    color?: {
      palette?: ColorPreset[];
      custom?: boolean;
    };
    typography?: {
      fontSizes?: FontSizePreset[];
      fontFamilies?: FontFamilyPreset[];
      googleFonts?: string[];
    };
  };
}
`,

  'src/.forgewp/wordpress.tsx': `/**
 * ForgeWP WordPress Data Hooks
 *
 * These hooks provide mock data during local development (Vite dev server).
 * When the theme is exported, the ForgeWP compiler replaces every token
 * with the equivalent WordPress PHP function call.
 */
import React from "react";

// @ts-ignore
import mockData from "../../cms/mock-data.json";
// @ts-ignore
import menusData from "../../cms/menus.json";
// @ts-ignore
import siteSettings from "../../cms/site-settings.json";

import {
  WpQueryLoop as _WpQueryLoop,
  WpMenu as _WpMenu,
  WpShortcode as _WpShortcode,
  useWpTitle as _useWpTitle,
  useWpContent as _useWpContent,
  useWpExcerpt as _useWpExcerpt,
  useWpPermalink as _useWpPermalink,
  useWpDate as _useWpDate,
  useWpAuthor as _useWpAuthor,
  useWpFeaturedImage as _useWpFeaturedImage,
  useWpCustomField as _useWpCustomField,
  useWpOption as _useWpOption,
  useWpThemeMod as _useWpThemeMod,
  useWpQuery as _useWpQuery,
  WpHead as _WpHead,
  WpImage as _WpImage,
} from "@forgewp/react";
import type {
  WpQueryLoopProps,
  WpMenuProps,
  WpHeadProps,
  WpImageProps,
  WpAttachment,
  WpQueryArgs,
  WpQueryResults,
  WpPost,
  WpShortcodeProps,
} from "@forgewp/react";

const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  import.meta.env?.DEV === true;

if (IS_DEV) {
  if (typeof window !== "undefined") {
    (window as any)._forgeWpMockSiteSettings = siteSettings;
    (window as any)._forgeWpMockPosts = mockData;
  }
}

// ── Re-export pure hooks with compiler token fallbacks ────────────────────────
// In dev: @forgewp/react hook returns the mock value from WpPostContext.
// In prod: compiler replaces the call with the PHP equivalent below.

export function useWpTitle(): string {
  if (IS_DEV) return _useWpTitle();
  return "__FORGEWP_THE_TITLE__";
}
export function useWpContent(): string {
  if (IS_DEV) return _useWpContent();
  return "__FORGEWP_THE_CONTENT__";
}
export function useWpExcerpt(): string {
  if (IS_DEV) return _useWpExcerpt();
  return "__FORGEWP_THE_EXCERPT__";
}
export function useWpPermalink(): string {
  if (IS_DEV) return _useWpPermalink();
  return "__FORGEWP_THE_PERMALINK__";
}
export function useWpDate(): string {
  if (IS_DEV) return _useWpDate();
  return "__FORGEWP_THE_DATE__";
}
export function useWpAuthor(): string {
  if (IS_DEV) return _useWpAuthor();
  return "__FORGEWP_THE_AUTHOR__";
}
export function useWpFeaturedImage(): string {
  if (IS_DEV) return _useWpFeaturedImage();
  return "__FORGEWP_THE_POST_THUMBNAIL_URL__";
}
export function useWpCustomField(fieldName: string, defaultValue = ""): string {
  if (IS_DEV) return _useWpCustomField(fieldName, defaultValue);
  return "__FORGEWP_CUSTOM_FIELD__" + fieldName + "__";
}

export function useWpOption(optionName: string, defaultValue = ""): string {
  if (IS_DEV) return _useWpOption(optionName, defaultValue);
  return defaultValue
    ? \`__FORGEWP_OPTION_\${optionName}_DEFAULT_\${encodeURIComponent(defaultValue)}__\`
    : \`__FORGEWP_OPTION_\${optionName}__\`;
}

export function useWpThemeMod(modName: string, defaultValue = ""): string {
  if (IS_DEV) return _useWpThemeMod(modName, defaultValue);
  return defaultValue
    ? \`__FORGEWP_THEME_MOD_\${modName}_DEFAULT_\${encodeURIComponent(defaultValue)}__\`
    : \`__FORGEWP_THEME_MOD_\${modName}__\`;
}

export function useWpQuery(args: WpQueryArgs = {}): WpQueryResults {
  if (IS_DEV) {
    return _useWpQuery(args);
  }

  // ── Node SSR (Compile-time static render) ─────────────────────────────────
  // Runs a high-fidelity in-memory relational query against mock-data.json.
  // Supports taxQuery, metaQuery, ISO date sorting, and correct page slicing.
  if (typeof window === "undefined") {
    const {
      postType = "post",
      postsPerPage = 10,
      categoryName = "",
      s = "",
      paged = 1,
      orderby = "date",
      order = "DESC",
      taxQuery = [],
      metaQuery = [],
      metaRelation = "AND",
    } = args;

    const mockDb = (mockData as any)?.[postType] || [];
    let filtered = [...mockDb];

    // 1. Full-text search
    if (s) {
      const q = s.toLowerCase();
      filtered = filtered.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q)) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q))
      );
    }

    // 2. Legacy categoryName (slug match against _terms.category)
    if (categoryName) {
      const catSlug = categoryName.toLowerCase();
      filtered = filtered.filter(p => {
        if (p._terms?.category) {
          return p._terms.category.some((c: any) =>
            (typeof c === "string" && c.toLowerCase() === catSlug) ||
            (typeof c === "object" && c.slug?.toLowerCase() === catSlug)
          );
        }
        return JSON.stringify(p.customFields || {}).toLowerCase().includes(catSlug);
      });
    }

    // 3. taxQuery — relational taxonomy/term joins
    for (const tq of taxQuery) {
      const { taxonomy, field = "slug", terms } = tq as any;
      const termList: any[] = Array.isArray(terms) ? terms : [terms];
      filtered = filtered.filter(p => {
        const postTerms: any[] = p._terms?.[taxonomy] || [];
        return termList.some(t =>
          postTerms.some((pt: any) => {
            if (typeof pt === "string") return pt === String(t);
            return String(pt[field] ?? pt.slug ?? pt) === String(t);
          })
        );
      });
    }

    // 4. metaQuery — custom field relational filters
    if (metaQuery.length > 0) {
      filtered = filtered.filter(p => {
        const cf = p.customFields || {};
        const check = (cond: any) => {
          const { key, value, compare = "=" } = cond;
          if (compare === "EXISTS") return key in cf;
          if (compare === "NOT EXISTS") return !(key in cf);
          if (!(key in cf)) return false;
          const fv = cf[key];
          if (compare === "LIKE") return String(fv).toLowerCase().includes(String(value ?? "").toLowerCase());
          const a: any = isNaN(Number(fv)) ? String(fv) : Number(fv);
          const b: any = isNaN(Number(value)) ? String(value ?? "") : Number(value ?? 0);
          if (compare === "=")  return a == b;
          if (compare === "!=") return a != b;
          if (compare === ">")  return a > b;
          if (compare === ">=") return a >= b;
          if (compare === "<")  return a < b;
          if (compare === "<=") return a <= b;
          return false;
        };
        return metaRelation === "OR"
          ? (metaQuery as any[]).some(check)
          : (metaQuery as any[]).every(check);
      });
    }

    // 5. Sort (UNIX timestamp for dates)
    filtered.sort((a, b) => {
      let valA: any = (a as any)[orderby] ?? "";
      let valB: any = (b as any)[orderby] ?? "";
      if (orderby === "date" || orderby === "modified") {
        valA = new Date(a.date || 0).getTime();
        valB = new Date(b.date || 0).getTime();
      }
      if (order === "DESC") return valA < valB ? 1 : valA > valB ? -1 : 0;
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    });

    // 6. Paginate (page-slice: only page N)
    const total = filtered.length;
    const start = (paged - 1) * postsPerPage;
    const end = start + postsPerPage;
    const pageItems = filtered.slice(start, end);

    return {
      posts: pageItems,
      loading: false,
      error: null,
      hasMore: end < total,
      loadMore: async () => {},
      refetch: async () => {},
    };
  }

  // ── Browser Production Client — fetch from WordPress REST API ────────────
  const {
    postType = "post",
    postsPerPage = 10,
    categoryName = "",
    s = "",
    paged = 1,
    orderby = "date",
    order = "DESC",
  } = args;

  const [posts, setPosts] = React.useState<WpPost[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(paged);
  const [hasMore, setHasMore] = React.useState(true);

  // Track previous arguments to reset page and posts synchronously on change
  const [prevParams, setPrevParams] = React.useState({
    postType,
    postsPerPage,
    categoryName,
    s,
    orderby,
    order,
  });

  const paramsChanged =
    prevParams.postType !== postType ||
    prevParams.postsPerPage !== postsPerPage ||
    prevParams.categoryName !== categoryName ||
    prevParams.s !== s ||
    prevParams.orderby !== orderby ||
    prevParams.order !== order;

  if (paramsChanged) {
    setPrevParams({ postType, postsPerPage, categoryName, s, orderby, order });
    setCurrentPage(1);
    setPosts([]);
  }

  const executeProdQuery = React.useCallback(async (page: number) => {
    setLoading(true);
    try {
      const endpoint = postType === "post" ? "posts" : postType === "page" ? "pages" : postType;
      const params = new URLSearchParams();
      params.append("per_page", String(postsPerPage));
      params.append("page", String(page));
      params.append("_embed", "1");
      if (s) {
        params.append("search", s);
      }
      if (orderby) {
        params.append("orderby", orderby === "date" ? "date" : orderby);
      }
      if (order) {
        params.append("order", order.toLowerCase());
      }
      if (categoryName) {
        params.append("category_name", categoryName);
      }
      
      const response = await fetch(\`/wp-json/wp/v2/\${endpoint}?\${params.toString()}\`);
      if (!response.ok) {
        throw new Error(\`WordPress API returned \${response.status}: \${response.statusText}\`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format from WordPress API");
      }
      
      const mappedPosts: WpPost[] = data.map((wp: any) => {
        let featuredImage = "https://picsum.photos/seed/forgewp/1200/630";
        if (wp._embedded && wp._embedded["wp:featuredmedia"] && wp._embedded["wp:featuredmedia"][0]) {
          const media = wp._embedded["wp:featuredmedia"][0];
          featuredImage = media.source_url || featuredImage;
        } else if (wp.featured_media_src_url) {
          featuredImage = wp.featured_media_src_url;
        }
        
        return {
          id: wp.id,
          title: typeof wp.title === "object" ? wp.title.rendered : wp.title || "",
          excerpt: typeof wp.excerpt === "object" ? wp.excerpt.rendered : wp.excerpt || "",
          content: typeof wp.content === "object" ? wp.content.rendered : wp.content || "",
          date: wp.date ? new Date(wp.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "",
          author: wp._embedded && wp._embedded["author"] && wp._embedded["author"][0] ? wp._embedded["author"][0].name : "Admin",
          featuredImage,
          permalink: wp.link,
          customFields: wp.acf || wp.meta || {},
          __postType: wp.type || postType
        };
      });
      
      const totalPagesHeader = response.headers.get("X-WP-TotalPages");
      const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;
      
      if (page === 1) {
        setPosts(mappedPosts);
      } else {
        setPosts(prev => [...prev, ...mappedPosts]);
      }
      setHasMore(page < totalPages && mappedPosts.length > 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch from WordPress API");
    } finally {
      setLoading(false);
    }
  }, [postType, postsPerPage, categoryName, s, orderby, order]);

  React.useEffect(() => {
    executeProdQuery(currentPage);
  }, [executeProdQuery, currentPage]);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
  }, [currentPage, loading, hasMore]);

  const refetch = React.useCallback(async () => {
    setCurrentPage(1);
    executeProdQuery(1);
  }, [executeProdQuery]);

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

export function useWpCategories(): string {
  if (IS_DEV) return '<a href="#">Technology</a>, <a href="#">Design</a>';
  return "__FORGEWP_THE_CATEGORY_LIST__";
}
export function useWpArchiveTitle(): string {
  if (IS_DEV) return "Category: Technology";
  return "__FORGEWP_THE_ARCHIVE_TITLE__";
}

// ── WpQueryLoop — data bridge wraps @forgewp/react with mock data ─────────────

export function WpQueryLoop({
  postType = "post",
  postsPerPage = 3,
  categoryName = "",
  children,
}: WpQueryLoopProps) {
  if (IS_DEV) {
    const posts = (mockData as any)?.[postType] || [];
    return (
      <_WpQueryLoop posts={posts} postType={postType} postsPerPage={postsPerPage} categoryName={categoryName}>
        {children}
      </_WpQueryLoop>
    );
  }

  // Production: compiler transforms these custom elements into WordPress loop PHP
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

// ── WpLoop — simple all-posts loop (no postType arg) ─────────────────────────

export function WpLoop({ children }: { children: React.ReactNode }) {
  if (IS_DEV) {
    const posts = (mockData as any)?.post || [];
    return (
      <_WpQueryLoop posts={posts}>
        {children}
      </_WpQueryLoop>
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

// ── WpMenu — data bridge wraps @forgewp/react with menus.json ────────────────

export function WpMenu({ location = "primary", className = "", linkClassName = "" }: WpMenuProps) {
  if (IS_DEV) {
    const items =
      (menusData as any)?.[location] ||
      (mockData as any).menu?.[location] ||
      [{ title: "Home", url: "/" }, { title: "Blog", url: "/post" }];
    return <_WpMenu items={items} location={location} className={className} linkClassName={linkClassName} />;
  }

  // Production: compiler transforms this into wp_nav_menu()
  return (
    // @ts-ignore
    <forgewp-menu location={location} className={className} linkClassName={linkClassName} />
  );
}

// ── WpShortcode ──────────────────────────────────────────────────────────────
export function WpShortcode({ code }: WpShortcodeProps) {
  if (IS_DEV) {
    return <_WpShortcode code={code} />;
  }
  return (
    // @ts-ignore
    <forgewp-shortcode code={code} />
  );
}

export function WpHead(props: WpHeadProps) {
  if (IS_DEV) {
    return <_WpHead {...props} />;
  }
  return (
    // @ts-ignore
    <forgewp-head
      data-title={props.title}
      data-description={props.description}
      data-keywords={props.keywords}
      data-og-title={props.ogTitle}
      data-og-description={props.ogDescription}
      data-og-image={props.ogImage}
      data-og-type={props.ogType}
      data-twitter-card={props.twitterCard}
      data-twitter-creator={props.twitterCreator}
      data-canonical={props.canonical}
    />
  );
}
export type { WpHeadProps, WpImageProps, WpAttachment };

export function WpImage(props: WpImageProps) {
  if (IS_DEV) {
    const attachments = (mockData as any)?.attachment || [];
    return <_WpImage {...props} attachments={attachments} />;
  }
  return <_WpImage {...props} />;
}

// ── Compiler custom element JSX declarations ──────────────────────────────────

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "forgewp-menu": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            location?: "primary" | "footer" | "sidebar" | string;
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
        "forgewp-loop-start": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        "forgewp-loop-end": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        "forgewp-shortcode": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            code?: string;
          },
          HTMLElement
        >;
        "forgewp-head": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            "data-title"?: string;
            "data-description"?: string;
            "data-keywords"?: string;
            "data-og-title"?: string;
            "data-og-description"?: string;
            "data-og-image"?: string;
            "data-og-type"?: string;
            "data-twitter-card"?: string;
            "data-twitter-creator"?: string;
            "data-canonical"?: string;
          },
          HTMLElement
        >;
        "forgewp-image": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            "data-id"?: string;
            "data-field"?: string;
            "data-size"?: string;
            "data-class-name"?: string;
            "data-alt"?: string;
          },
          HTMLElement
        >;
      }
    }
  }
}
`,

  'src/.forgewp/SEO.tsx': `import * as React from "react";
import * as ReactHelmetAsync from "react-helmet-async";
import { useWpTitle } from "./wordpress";

const defaultKey = "default";
const ReactHelmetLib = (ReactHelmetAsync as any).Helmet
  ? ReactHelmetAsync
  : (ReactHelmetAsync as any)[defaultKey] ?? ReactHelmetAsync;
const Helmet = (ReactHelmetLib as any).Helmet || React.Fragment;

/**
 * ForgeWP SEO — Internal system file. Do not delete.
 *
 * Use this component in \`src/app/layout.tsx\` to set global SEO defaults,
 * and in individual page files to override them per-page.
 *
 * The ForgeWP compiler reads the props you pass here and injects them
 * directly into the WordPress theme's <head> as native meta tags.
 *
 * @see https://forgewp.dev/docs/seo
 */

export interface SEOProps {
  /** Page title — defaults to the WordPress post title via useWpTitle() */
  title?: string;
  /** Meta description for search engines and social cards */
  description?: string;
  /** Comma-separated keywords */
  keywords?: string;
  /** Open Graph title (falls back to title if omitted) */
  ogTitle?: string;
  /** Open Graph description (falls back to description if omitted) */
  ogDescription?: string;
  /** Absolute URL to the Open Graph image */
  ogImage?: string;
  /** Open Graph type — "website" for homepages, "article" for posts */
  ogType?: string;
  /** Twitter card type */
  twitterCard?: string;
  /** Twitter creator handle, e.g. "@username" */
  twitterCreator?: string;
  /** Canonical URL — tells search engines the preferred version of this page */
  canonical?: string;
  /** Set to true to prevent this page from being indexed by search engines */
  noIndex?: boolean;
}

/**
 * \`<SEO>\` — ForgeWP SEO manager.
 *
 * Drop this into your **layout.tsx** to set site-wide defaults.
 * Then drop it into any **page file** to override for that specific template.
 *
 * @example
 * // layout.tsx — global defaults (the compiler reads these for all pages)
 * <SEO
 *   description="Your site tagline or description."
 *   keywords="WordPress, React, Tailwind"
 *   ogImage="https://yoursite.com/og-default.png"
 * />
 *
 * @example
 * // single.tsx — per-page override (article-specific metadata)
 * <SEO
 *   ogType="article"
 *   ogImage="https://yoursite.com/og-post.png"
 *   twitterCreator="@yourhandle"
 * />
 */
export function SEO({
  title,
  description = "A WordPress theme built with ForgeWP — React & Tailwind CSS.",
  keywords = "WordPress, React, Tailwind CSS, ForgeWP",
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterCreator,
  canonical,
  noIndex = false,
}: SEOProps) {
  const wpTitle = useWpTitle();
  const resolvedTitle = title ?? wpTitle;

  return (
    <Helmet>
      {/* ── Primary ── */}
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* ── Open Graph ── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={ogTitle ?? resolvedTitle} />
      <meta property="og:description" content={ogDescription ?? description} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* ── Twitter ── */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle ?? resolvedTitle} />
      <meta name="twitter:description" content={ogDescription ?? description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
    </Helmet>
  );
}
`,

  'src/.forgewp/PresetsStyle.tsx': `import wpConfig from "../../wp.config";

const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  import.meta.env?.DEV === true;

/**
 * PresetsStyle component — Internal system component.
 *
 * Dynamically injects WordPress-preset CSS Custom Properties and enqueues Google Fonts
 * during local Vite development, keeping your styles perfectly in sync with WordPress.
 * In production builds, this returns only the registry-aesthetic design tokens (like --radius)
 * to keep shadcn components and theme variables responsive to your config.
 */
export function PresetsStyle() {
  const themeStyle = wpConfig.style || "forgewp";

  // Production build: only inject custom registry-aesthetic design properties
  if (!IS_DEV) {
    const prodCss = \`
:root {
  --radius: \${themeStyle === "forgewp" ? "0px" : "0.5rem"};
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --border-width: \${themeStyle === "forgewp" ? "2px" : "1px"};
  --border-color: \${themeStyle === "forgewp" ? "#09090b" : "#e4e4e7"};
  --shadow-offset: \${themeStyle === "forgewp" ? "4px" : "0px"};
}
    \`;
    return <style dangerouslySetInnerHTML={{ __html: prodCss }} />;
  }

  // Local development fallbacks for WordPress CSS presets
  const colors = wpConfig.settings?.color?.palette || [];
  const fontSizes = wpConfig.settings?.typography?.fontSizes || [];
  const fontFamilies = wpConfig.settings?.typography?.fontFamilies || [];
  const layout = wpConfig.settings?.layout || {};
  const googleFonts = wpConfig.settings?.typography?.googleFonts || [];

  // Parse and build Google Fonts href for dev injection
  const fontsHtml = googleFonts.length > 0
    ? \`<link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=\&{googleFonts.map(f => encodeURIComponent(f)).join("&family=")}&display=swap" rel="stylesheet">\`
    : "";

  const devCss = \`
:root {
  \${colors.map((c) => "--wp--preset--color--" + c.slug + ": " + c.color + ";").join("\\n  ")}
  \${fontSizes.map((f) => "--wp--preset--font-size--" + f.slug + ": " + f.size + ";").join("\\n  ")}
  \${fontFamilies.map((f) => "--wp--preset--font-family--" + f.slug + ": " + f.fontFamily + ";").join("\\n  ")}
  \${layout.contentSize ? "--wp--style--global--content-size: " + layout.contentSize + ";" : ""}
  \${layout.wideSize ? "--wp--style--global--wide-size: " + layout.wideSize + ";" : ""}

  /* Registry Aesthetic Mode Custom Properties */
  --radius: \${themeStyle === "forgewp" ? "0px" : "0.5rem"};
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --border-width: \${themeStyle === "forgewp" ? "2px" : "1px"};
  --border-color: \${themeStyle === "forgewp" ? "#09090b" : "#e4e4e7"};
  --shadow-offset: \${themeStyle === "forgewp" ? "4px" : "0px"};
}
  \`;

  return (
    <>
      {fontsHtml && <span dangerouslySetInnerHTML={{ __html: fontsHtml }} />}
      <style dangerouslySetInnerHTML={{ __html: devCss }} />
    </>
  );
}
`,
};
