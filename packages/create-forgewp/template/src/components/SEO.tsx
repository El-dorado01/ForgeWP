import { Helmet } from "react-helmet-async";
import { useWpTitle } from "../lib/wordpress";

export interface SEOProps {
  /** Page title — defaults to the WordPress post title via useWpTitle() */
  title?: string;
  /** Meta description for search engines and social cards */
  description?: string;
  /** Comma-separated keywords */
  keywords?: string;
  /** Open Graph title (falls back to title) */
  ogTitle?: string;
  /** Open Graph description (falls back to description) */
  ogDescription?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Open Graph type, e.g. "website" or "article" */
  ogType?: string;
  /** Twitter card type */
  twitterCard?: string;
  /** Twitter creator handle, e.g. "@username" */
  twitterCreator?: string;
  /** Canonical URL (optional) */
  canonical?: string;
  /** Set to true to prevent search engine indexing */
  noIndex?: boolean;
}

/**
 * `<SEO>` — A drop-in SEO manager for your ForgeWP theme.
 *
 * **Usage in layout.tsx** → sets global defaults for every page.
 * **Usage in a page file** → overrides the defaults for that specific page.
 *
 * @example
 * // layout.tsx — global defaults
 * <SEO description="My awesome WordPress site built with ForgeWP." />
 *
 * @example
 * // single.tsx — per-page override
 * <SEO
 *   ogType="article"
 *   ogImage="https://example.com/og-image.jpg"
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
