import React from "react";

export interface WpHeadProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterCreator?: string;
  canonical?: string;
  keywords?: string;
  children?: React.ReactNode;
}

export function WpHead({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  twitterCard,
  twitterCreator,
  canonical,
  keywords,
  children,
}: WpHeadProps) {
  const IS_DEV =
    typeof import.meta !== "undefined" &&
    // @ts-ignore
    import.meta.env?.DEV === true;

  if (IS_DEV) {
    return (
      <>
        {title && <title>{title}</title>}
        {description && <meta name="description" content={description} />}
        {keywords && <meta name="keywords" content={keywords} />}
        {ogImage && <meta property="og:image" content={ogImage} />}
        {(ogTitle || title) && <meta property="og:title" content={ogTitle || title} />}
        {(ogDescription || description) && <meta property="og:description" content={ogDescription || description} />}
        {ogType && <meta property="og:type" content={ogType} />}
        {twitterCard && <meta name="twitter:card" content={twitterCard} />}
        {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
        {canonical && <link rel="canonical" href={canonical} />}
        {children}
      </>
    );
  }

  // Production SSR: render custom elements with serialized metadata for the compiler
  return React.createElement(
    "forgewp-head",
    {
      "data-title": title || undefined,
      "data-description": description || undefined,
      "data-keywords": keywords || undefined,
      "data-og-title": ogTitle || undefined,
      "data-og-description": ogDescription || undefined,
      "data-og-image": ogImage || undefined,
      "data-og-type": ogType || undefined,
      "data-twitter-card": twitterCard || undefined,
      "data-twitter-creator": twitterCreator || undefined,
      "data-canonical": canonical || undefined,
    },
    children
  );
}

