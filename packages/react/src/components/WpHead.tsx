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
  schema?: Record<string, any>;
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
  schema,
  children,
}: WpHeadProps) {
  const IS_DECOUPLED =
    (typeof import.meta !== "undefined" && import.meta.env?.DEV === true) ||
    (typeof window !== "undefined" && !(window as any).forgeWpHydration);

  if (IS_DECOUPLED) {
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
        {schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
          />
        )}
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
      "data-schema": schema ? JSON.stringify(schema) : undefined,
    },
    children
  );
}

