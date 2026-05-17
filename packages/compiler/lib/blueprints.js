/**
 * System File Blueprints — ForgeWP Compiler
 *
 * These are fallback templates used by the compiler's self-healing preflight check.
 * If a developer accidentally deletes a system-critical library file,
 * the compiler will automatically recreate it to prevent compilation and runtime errors.
 */

export const SYSTEM_BLUEPRINTS = {
  "wordpress/mock-data.json": `{
  "post": [
    {
      "id": 1,
      "title": "Welcome to ForgeWP: The Headless Revolution",
      "excerpt": "Discover how ForgeWP bridges standard WordPress themes with blistering fast React architectures.",
      "content": "<p>This is the first mock post. In local dev, you can modify <code>wordpress/mock-data.json</code> to test layout content changes.</p>",
      "date": "May 10, 2026",
      "author": "Antigravity",
      "featuredImage": "https://picsum.photos/seed/forgewp/1200/630",
      "customFields": {}
    },
    {
      "id": 2,
      "title": "Unlocking Brutalist Web Design Aesthetics",
      "excerpt": "A deep dive into high-contrast grids, sharp corners, and premium flat shadows in modern interfaces.",
      "content": "<p>This is the second mock post. Style these grids using beautiful Tailwind utilities.</p>",
      "date": "May 12, 2026",
      "author": "DeepMind Partner",
      "featuredImage": "https://picsum.photos/seed/brutalist/1200/630",
      "customFields": {}
    }
  ],
  "project": [
    {
      "id": 1,
      "title": "ForgeWP Scaffolding Platform",
      "excerpt": "Building a custom compiler framework to transpile React elements into standard PHP themes.",
      "content": "<p>Detailed description of the ForgeWP compiler pipeline project.</p>",
      "date": "May 15, 2026",
      "author": "Lead Architect",
      "featuredImage": "https://picsum.photos/seed/platform/1200/630",
      "customFields": {
        "client_name": "El Dorado",
        "project_budget": "$45,000"
      }
    },
    {
      "id": 2,
      "title": "Brutalist Starter Theme",
      "excerpt": "A clean, responsive, and robust high-contrast interface leveraging Tailwind CSS v4.",
      "content": "<p>A brutalist theme showcasing raw black borders and vivid accent colors.</p>",
      "date": "May 16, 2026",
      "author": "Theme Engineer",
      "featuredImage": "https://picsum.photos/seed/starter/1200/630",
      "customFields": {
        "client_name": "ForgeWP Community",
        "project_budget": "Open Source"
      }
    }
  ]
}`,

  "src/lib/wordpress.tsx": `/**
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
    return post ? \`/post/\${post.id}\` : "/post";
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
  location?: string;
  className?: string;
  linkClassName?: string;
}

export function WpMenu({ location = "primary", className = "", linkClassName = "" }: WpMenuProps) {
  if (IS_DEV) {
    const mockItems = [
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
        title: \`Mock \${postType} \${i + 1}\`,
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
`,

  "src/lib/SEO.tsx": `import * as ReactHelmetAsync from "react-helmet-async";
import { useWpTitle } from "./wordpress";

// Support both ESM and CommonJS exports of react-helmet-async across Vite and TSX compiler
const Helmet = (ReactHelmetAsync.Helmet || (ReactHelmetAsync as any)["default"]?.Helmet || ReactHelmetAsync) as any;

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

  "src/lib/PresetsStyle.tsx": `import wpConfig from "../../wp.config";

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
`
};
