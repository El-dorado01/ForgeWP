import { Helmet } from "react-helmet-async";
import { useWpTitle } from "@/lib/wordpress";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
}

/**
 * SEO Component to manage HTML head tags (Title, Description, Open Graph, etc.)
 * 
 * You can place this in layout.tsx to define default SEO meta tags,
 * and override them in individual page templates by passing custom props.
 */
export function SEO({
  title,
  description = "A premium WordPress theme built with ForgeWP, React, and Tailwind CSS.",
  keywords = "WordPress, React, Tailwind CSS, ForgeWP, Theme Development",
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
}: SEOProps) {
  const wpTitle = useWpTitle();
  const pageTitle = title || wpTitle;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={ogTitle || pageTitle} />
      <meta property="og:description" content={ogDescription || description} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta property="twitter:card" content={twitterCard} />
      <meta property="twitter:title" content={ogTitle || pageTitle} />
      <meta property="twitter:description" content={ogDescription || description} />
      {ogImage && <meta property="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
