/**
 * System File Blueprints — ForgeWP Compiler
 *
 * These are fallback templates used by the compiler's self-healing preflight check.
 * If a developer accidentally deletes a system-critical library file,
 * the compiler will automatically recreate it to prevent compilation and runtime errors.
 */

export const SYSTEM_BLUEPRINTS = {
  "src/lib/wordpress.tsx": `/**
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
 * \`<WpLoop>\` — Renders a WordPress post loop.
 *
 * In dev: renders your children 3 times with mock data so you can design your layout.
 * On export: wraps your JSX in a real \`while (have_posts()) : the_post();\` PHP loop.
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

// ── Custom Field Mapping (ACF / Meta Fields) ──────────────────────────────────

/**
 * Returns a WordPress post custom field value.
 * Maps to get_post_meta(get_the_ID(), $fieldName, true) in WordPress production.
 * In development, returns the default value or mock placeholder.
 */
export function useWpCustomField(fieldName: string, defaultValue: string = ""): string {
  if (IS_DEV) {
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

/**
 * \`<WpMenu>\` — Dynamic WordPress Nav Menu.
 * 
 * In development: renders mock links (Home, Blog, Archive) for visual design.
 * On export: compiles to a native PHP dynamic nav loop pulling registered WP menus.
 */
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

/**
 * \`<WpQueryLoop>\` — Custom WordPress query loop (WP_Query).
 * 
 * Allows querying specific types, sizes, or category-filtered post collections.
 * 
 * In development: renders children 3 times.
 * On export: wraps children in a dynamic WP_Query PHP template block.
 */
export function WpQueryLoop({
  postType = "post",
  postsPerPage = 3,
  categoryName = "",
  children
}: WpQueryLoopProps) {
  if (IS_DEV) {
    return (
      <>
        {children}
        {children}
        {children}
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
  \${colors.map((c) => \\\`--wp--preset--color--\\\${c.slug}: \\\${c.color};\\\`).join("\\\\n  ")}
  \${fontSizes.map((f) => \\\`--wp--preset--font-size--\\\${f.slug}: \\\${f.size};\\\`).join("\\\\n  ")}
  \${fontFamilies.map((f) => \\\`--wp--preset--font-family--\\\${f.slug}: \\\${f.fontFamily};\\\`).join("\\\\n  ")}
  \${layout.contentSize ? \\\`--wp--style--global--content-size: \\\${layout.contentSize};\\\` : ""}
  \${layout.wideSize ? \\\`--wp--style--global--wide-size: \\\${layout.wideSize};\\\` : ""}

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
