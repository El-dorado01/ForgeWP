import * as React from "react";
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
 * Use this component in `src/app/layout.tsx` to set global SEO defaults,
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
 * `<SEO>` — ForgeWP SEO manager.
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
